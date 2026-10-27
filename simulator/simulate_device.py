"""Standalone MQTT device simulator matching firmware protocol."""
import argparse
import json
import logging
import math
import os
import random
import time
from pathlib import Path

import paho.mqtt.client as mqtt
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def env(name: str, default: str) -> str:
    return os.getenv(name, default)


class DeviceSimulator:
    def __init__(self, args):
        self.device_id = args.device_id
        self.host = args.host
        self.port = args.port
        self.username = args.username
        self.password = args.password
        self.telemetry_interval = args.telemetry_interval
        self.heartbeat_interval = args.heartbeat_interval
        self.force_alert = args.force_alert
        self.message_seq = 0
        self.temperature = 28.0
        self.humidity = 65.0
        self.led_state = False
        self.stay_offline_seconds = args.offline_seconds
        self.offline_start = None
        self.client = None
        self.running = True

    def new_message_id(self, prefix: str) -> str:
        self.message_seq += 1
        return f"{self.device_id}-{prefix}-{int(time.time())}-{self.message_seq:04d}"

    def publish(self, topic, payload):
        qos = 1
        self.client.publish(topic, json.dumps(payload, sort_keys=True), qos=qos)
        logging.info("published %s %s", topic, json.dumps(payload, sort_keys=True))

    def publish_telemetry(self):
        if self.force_alert:
            self.temperature = 35.0
            self.humidity = 88.0
        else:
            self.temperature += random.uniform(-0.5, 0.5)
            self.humidity += random.uniform(-1.5, 1.5)
        self.temperature = round(max(-40.0, min(85.0, self.temperature)), 2)
        self.humidity = round(max(0.0, min(100.0, self.humidity)), 2)
        payload = {
            "schema_version": 1,
            "message_id": self.new_message_id("telemetry"),
            "device_id": self.device_id,
            "temperature_c": self.temperature,
            "humidity_percent": self.humidity,
        }
        self.publish(f"smartroom/v1/devices/{self.device_id}/telemetry", payload)

    def publish_heartbeat(self):
        payload = {
            "schema_version": 1,
            "message_id": self.new_message_id("heartbeat"),
            "device_id": self.device_id,
            "firmware_version": "0.1.0-sim",
            "telemetry_interval_seconds": self.telemetry_interval,
            "heartbeat_interval_seconds": self.heartbeat_interval,
        }
        self.publish(f"smartroom/v1/devices/{self.device_id}/heartbeat", payload)

    def publish_online(self):
        payload = {
            "schema_version": 1,
            "message_id": self.new_message_id("status"),
            "device_id": self.device_id,
            "state": "online",
        }
        self.publish(f"smartroom/v1/devices/{self.device_id}/status", payload)

    def ack_command(self, command_id: str, payload):
        ack = {
            "schema_version": 1,
            "command_id": command_id,
            "device_id": self.device_id,
            "result": "ACKNOWLEDGED",
            "state": {"led_on": self.led_state, "command": payload},
        }
        self.publish(f"smartroom/v1/devices/{self.device_id}/commands/ack", ack)

    def on_message(self, client, userdata, msg):
        topic = msg.topic
        suffix = f"smartroom/v1/devices/{self.device_id}/"
        if not topic.startswith(suffix):
            return
        part = topic[len(suffix):]
        try:
            payload = json.loads(msg.payload.decode("utf-8"))
        except Exception as exc:  # noqa: BLE001
            logging.warning("bad command payload: %s", exc)
            return
        if part == "commands" and payload.get("command_type") == "LED_CONTROL":
            action = payload.get("payload", {}).get("action")
            self.led_state = action == "ON"
            logging.info("led action=%s state=%s", action, self.led_state)
            self.ack_command(payload["command_id"], payload)
        elif part == "config":
            self.apply_config(payload)
            self.ack_config(payload)

    def apply_config(self, payload):
        config = payload.get("payload", {})
        logging.info("received config %s", config)

    def ack_config(self, payload):
        ack = {
            "schema_version": 1,
            "command_id": payload.get("command_id", "unknown"),
            "device_id": self.device_id,
            "result": "ACKNOWLEDGED",
            "config": {"accepted": True},
        }
        self.publish(f"smartroom/v1/devices/{self.device_id}/config/ack", ack)

    def run(self):
        logging.info("simulator starting device=%s", self.device_id)
        client = mqtt.Client(
            callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
            client_id=f"sim-{self.device_id}-{os.getpid()}",
            protocol=mqtt.MQTTv311,
        )
        client.username_pw_set(self.username, self.password)
        client.will_set(
            f"smartroom/v1/devices/{self.device_id}/status",
            json.dumps(
                {
                    "schema_version": 1,
                    "message_id": self.new_message_id("lwt"),
                    "device_id": self.device_id,
                    "state": "offline",
                }
            ),
            qos=1,
            retain=False,
        )
        client.on_message = self.on_message
        self.client = client

        while True:
            try:
                client.connect(self.host, self.port, keepalive=30)
                client.loop_start()
                break
            except Exception as exc:  # noqa: BLE001
                logging.warning("broker connect failed: %s", exc)
                time.sleep(5)

        topics = [
            f"smartroom/v1/devices/{self.device_id}/commands",
            f"smartroom/v1/devices/{self.device_id}/config",
        ]
        for topic in topics:
            client.subscribe(topic, qos=1)

        self.publish_online()
        last_telemetry = 0.0
        last_heartbeat = 0.0
        try:
            while True:
                now = time.time()
                if self.offline_start is not None:
                    if now - self.offline_start >= self.stay_offline_seconds:
                        self.offline_start = None
                        client.reconnect()
                        self.publish_online()
                    time.sleep(0.5)
                    continue
                if now - last_heartbeat >= self.heartbeat_interval:
                    self.publish_heartbeat()
                    last_heartbeat = now
                if now - last_telemetry >= self.telemetry_interval:
                    self.publish_telemetry()
                    last_telemetry = now
                if self.stay_offline_seconds > 0:
                    self.offline_start = now
                    logging.info("simulated offline for %ss", self.stay_offline_seconds)
                    client.disconnect()
                time.sleep(0.2)
        except KeyboardInterrupt:
            logging.info("simulator stopping")
            self.publish(
                f"smartroom/v1/devices/{self.device_id}/status",
                {
                    "schema_version": 1,
                    "message_id": self.new_message_id("status"),
                    "device_id": self.device_id,
                    "state": "offline",
                },
            )
        finally:
            client.loop_stop()
            client.disconnect()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--device-id", default=env("SIM_DEVICE_ID", "sim-esp32-001"))
    parser.add_argument("--host", default=env("MQTT_BROKER_HOST", "localhost"))
    parser.add_argument("--port", type=int, default=int(env("MQTT_BROKER_PORT", "1883")))
    parser.add_argument("--username", default=env("MQTT_SIM_USERNAME", "sim_device"))
    parser.add_argument("--password", default=env("MQTT_SIM_PASSWORD", "sim_device_password"))
    parser.add_argument("--telemetry-interval", type=int, default=int(env("SIM_TELEMETRY_INTERVAL_SECONDS", "5")))
    parser.add_argument("--heartbeat-interval", type=int, default=int(env("SIM_HEARTBEAT_INTERVAL_SECONDS", "5")))
    parser.add_argument("--offline-seconds", type=int, default=int(env("SIM_OFFLINE_AFTER_SECONDS", "0")))
    parser.add_argument("--force-alert", action="store_true", default=env("SIM_FORCE_ALERT", "0") == "1")
    args = parser.parse_args()
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO"),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    DeviceSimulator(args).run()


if __name__ == "__main__":
    main()
