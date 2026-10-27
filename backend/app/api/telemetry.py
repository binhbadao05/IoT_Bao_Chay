"""Telemetry read endpoints."""
from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from sqlalchemy import desc

from ..extensions import db
from ..models import Device, Telemetry
from .helpers import err, ok

bp = Blueprint("telemetry", __name__)


def telemetry_dict(row: Telemetry):
    return {
        "id": row.id,
        "device_id": row.device_id,
        "message_id": row.message_id,
        "temperature_c": row.temperature_c,
        "humidity_percent": row.humidity_percent,
        "received_at": row.received_at.isoformat(),
        "source": row.source,
    }


@bp.get("/<device_id>/telemetry/latest")
@jwt_required()
def latest(device_id: str):
    if db.session.get(Device, device_id) is None:
        return err("device not found", 404, "not_found")
    row = (
        Telemetry.query.filter_by(device_id=device_id)
        .order_by(desc(Telemetry.received_at))
        .first()
    )
    return ok({"item": telemetry_dict(row) if row else None})


@bp.get("/<device_id>/telemetry")
@jwt_required()
def telemetry(device_id: str):
    if db.session.get(Device, device_id) is None:
        return err("device not found", 404, "not_found")
    limit = min(max(request.args.get("limit", 50, type=int), 1), 500)
    offset = max(request.args.get("offset", 0, type=int), 0)
    q = Telemetry.query.filter_by(device_id=device_id).order_by(desc(Telemetry.received_at))
    total = q.count()
    rows = q.limit(limit).offset(offset).all()
    return ok(
        {
            "items": [telemetry_dict(r) for r in rows],
            "pagination": {"limit": limit, "offset": offset, "total": total},
        }
    )


@bp.get("/<device_id>/status")
@jwt_required()
def status(device_id: str):
    device = db.session.get(Device, device_id)
    if device is None:
        return err("device not found", 404, "not_found")
    return ok(
        {
            "device_id": device.id,
            "lifecycle_state": device.lifecycle_state,
            "connection_state": device.connection_state,
            "last_seen_at": device.last_seen_at.isoformat() if device.last_seen_at else None,
        }
    )
