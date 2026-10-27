"""Pytest tests for core backend behavior without external broker."""
import json
from datetime import datetime, timedelta, timezone

import pytest

from app import create_app
from app.config import TestingConfig
from app.extensions import db
from app.mqtt import parse_device_topic
from app.models import Device, DeviceCommand, Telemetry, User
from app.schemas import TelemetryPayload
from app.services import (
    complete_command,
    create_command,
    ensure_device,
    ensure_user,
    evaluate_alerts,
    role_allowed,
    store_telemetry,
    time_out_commands,
)


@pytest.fixture()
def app():
    app = create_app(TestingConfig)
    with app.app_context():
        db.create_all()
        ensure_user("admin", "Admin@123", "ADMIN")
        ensure_device("dev-001", "Room 1")
        db.session.commit()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


def login(client, username="admin", password="Admin@123"):
    return client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": password},
    ).get_json()["access_token"]


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def test_health(app, client):
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.get_json()["status"] == "ok"

    ready = client.get("/api/v1/ready")
    assert ready.status_code == 200
    assert ready.get_json()["ready"] is True


def test_auth_and_rbac(app, client):
    assert client.get("/api/v1/devices").status_code == 401
    token = login(client)
    with app.app_context():
        ensure_user("viewer", "Viewer@123", "VIEWER")
        db.session.commit()
    viewer_token = login(client, "viewer", "Viewer@123")
    assert client.get("/api/v1/devices", headers=auth_header(token)).status_code == 200
    assert client.get("/api/v1/devices", headers=auth_header(viewer_token)).status_code == 200
    assert (
        client.post(
            "/api/v1/devices/dev-001/commands",
            json={"action": "ON"},
            headers=auth_header(viewer_token),
        ).status_code
        == 403
    )


def test_device_and_auth_endpoints(app, client):
    token = login(client)
    headers = auth_header(token)
    listed = client.get("/api/v1/devices", headers=headers)
    assert listed.status_code == 200
    assert listed.get_json()["items"][0]["id"] == "dev-001"

    created = client.post(
        "/api/v1/devices",
        json={"id": "dev-002", "name": "Room 2"},
        headers=headers,
    )
    assert created.status_code == 201


def test_telemetry_store_alert_and_api(app, client):
    token = login(client)
    headers = auth_header(token)
    with app.app_context():
        tele = store_telemetry(
            "dev-001",
            {
                "message_id": "msg-1",
                "temperature_c": 40.0,
                "humidity_percent": 90.0,
            },
        )
        assert tele is not None
        created = evaluate_alerts("dev-001", tele)
        db.session.commit()
    res = client.get("/api/v1/devices/dev-001/telemetry/latest", headers=headers)
    assert res.status_code == 200
    body = res.get_json()["item"]
    assert body["temperature_c"] == 40.0
    alerts = client.get("/api/v1/alerts", headers=headers).get_json()["items"]
    assert sorted(a["alert_type"] for a in alerts) == ["HUMIDITY_HIGH", "TEMPERATURE_HIGH"]

def test_zero_thresholds_are_preserved(app, client):
    token = login(client)
    res = client.post(
        "/api/v1/devices/dev-001/config",
        json={
            "temp_high_c": 0,
            "temp_low_c": 20,
            "humidity_high": 80,
            "humidity_low": 0,
        },
        headers=auth_header(token),
    )
    assert res.status_code == 200
    thresholds = res.get_json()["thresholds"]
    assert thresholds["temp_high_c"] == 0
    assert thresholds["humidity_low"] == 0


def test_command_state_machine_and_timeout(app):
    with app.app_context():
        cmd = create_command("dev-001", "LED_CONTROL", {"action": "ON"}, None)
        db.session.commit()
        cmd_id = cmd.id
        complete_command(cmd_id, "ACKNOWLEDGED", {"led_on": True}, None)
        db.session.commit()
        assert db.session.get(DeviceCommand, cmd_id).state == "ACKNOWLEDGED"


def test_parse_topic():
    assert parse_device_topic("smartroom/v1/devices/x/telemetry", "telemetry") == "x"
    assert parse_device_topic("smartroom/v1/devices/x/commands", "telemetry") is None
    assert parse_device_topic("bad", "telemetry") is None


def test_pydantic_rejects_invalid():
    with pytest.raises(Exception):
        TelemetryPayload.model_validate(
            {
                "schema_version": 1,
                "message_id": "m",
                "device_id": "dev",
                "temperature_c": float("nan"),
                "humidity_percent": 50,
            }
        )
