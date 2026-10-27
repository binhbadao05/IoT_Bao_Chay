"""Alerts endpoints."""
from flask import Blueprint, request
from flask_jwt_extended import get_jwt, jwt_required

from ..extensions import db
from ..models import Alert
from ..services import utcnow
from .helpers import err, ok, require_role

bp = Blueprint("alerts", __name__)


def alert_dict(alert: Alert):
    return {
        "id": alert.id,
        "device_id": alert.device_id,
        "alert_type": alert.alert_type,
        "severity": alert.severity,
        "message": alert.message,
        "state": alert.state,
        "first_seen_at": alert.first_seen_at.isoformat(),
        "last_seen_at": alert.last_seen_at.isoformat(),
        "ack_by_user_id": alert.ack_by_user_id,
        "ack_at": alert.ack_at.isoformat() if alert.ack_at else None,
    }


@bp.get("")
@jwt_required()
def list_alerts():
    q = Alert.query
    device_id = request.args.get("device_id")
    state = request.args.get("state")
    if device_id:
        q = q.filter_by(device_id=device_id)
    if state:
        q = q.filter_by(state=state.upper())
    rows = q.order_by(Alert.last_seen_at.desc()).limit(500).all()
    return ok({"items": [alert_dict(a) for a in rows]})


@bp.post("/<alert_id>/acknowledge")
@require_role("OPERATOR")
def acknowledge(alert_id: str):
    alert = db.session.get(Alert, alert_id)
    if alert is None:
        return err("alert not found", 404, "not_found")
    if alert.state == "ACKNOWLEDGED":
        return err("alert already acknowledged", 409, "conflict")
    alert.state = "ACKNOWLEDGED"
    alert.ack_by_user_id = get_jwt()["user_id"]
    alert.ack_at = utcnow()
    db.session.commit()
    return ok(alert_dict(alert))
