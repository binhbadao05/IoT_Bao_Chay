"""Command endpoints."""
import json

from flask import Blueprint, request
from flask_jwt_extended import get_jwt, jwt_required
from pydantic import BaseModel, Field

from ..extensions import db
from ..models import Device, DeviceCommand
from ..services import create_command
from .helpers import err, ok, require_role

bp = Blueprint("commands", __name__)


def command_dict(cmd: DeviceCommand):
    return {
        "id": cmd.id,
        "device_id": cmd.device_id,
        "command_type": cmd.command_type,
        "payload": json.loads(cmd.payload_json),
        "state": cmd.state,
        "requested_by": cmd.requested_by,
        "error_code": cmd.error_code,
        "created_at": cmd.created_at.isoformat(),
        "sent_at": cmd.sent_at.isoformat() if cmd.sent_at else None,
        "acknowledged_at": cmd.acknowledged_at.isoformat() if cmd.acknowledged_at else None,
        "ack_payload": json.loads(cmd.ack_payload_json) if cmd.ack_payload_json else None,
    }


class LedCommand(BaseModel):
    action: str = Field(pattern=r"^(ON|OFF)$")


@bp.post("/devices/<device_id>/commands")
@require_role("OPERATOR")
def send_command(device_id: str):
    device = db.session.get(Device, device_id)
    if device is None:
        return err("device not found", 404, "not_found")
    if not device.accepts_commands:
        return err("device is not active", 409, "state_error")
    try:
        payload = LedCommand.model_validate(request.get_json(silent=True) or {}).model_dump()
    except Exception as exc:
        return err(f"invalid payload: {exc}", 400, "validation_error")
    cmd = create_command(device_id, "LED_CONTROL", payload, get_jwt()["user_id"])
    db.session.commit()
    return ok(command_dict(cmd), 201)


@bp.get("/devices/<device_id>/commands")
@jwt_required()
def list_device_commands(device_id: str):
    if db.session.get(Device, device_id) is None:
        return err("device not found", 404, "not_found")
    rows = (
        DeviceCommand.query.filter_by(device_id=device_id)
        .order_by(DeviceCommand.created_at.desc())
        .limit(200)
        .all()
    )
    return ok({"items": [command_dict(c) for c in rows]})


@bp.get("/commands/<command_id>")
@jwt_required()
def get_command(command_id: str):
    cmd = db.session.get(DeviceCommand, command_id)
    if cmd is None:
        return err("command not found", 404, "not_found")
    return ok(command_dict(cmd))
