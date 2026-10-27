"""Health endpoints."""
from flask import Blueprint, current_app

from ..models import Device, User

bp = Blueprint("health", __name__)


@bp.get("/health")
def health():
    return {
        "status": "ok",
        "service": "smartroom-monitor-api",
        "database": "connected",
    }


@bp.get("/ready")
def ready():
    ok = True
    reason = None
    try:
        User.query.limit(1).count()
        Device.query.limit(1).count()
    except Exception as exc:  # noqa: BLE001 - readiness must translate db errors
        ok = False
        reason = str(exc)
    status = {"ready": ok, "database": "up" if ok else "down"}
    if reason:
        status["reason"] = reason
    return status, (200 if ok else 503)
