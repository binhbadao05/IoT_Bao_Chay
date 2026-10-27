"""HTTP API v1 blueprints and routes."""
from flask import Blueprint

from .alerts import bp as alerts_bp
from .auth import bp as auth_bp
from .commands import bp as commands_bp
from .devices import bp as devices_bp
from .health import bp as health_bp
from .telemetry import bp as telemetry_bp

api_bp = Blueprint("api", __name__)
api_bp.register_blueprint(health_bp)
api_bp.register_blueprint(auth_bp, url_prefix="/auth")
api_bp.register_blueprint(devices_bp, url_prefix="/devices")
api_bp.register_blueprint(telemetry_bp, url_prefix="/devices")
api_bp.register_blueprint(commands_bp)
api_bp.register_blueprint(alerts_bp, url_prefix="/alerts")
