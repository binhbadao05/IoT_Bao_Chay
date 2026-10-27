"""MQTT Worker: consume device messages and publish pending commands."""
import json
import logging
import os
import time
from pathlib import Path

import paho.mqtt.client as mqtt
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from app import create_app
from app.extensions import db
from app.mqtt import (
    COMMAND_ACK_TOPIC_PATTERN,
    COMMAND_TOPIC_TEMPLATE,
    HEARTBEAT_TOPIC_PATTERN,
    STATUS_TOPIC_PATTERN,
    TELEMETRY_TOPIC_PATTERN,
    parse_device_topic,
)
from app.models import Device, DeviceCommand
from app.schemas import (
    CommandAckPayload,
    HeartbeatPayload,
    StatusPayload,
    TelemetryPayload,
)
from app.services import (
    complete_command,
    create_alert_for_offline,
    evaluate_alerts,
    pending_commands,
    store_telemetry,
    time_out_commands,
    utcnow,
)

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
log = logging.getLogger("mqtt-worker")

app = create_app()
Q: list[tuple[str, dict]] = []


def enqueue(item: tuple[str, dict]) -> None:
    global Q
    if len(Q) > 1000:
        log.error("queue full; dropping %s", item[0])
        return
    Q.append(item)


def process_item(item: tuple[str, dict]) -> None:
    action, context = item
    with app.app_context():
        try:
            if action == "telemetry":
                _handle_telemetry(context["topic"], context["payload"])
            elif action == "heartbeat":
                _handle_heartbeat(context["topic"], context["payload"])
            elif action == "status":
                _handle_status(context["topic"], context["payload"])
            elif action == "command_ack":
                _handle_command_ack(context["topic"], context["payload"])
            db.session.commit()
        except Exception as exc:  # noqa: BLE001 - log and continue processing MQTT
            db.session.rollback()
            log.exception("failed processing %s: %s", action, exc)


def _handle_telemetry(topic: str, payload: bytes) -> None:
    device_id = parse_device_topic(topic, "telemetry")
    if not device_id:
        return
    data = TelemetryPayload.model_validate_json(payload)
    if data.device_id != device_id:
        log.warning("telemetry device_id mismatch topic=%s payload=%s", topic, data.device_id)
        return
    device = db.session.get(Device, device_id)
    if device is None or not device.accepts_telemetry:
        log.warning(
            "reject telemetry for device=%s state=%s",
            device_id,
            getattr(device, "lifecycle_state", None),
        )
        return
    tele = store_telemetry(device_id, data.model_dump())
    if tele:
        evaluate_alerts(device_id, tele)
        log.info("stored telemetry device=%s msg=%s", device_id, data.message_id)


def _handle_heartbeat(topic: str, payload: bytes) -> None:
    device_id = parse_device_topic(topic, "heartbeat")
    if not device_id:
        return
    data = HeartbeatPayload.model_validate_json(payload)
    device = db.session.get(Device, device_id)
    if device is None:
        return
    device.firmware_version = data.firmware_version
    device.telemetry_interval_seconds = data.telemetry_interval_seconds
    device.heartbeat_interval_seconds = data.heartbeat_interval_seconds
    device.connection_state = "ONLINE"
    device.last_seen_at = utcnow()
    log.info("heartbeat device=%s", device_id)


def _handle_status(topic: str, payload: bytes) -> None:
    device_id = parse_device_topic(topic, "status")
    if not device_id:
        return
    data = StatusPayload.model_validate_json(payload)
    device = db.session.get(Device, device_id)
    if device is None:
        return
    device.connection_state = data.state.upper()
    if data.state == "online":
        device.last_seen_at = utcnow()
    log.info("status device=%s state=%s", device_id, data.state)


def _handle_command_ack(topic: str, payload: bytes) -> None:
    device_id = parse_device_topic(topic, "commands/ack")
    if not device_id:
        return
    data = CommandAckPayload.model_validate_json(payload)
    complete_command(data.command_id, data.result, data.state or {}, data.error_code)
    log.info("command ack command=%s result=%s", data.command_id, data.result)


def publish_pending_commands(client: mqtt.Client) -> None:
    with app.app_context():
        rows = pending_commands()
        payloads = [
            (row.id, row.device_id, row.command_type, json.loads(row.payload_json))
            for row in rows
        ]
    for command_id, device_id, command_type, payload in payloads:
        mqtt_payload = {
            "schema_version": 1,
            "command_id": command_id,
            "command_type": command_type,
            "payload": payload,
        }
        client.publish(
            COMMAND_TOPIC_TEMPLATE.format(device_id=device_id),
            json.dumps(mqtt_payload, sort_keys=True),
            qos=1,
        )
        with app.app_context():
            row = db.session.get(DeviceCommand, command_id)
            if row:
                row.sent_at = utcnow()
            db.session.commit()
        log.info("published command=%s device=%s type=%s", command_id, device_id, command_type)


def mark_offline_devices() -> None:
    from datetime import timedelta

    with app.app_context():
        cutoff = utcnow() - timedelta(seconds=app.config["DEVICE_OFFLINE_AFTER_SECONDS"])
        rows = Device.query.filter(
            Device.lifecycle_state == "ACTIVE",
            Device.last_seen_at.isnot(None),
            Device.last_seen_at < cutoff,
        ).all()
        for device in rows:
            device.connection_state = "OFFLINE"
            create_alert_for_offline(device.id)
        db.session.commit()


def time_out_commands_and_commit() -> None:
    with app.app_context():
        rows = time_out_commands()
        if rows:
            db.session.commit()
            log.info("timed out %s commands", len(rows))


def run() -> None:
    host = app.config["MQTT_BROKER_HOST"]
    port = app.config["MQTT_BROKER_PORT"]
    client = mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        client_id=app.config["MQTT_WORKER_CLIENT_ID"],
        protocol=mqtt.MQTTv311,
    )
    client.username_pw_set(
        app.config["MQTT_BACKEND_USERNAME"], app.config["MQTT_BACKEND_PASSWORD"]
    )

    def on_connect(client, userdata, flags, reason_code, properties):
        log.info("connected reason=%s", reason_code)
        for topic in [
            TELEMETRY_TOPIC_PATTERN,
            HEARTBEAT_TOPIC_PATTERN,
            STATUS_TOPIC_PATTERN,
            COMMAND_ACK_TOPIC_PATTERN,
        ]:
            client.subscribe(topic, qos=1)

    def on_message(client, userdata, msg):
        if msg.topic.endswith("/telemetry"):
            action = "telemetry"
        elif msg.topic.endswith("/heartbeat"):
            action = "heartbeat"
        elif msg.topic.endswith("/status"):
            action = "status"
        elif msg.topic.endswith("/commands/ack"):
            action = "command_ack"
        else:
            return
        enqueue((action, {"topic": msg.topic, "payload": msg.payload}))

    def on_disconnect(client, userdata, disconnect_flags, reason_code, properties):
        log.warning("disconnected reason=%s", reason_code)

    client.on_connect = on_connect
    client.on_message = on_message
    client.on_disconnect = on_disconnect

    while True:
        try:
            client.connect(host, port, keepalive=30)
            client.loop_start()
            break
        except Exception as exc:  # noqa: BLE001
            log.warning("broker connect failed: %s", exc)
            time.sleep(5)

    try:
        while True:
            global Q
            while Q:
                process_item(Q.pop(0))
            publish_pending_commands(client)
            time_out_commands_and_commit()
            mark_offline_devices()
            time.sleep(1)
    except KeyboardInterrupt:
        log.info("shutdown requested")
    finally:
        client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    run()
