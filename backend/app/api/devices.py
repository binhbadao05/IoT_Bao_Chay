"""Device management endpoints."""
import json

from flask import Blueprint, request
from flask_jwt_extended import get_jwt, jwt_required
from pydantic import BaseModel, Field, field_validator

from ..extensions import db
from ..models import Device, DeviceCommand, DeviceCredential
from ..services import (
    audit,
    create_command,
    create_device_credential,
    ensure_device,
    latest_config,
    set_device_config,
    transition_device,
)
from .helpers import err, ok, require_role

bp = Blueprint("devices", __name__)


class DeviceCreate(BaseModel):
    id: str = Field(pattern=r"^[A-Za-z0-9_-]{1,64}$")
    name: str = Field(min_length=1, max_length=120)
    firmware_version: str = Field(default="0.1.0", max_length=32)
    temp_high_c: float | None = None
    temp_low_c: float | None = None
    humidity_high: float | None = None
    humidity_low: float | None = None


class DevicePatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    telemetry_interval_seconds: int | None = Field(default=None, gt=0, le=3600)
    heartbeat_interval_seconds: int | None = Field(default=None, gt=0, le=3600)


def device_dict(device: Device):
    cfg = latest_config(device.id)
    return {
        "id": device.id,
        "name": device.name,
        "firmware_version": device.firmware_version,
        "lifecycle_state": device.lifecycle_state,
        "connection_state": device.connection_state,
        "last_seen_at": device.last_seen_at.isoformat() if device.last_seen_at else None,
        "telemetry_interval_seconds": device.telemetry_interval_seconds,
        "heartbeat_interval_seconds": device.heartbeat_interval_seconds,
        "created_at": device.created_at.isoformat(),
        "updated_at": device.updated_at.isoformat(),
        "thresholds": (
            {
                "temp_high_c": cfg.temp_high_c,
                "temp_low_c": cfg.temp_low_c,
                "humidity_high": cfg.humidity_high,
                "humidity_low": cfg.humidity_low,
            }
            if cfg
            else None
        ),
    }


@bp.post("")
@require_role("ADMIN")
def create_device():
    try:
        payload = DeviceCreate.model_validate(request.get_json(silent=True) or {})
    except Exception as exc:
        return err(f"invalid payload: {exc}", 400, "validation_error")
    if db.session.get(Device, payload.id):
        return err("device id already exists", 409, "conflict")
    try:
        device = ensure_device(
            payload.id,
            payload.name,
            firmware_version=payload.firmware_version,
            temp_high_c=payload.temp_high_c,
            temp_low_c=payload.temp_low_c,
            humidity_high=payload.humidity_high,
            humidity_low=payload.humidity_low,
        )
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        return err(str(exc), 400, "validation_error")
    return ok(device_dict(device), 201)


@bp.get("")
@jwt_required()
def list_devices():
    rows = Device.query.order_by(Device.created_at).all()
    return ok({"items": [device_dict(d) for d in rows]})


@bp.get("/<device_id>")
@jwt_required()
def get_device(device_id: str):
    device = db.session.get(Device, device_id)
    if device is None:
        return err("device not found", 404, "not_found")
    return ok(device_dict(device))


@bp.patch("/<device_id>")
@require_role("OPERATOR")
def patch_device(device_id: str):
    device = db.session.get(Device, device_id)
    if device is None:
        return err("device not found", 404, "not_found")
    try:
        payload = DevicePatch.model_validate(request.get_json(silent=True) or {}).model_dump(
            exclude_none=True
        )
    except Exception as exc:
        return err(f"invalid payload: {exc}", 400, "validation_error")
    for key, value in payload.items():
        setattr(device, key, value)
    if payload:
        audit("device_update", "device", device_id, payload, get_jwt()["user_id"])
    db.session.commit()
    return ok(device_dict(device))


@bp.post("/<device_id>/activate")
@require_role("OPERATOR")
def activate_device(device_id: str):
    try:
        device = transition_device(device_id, "ACTIVE", get_jwt()["user_id"])
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        return err(str(exc), 400, "state_error")
    return ok(device_dict(device))


@bp.post("/<device_id>/disable")
@require_role("OPERATOR")
def disable_device(device_id: str):
    try:
        device = transition_device(device_id, "MAINTENANCE", get_jwt()["user_id"])
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        return err(str(exc), 400, "state_error")
    return ok(device_dict(device))


@bp.post("/<device_id>/decommission")
@require_role("ADMIN")
def decommission_device(device_id: str):
    try:
        device = transition_device(device_id, "DECOMMISSIONED", get_jwt()["user_id"])
        creds = DeviceCredential.query.filter_by(device_id=device_id, is_revoked=False).all()
        for cred in creds:
            cred.is_revoked = True
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        return err(str(exc), 400, "state_error")
    return ok(device_dict(device))


@bp.post("/<device_id>/config")
@require_role("OPERATOR")
def update_config(device_id: str):
    data = request.get_json(silent=True) or {}
    if "{temp_high_c}" in str(data):
        return err("missing payload", 400, "validation_error")
    if not data:
        return err("one threshold is required", 400, "validation_error")
    cfg = set_device_config(
        device_id,
        temp_high_c=data.get("temp_high_c"),
        temp_low_c=data.get("temp_low_c"),
        humidity_high=data.get("humidity_high"),
        humidity_low=data.get("humidity_low"),
    )
    db.session.commit()
    return ok(device_dict(db.session.get(Device, device_id)))
