"""MQTT topic contract."""
from ..config import Config


def device_topic(device_id: str, kind: str) -> str:
    return f"smartroom/v1/devices/{device_id}/{kind}"


TELEMETRY_TOPIC_PATTERN = "smartroom/v1/devices/+/telemetry"
HEARTBEAT_TOPIC_PATTERN = "smartroom/v1/devices/+/heartbeat"
STATUS_TOPIC_PATTERN = "smartroom/v1/devices/+/status"
COMMAND_ACK_TOPIC_PATTERN = "smartroom/v1/devices/+/commands/ack"
CONFIG_ACK_TOPIC_PATTERN = "smartroom/v1/devices/+/config/ack"
COMMAND_TOPIC_TEMPLATE = "smartroom/v1/devices/{device_id}/commands"
CONFIG_TOPIC_TEMPLATE = "smartroom/v1/devices/{device_id}/config"


def parse_device_topic(topic: str, suffix: str) -> str | None:
    prefix = "smartroom/v1/devices/"
    postfix = f"/{suffix}"
    if not topic.startswith(prefix) or not topic.endswith(postfix):
        return None
    device_id = topic[len(prefix) : -len(postfix)]
    if not device_id or "/" in device_id:
        return None
    return device_id


COMMAND_PAYLOAD_VERSION = 1
