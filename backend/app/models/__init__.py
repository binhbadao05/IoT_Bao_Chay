"""Database models."""
from datetime import datetime, timezone
from uuid import uuid4

from werkzeug.security import check_password_hash, generate_password_hash

from ..extensions import db


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_id() -> str:
    return uuid4().hex


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.String(32), primary_key=True, default=new_id)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="VIEWER")
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    def set_password(self, raw_password: str) -> None:
        self.password_hash = generate_password_hash(raw_password)

    def check_password(self, raw_password: str) -> bool:
        return check_password_hash(self.password_hash, raw_password)

    @property
    def effective_role(self) -> str:
        return self.role.upper()


class Device(db.Model):
    __tablename__ = "devices"

    id = db.Column(db.String(64), primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    firmware_version = db.Column(db.String(32), nullable=False, default="0.1.0")
    lifecycle_state = db.Column(
        db.String(24), nullable=False, default="REGISTERED", index=True
    )
    connection_state = db.Column(
        db.String(20), nullable=False, default="UNKNOWN", index=True
    )
    last_seen_at = db.Column(db.DateTime(timezone=True), nullable=True)
    telemetry_interval_seconds = db.Column(db.Integer, nullable=False, default=5)
    heartbeat_interval_seconds = db.Column(db.Integer, nullable=False, default=5)
    metadata_json = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    configs = db.relationship(
        "DeviceConfig", back_populates="device", cascade="all, delete-orphan"
    )
    credentials = db.relationship(
        "DeviceCredential", back_populates="device", cascade="all, delete-orphan"
    )
    telemetry = db.relationship(
        "Telemetry", back_populates="device", cascade="all, delete-orphan"
    )

    @property
    def accepts_telemetry(self) -> bool:
        return self.lifecycle_state in {"PROVISIONED", "ACTIVE", "MAINTENANCE"}

    @property
    def accepts_commands(self) -> bool:
        return self.lifecycle_state == "ACTIVE"


class DeviceCredential(db.Model):
    __tablename__ = "device_credentials"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    device_id = db.Column(
        db.String(64), db.ForeignKey("devices.id"), nullable=False, index=True
    )
    username = db.Column(db.String(96), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    is_revoked = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    revoked_at = db.Column(db.DateTime(timezone=True), nullable=True)

    device = db.relationship("Device", back_populates="credentials")

    def matches_password(self, raw_password: str) -> bool:
        return check_password_hash(self.password_hash, raw_password)


class Telemetry(db.Model):
    __tablename__ = "telemetry"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    device_id = db.Column(
        db.String(64), db.ForeignKey("devices.id"), nullable=False, index=True
    )
    message_id = db.Column(db.String(64), nullable=False, index=True)
    temperature_c = db.Column(db.Float, nullable=False)
    humidity_percent = db.Column(db.Float, nullable=False)
    received_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    recorded_at = db.Column(db.DateTime(timezone=True), nullable=True)
    source = db.Column(db.String(20), nullable=False, default="mqtt")

    device = db.relationship("Device", back_populates="telemetry")

    __table_args__ = (
        db.UniqueConstraint("device_id", "message_id", name="uq_telemetry_device_msg"),
        db.Index("ix_telemetry_device_received", "device_id", "received_at"),
    )


class DeviceCommand(db.Model):
    __tablename__ = "device_commands"

    id = db.Column(db.String(32), primary_key=True, default=new_id)
    device_id = db.Column(
        db.String(64), db.ForeignKey("devices.id"), nullable=False, index=True
    )
    command_type = db.Column(db.String(32), nullable=False)
    payload_json = db.Column(db.Text, nullable=False)
    state = db.Column(db.String(20), nullable=False, default="PENDING", index=True)
    requested_by = db.Column(db.String(32), db.ForeignKey("users.id"), nullable=True)
    error_code = db.Column(db.String(64), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    sent_at = db.Column(db.DateTime(timezone=True), nullable=True)
    acknowledged_at = db.Column(db.DateTime(timezone=True), nullable=True)
    ack_payload_json = db.Column(db.Text, nullable=True)

    device = db.relationship("Device", back_populates="commands")


Device.commands = db.relationship(
    "DeviceCommand", back_populates="device", cascade="all, delete-orphan"
)


class DeviceConfig(db.Model):
    __tablename__ = "device_configs"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    device_id = db.Column(
        db.String(64), db.ForeignKey("devices.id"), nullable=False, index=True
    )
    temp_high_c = db.Column(db.Float, nullable=False)
    temp_low_c = db.Column(db.Float, nullable=False)
    humidity_high = db.Column(db.Float, nullable=False)
    humidity_low = db.Column(db.Float, nullable=False)
    active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    device = db.relationship("Device", back_populates="configs")


class Alert(db.Model):
    __tablename__ = "alerts"

    id = db.Column(db.String(32), primary_key=True, default=new_id)
    device_id = db.Column(
        db.String(64), db.ForeignKey("devices.id"), nullable=False, index=True
    )
    alert_type = db.Column(db.String(40), nullable=False, index=True)
    severity = db.Column(db.String(20), nullable=False, default="WARNING")
    message = db.Column(db.String(255), nullable=False)
    value_json = db.Column(db.Text, nullable=True)
    state = db.Column(db.String(20), nullable=False, default="ACTIVE", index=True)
    dedupe_key = db.Column(db.String(220), nullable=False, index=True)
    ack_by_user_id = db.Column(db.String(32), db.ForeignKey("users.id"), nullable=True)
    ack_at = db.Column(db.DateTime(timezone=True), nullable=True)
    first_seen_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    last_seen_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)

    device = db.relationship("Device", back_populates="alerts")


Device.alerts = db.relationship(
    "Alert", back_populates="device", cascade="all, delete-orphan"
)


class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.String(32), db.ForeignKey("users.id"), nullable=True)
    action = db.Column(db.String(64), nullable=False, index=True)
    object_type = db.Column(db.String(32), nullable=True)
    object_id = db.Column(db.String(64), nullable=True)
    detail_json = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
