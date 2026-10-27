"""Domain services: auth, devices, telemetry, commands, alerts, audit."""
import json
import math
from datetime import datetime, timedelta, timezone
from typing import Any

from werkzeug.security import generate_password_hash

from ..config import Config
from ..extensions import db
from ..models import (
    AuditLog,
    Alert,
    Device,
    DeviceCommand,
    DeviceConfig,
    DeviceCredential,
    Telemetry,
    User,
)
from ..secrets import derive_device_password

ROLE_ORDER = {"VIEWER": 1, "OPERATOR": 2, "ADMIN": 3}
VALID_LIFECYCLE = {
    "REGISTERED",
    "PROVISIONED",
    "ACTIVE",
    "OFFLINE",
    "FAULT",
    "MAINTENANCE",
    "DECOMMISSIONED",
}


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def role_allowed(role: str, minimum: str) -> bool:
    return ROLE_ORDER.get(role.upper(), 0) >= ROLE_ORDER[minimum]


def ensure_user(username: str, password: str, role: str = "ADMIN") -> User:
    user = User.query.filter_by(username=username).first()
    if user is None:
        user = User(username=username, role=role.upper())
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        return user
    if not user.is_active:
        user.is_active = True
    db.session.commit()
    return user


def ensure_device(
    device_id: str,
    name: str,
    *,
    firmware_version: str = "0.1.0",
    temp_high_c: float | None = None,
    temp_low_c: float | None = None,
    humidity_high: float | None = None,
    humidity_low: float | None = None,
) -> Device:
    device = db.session.get(Device, device_id)
    if device is None:
        device = Device(
            id=device_id,
            name=name,
            firmware_version=firmware_version,
            lifecycle_state="ACTIVE",
            connection_state="UNKNOWN",
        )
        db.session.add(device)
        db.session.flush()
        set_device_config(
            device_id,
            temp_high_c=temp_high_c,
            temp_low_c=temp_low_c,
            humidity_high=humidity_high,
            humidity_low=humidity_low,
        )
        create_device_credential(device_id)
        audit("bootstrap_create_device", "device", device_id, {"state": "ACTIVE"})
    db.session.commit()
    return device


def set_device_config(
    device_id: str,
    *,
    temp_high_c: float | None = None,
    temp_low_c: float | None = None,
    humidity_high: float | None = None,
    humidity_low: float | None = None,
) -> DeviceConfig:
    device = db.session.get(Device, device_id)
    if device is None:
        raise ValueError("device not found")
    values = {
        "temp_high_c": (
            temp_high_c if temp_high_c is not None else Config.DEFAULT_TEMP_HIGH_C
        ),
        "temp_low_c": (
            temp_low_c if temp_low_c is not None else Config.DEFAULT_TEMP_LOW_C
        ),
        "humidity_high": (
            humidity_high
            if humidity_high is not None
            else Config.DEFAULT_HUMIDITY_HIGH
        ),
        "humidity_low": (
            humidity_low
            if humidity_low is not None
            else Config.DEFAULT_HUMIDITY_LOW
        ),
    }
    if any(not math.isfinite(v) for v in values.values()):
        raise ValueError("thresholds must be finite")
    DeviceConfig.query.filter_by(device_id=device_id, active=True).update(
        {"active": False}
    )
    cfg = DeviceConfig(device_id=device_id, active=True, **values)
    db.session.add(cfg)
    db.session.flush()
    return cfg


def create_device_credential(device_id: str, *, username: str | None = None) -> None:
    device = db.session.get(Device, device_id)
    if device is None:
        raise ValueError("device not found")
    prefix = getattr(Config, "MQTT_DEVICE_USER_PREFIX", "device_")
    username = username or f"{prefix}{device_id}"
    password = derive_device_password(device_id, Config.SECRET_KEY)
    cred = DeviceCredential(device_id=device_id, username=username)
    cred.password_hash = generate_password_hash(password)
    db.session.add(cred)


def latest_config(device_id: str) -> DeviceConfig | None:
    return (
        DeviceConfig.query.filter_by(device_id=device_id, active=True)
        .order_by(DeviceConfig.created_at.desc())
        .first()
    )


def audit(
    action: str,
    object_type: str = "system",
    object_id: str | None = None,
    detail: dict[str, Any] | None = None,
    user_id: str | None = None,
) -> None:
    db.session.add(
        AuditLog(
            user_id=user_id,
            action=action,
            object_type=object_type,
            object_id=object_id,
            detail_json=json.dumps(detail or {}, sort_keys=True, ensure_ascii=False),
        )
    )


def transition_device(device_id: str, target: str, user_id: str | None = None) -> Device:
    if target not in VALID_LIFECYCLE:
        raise ValueError(f"invalid lifecycle state: {target}")
    device = db.session.get(Device, device_id)
    if device is None:
        raise ValueError("device not found")
    transitions = {
        "REGISTERED": {"PROVISIONED", "DECOMMISSIONED"},
        "PROVISIONED": {"ACTIVE", "DECOMMISSIONED"},
        "ACTIVE": {"MAINTENANCE", "OFFLINE", "FAULT", "DECOMMISSIONED"},
        "OFFLINE": {"ACTIVE", "FAULT", "MAINTENANCE", "DECOMMISSIONED"},
        "FAULT": {"MAINTENANCE", "DECOMMISSIONED"},
        "MAINTENANCE": {"ACTIVE", "DECOMMISSIONED"},
        "DECOMMISSIONED": set(),
    }
    if target not in transitions[device.lifecycle_state]:
        raise ValueError(
            f"invalid transition from {device.lifecycle_state} to {target}"
        )
    old = device.lifecycle_state
    device.lifecycle_state = target
    audit(
        "device_lifecycle_transition",
        "device",
        device_id,
        {"from": old, "to": target},
        user_id,
    )
    db.session.flush()
    return device


