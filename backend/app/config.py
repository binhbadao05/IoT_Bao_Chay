"""Project configuration loaded from environment variables."""
import os
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]


def _int(name: str, default: int) -> int:
    return int(os.getenv(name, str(default)))


def _float(name: str, default: float) -> float:
    return float(os.getenv(name, str(default)))


class Config:
    """Base configuration shared by API and worker."""

    PROJECT_ROOT = BASE_DIR
    INSTANCE_DIR = Path(os.getenv("INSTANCE_DIR", BASE_DIR / "instance"))
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL", f"sqlite:///{BASE_DIR / 'instance' / 'smartroom.db'}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "connect_args": {"check_same_thread": False, "timeout": 15},
    }

    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me-32-bytes-minimum")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        minutes=_int("JWT_ACCESS_TOKEN_EXPIRES_MINUTES", 60)
    )
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_HEADER_NAME = "Authorization"
    JWT_HEADER_TYPE = "Bearer"
    JSON_SORT_KEYS = False

    MQTT_BROKER_HOST = os.getenv("MQTT_BROKER_HOST", "localhost")
    MQTT_BROKER_PORT = _int("MQTT_BROKER_PORT", 1883)
    MQTT_BACKEND_USERNAME = os.getenv("MQTT_BACKEND_USERNAME", "backend_service")
    MQTT_BACKEND_PASSWORD = os.getenv(
        "MQTT_BACKEND_PASSWORD", "backend_service_password"
    )
    MQTT_WORKER_CLIENT_ID = os.getenv("MQTT_WORKER_CLIENT_ID", "smartroom-worker")
    MQTT_COMMAND_POLL_SECONDS = _int("MQTT_COMMAND_POLL_SECONDS", 1)
    MQTT_COMMAND_TIMEOUT_SECONDS = _int("MQTT_COMMAND_TIMEOUT_SECONDS", 10)
    DEVICE_OFFLINE_AFTER_SECONDS = _int("DEVICE_OFFLINE_AFTER_SECONDS", 15)

    DEFAULT_TEMP_HIGH_C = _float("DEFAULT_TEMP_HIGH_C", 32.0)
    DEFAULT_TEMP_LOW_C = _float("DEFAULT_TEMP_LOW_C", 10.0)
    DEFAULT_HUMIDITY_HIGH = _float("DEFAULT_HUMIDITY_HIGH", 80.0)
    DEFAULT_HUMIDITY_LOW = _float("DEFAULT_HUMIDITY_LOW", 20.0)


class TestingConfig(Config):
    """In-memory SQLite config for tests."""

    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_SECRET_KEY = "test-jwt-secret-long-enough-32-bytes-minimum"
    SECRET_KEY = "test-secret-long-enough-32-bytes-minimum"
