"""Bootstrap demo admin user and simulator device."""
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from app import create_app
from app.extensions import db
from app.services import ensure_device, ensure_user

app = create_app()
with app.app_context():
    db.create_all()
    ensure_user("admin", os.getenv("ADMIN_PASSWORD", "Admin@123"))
    ensure_user("operator", os.getenv("OPERATOR_PASSWORD", "Operator@123"), "OPERATOR")
    ensure_user("viewer", os.getenv("VIEWER_PASSWORD", "Viewer@123"), "VIEWER")
    ensure_device(
        os.getenv("SIM_DEVICE_ID", "sim-esp32-001"),
        os.getenv("SIM_DEVICE_NAME", "Simulated ESP32 Room 1"),
    )
    db.session.commit()
print("Bootstrap complete")