def store_telemetry(device_id: str, payload: dict[str, Any]) -> Telemetry | None:
    existing = Telemetry.query.filter_by(
        device_id=device_id, message_id=payload["message_id"]
    ).first()
    if existing:
        return None
    tele = Telemetry(
        device_id=device_id,
        message_id=payload["message_id"],
        temperature_c=payload["temperature_c"],
        humidity_percent=payload["humidity_percent"],
        received_at=utcnow(),
        source="mqtt",
    )
    db.session.add(tele)
    device = db.session.get(Device, device_id)
    if device:
        device.connection_state = "ONLINE"
        device.last_seen_at = tele.received_at
    return tele


def upsert_alert(
    device_id: str,
    alert_type: str,
    severity: str,
    message: str,
    value: dict[str, Any] | None = None,
) -> Alert:
    key = f"{device_id}:{alert_type}"
    alert = (
        Alert.query.filter_by(device_id=device_id, alert_type=alert_type, dedupe_key=key)
        .order_by(Alert.last_seen_at.desc())
        .first()
    )
    now = utcnow()
    if alert and alert.state == "ACTIVE":
        alert.last_seen_at = now
        alert.value_json = _json(value)
        return alert
    new = Alert(
        device_id=device_id,
        alert_type=alert_type,
        severity=severity,
        message=message,
        value_json=_json(value),
        dedupe_key=key,
        first_seen_at=now,
        last_seen_at=now,
    )
    db.session.add(new)
    return new


def evaluate_alerts(device_id: str, tele: Telemetry) -> list[str]:
    cfg = latest_config(device_id)
    if cfg is None:
        return []
    created: list[str] = []
    if tele.temperature_c > cfg.temp_high_c:
        upsert_alert(
            device_id,
            "TEMPERATURE_HIGH",
            "CRITICAL",
            f"Temperature {tele.temperature_c:.2f}C exceeds {cfg.temp_high_c:.2f}C",
            {"temperature_c": tele.temperature_c, "threshold": cfg.temp_high_c},
        )
        created.append("TEMPERATURE_HIGH")
    if tele.temperature_c < cfg.temp_low_c:
        upsert_alert(
            device_id,
            "TEMPERATURE_LOW",
            "WARNING",
            f"Temperature {tele.temperature_c:.2f}C below {cfg.temp_low_c:.2f}C",
            {"temperature_c": tele.temperature_c, "threshold": cfg.temp_low_c},
        )
        created.append("TEMPERATURE_LOW")
    if tele.humidity_percent > cfg.humidity_high:
        upsert_alert(
            device_id,
            "HUMIDITY_HIGH",
            "CRITICAL",
            f"Humidity {tele.humidity_percent:.2f}% exceeds {cfg.humidity_high:.2f}%",
            {"humidity_percent": tele.humidity_percent, "threshold": cfg.humidity_high},
        )
        created.append("HUMIDITY_HIGH")
    if tele.humidity_percent < cfg.humidity_low:
        upsert_alert(
            device_id,
            "HUMIDITY_LOW",
            "WARNING",
            f"Humidity {tele.humidity_percent:.2f}% below {cfg.humidity_low:.2f}%",
            {"humidity_percent": tele.humidity_percent, "threshold": cfg.humidity_low},
        )
        created.append("HUMIDITY_LOW")
    return created


def create_alert_for_offline(device_id: str) -> Alert:
    return upsert_alert(
        device_id,
        "DEVICE_OFFLINE",
        "CRITICAL",
        "Device is offline based on heartbeat/telemetry timeout",
    )


def _json(value: dict[str, Any] | None) -> str | None:
    if value is None:
        return None
    return json.dumps(value, sort_keys=True, ensure_ascii=False)


def create_command(
    device_id: str, command_type: str, payload: dict[str, Any], requested_by: str | None
) -> DeviceCommand:
    cmd = DeviceCommand(
        device_id=device_id,
        command_type=command_type,
        payload_json=json.dumps(payload, sort_keys=True),
        requested_by=requested_by,
    )
    db.session.add(cmd)
    audit(
        "create_device_command",
        "device",
        device_id,
        {"command_type": command_type, "payload": payload},
        requested_by,
    )
    return cmd


def time_out_commands() -> list[DeviceCommand]:
    cutoff = utcnow() - timedelta(seconds=Config.MQTT_COMMAND_TIMEOUT_SECONDS)
    rows = DeviceCommand.query.filter(
        DeviceCommand.state == "PENDING", DeviceCommand.created_at < cutoff
    ).all()
    timed_out = []
    for cmd in rows:
        cmd.state = "TIMEOUT"
        cmd.error_code = "COMMAND_TIMEOUT"
        timed_out.append(cmd)
    return timed_out


def pending_commands(device_id: str | None = None) -> list[DeviceCommand]:
    q = DeviceCommand.query.filter_by(state="PENDING").order_by(DeviceCommand.created_at)
    if device_id:
        q = q.filter_by(device_id=device_id)
    return q.all()


def complete_command(
    command_id: str, result: str, state: dict, error_code: str | None
) -> None:
    cmd = db.session.get(DeviceCommand, command_id)
    if cmd is None or cmd.state in {"ACKNOWLEDGED", "FAILED", "TIMEOUT"}:
        return
    cmd.state = result
    cmd.error_code = error_code
    cmd.acknowledged_at = utcnow()
    cmd.ack_payload_json = json.dumps(state, sort_keys=True)
