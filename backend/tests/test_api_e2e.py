from app.extensions import db
from app.models import Alert, DeviceCommand
from app.services import (
    complete_command,
    evaluate_alerts,
    ensure_device,
    store_telemetry,
)


def test_health_and_root(client):
    root = client.get("/")
    assert root.status_code == 200
    assert root.get_json()["service"] == "smartroom-monitor"

    health = client.get("/api/v1/health")
    assert health.status_code == 200
    assert health.get_json()["status"] == "ok"


def test_auth_login_me_and_logout(client):
    bad = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "bad-password"},
    )
    assert bad.status_code == 401

    good = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "Admin@123"},
    )
    assert good.status_code == 200
    body = good.get_json()
    assert body["user"]["role"] == "ADMIN"

    headers = {"Authorization": f"Bearer {body['access_token']}"}
    me = client.get("/api/v1/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.get_json()["username"] == "admin"

    logout = client.post("/api/v1/auth/logout", headers=headers)
    assert logout.status_code == 200


def test_device_list_detail_and_status(client, admin_headers):
    devices = client.get("/api/v1/devices", headers=admin_headers)
    assert devices.status_code == 200
    assert [d["id"] for d in devices.get_json()["items"]] == ["sim-esp32-001"]

    detail = client.get(
        "/api/v1/devices/sim-esp32-001",
        headers=admin_headers,
    )
    assert detail.status_code == 200
    assert detail.get_json()["lifecycle_state"] == "ACTIVE"

    status = client.get(
        "/api/v1/devices/sim-esp32-001/status",
        headers=admin_headers,
    )
    assert status.status_code == 200
    assert status.get_json()["device_id"] == "sim-esp32-001"


def test_telemetry_alert_and_acknowledge_flow(client, app, admin_headers, operator_headers):
    with app.app_context():
        telemetry = store_telemetry(
            "sim-esp32-001",
            {
                "message_id": "telemetry-e2e-1",
                "temperature_c": 36.5,
                "humidity_percent": 86.0,
            },
        )
        assert telemetry is not None
        alarm_types = evaluate_alerts("sim-esp32-001", telemetry)
        assert "TEMPERATURE_HIGH" in alarm_types
        db.session.commit()
        alert_id = Alert.query.filter_by(device_id="sim-esp32-001", alert_type="TEMPERATURE_HIGH").first().id

    latest = client.get(
        "/api/v1/devices/sim-esp32-001/telemetry/latest",
        headers=admin_headers,
    )
    assert latest.status_code == 200
    assert latest.get_json()["item"]["temperature_c"] == 36.5

    alerts = client.get("/api/v1/alerts", headers=admin_headers)
    assert alerts.status_code == 200
    active = alerts.get_json()["items"]
    assert any(item["id"] == alert_id and item["state"] == "ACTIVE" for item in active)

    ack = client.post(
        f"/api/v1/alerts/{alert_id}/acknowledge",
        headers=operator_headers,
    )
    assert ack.status_code == 200
    assert ack.get_json()["state"] == "ACKNOWLEDGED"

    acknowledged = client.get(
        "/api/v1/alerts?state=ACKNOWLEDGED",
        headers=admin_headers,
    )
    assert any(item["id"] == alert_id for item in acknowledged.get_json()["items"])


def test_command_create_and_read_acknowledged_state(client, app, operator_headers):
    create = client.post(
        "/api/v1/devices/sim-esp32-001/commands",
        headers=operator_headers,
        json={"action": "ON"},
    )
    assert create.status_code == 201
    created = create.get_json()
    assert created["state"] == "PENDING"

    command_id = created["id"]
    with app.app_context():
        command = db.session.get(DeviceCommand, command_id)
        complete_command(
            command_id,
            "ACKNOWLEDGED",
            {"led_on": True, "command": {"action": "ON"}},
            None,
        )
        db.session.commit()

    command_get = client.get(
        f"/api/v1/commands/{command_id}",
        headers=operator_headers,
    )
    assert command_get.status_code == 200
    acked = command_get.get_json()
    assert acked["state"] == "ACKNOWLEDGED"
    assert acked["ack_payload"]["led_on"] is True


def test_viewer_cannot_create_command(client, viewer_headers):
    create = client.post(
        "/api/v1/devices/sim-esp32-001/commands",
        headers=viewer_headers,
        json={"action": "ON"},
    )
    assert create.status_code == 403


def test_config_update_and_second_real_device(client, app, operator_headers, admin_headers):
    update = client.post(
        "/api/v1/devices/sim-esp32-001/config",
        headers=operator_headers,
        json={"temp_high_c": 30.0},
    )
    assert update.status_code == 200
    assert update.get_json()["thresholds"]["temp_high_c"] == 30.0

    with app.app_context():
        ensure_device("esp32-room-002", "Physical Room 2", firmware_version="1.2.0")
        db.session.commit()

    devices = client.get("/api/v1/devices", headers=admin_headers)
    ids = [item["id"] for item in devices.get_json()["items"]]
    assert ids == ["sim-esp32-001", "esp32-room-002"]


def test_missing_device_returns_404(client, admin_headers):
    response = client.get(
        "/api/v1/devices/does-not-exist/status",
        headers=admin_headers,
    )
    assert response.status_code == 404



