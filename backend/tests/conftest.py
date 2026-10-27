from app import create_app
from app.config import TestingConfig
from app.extensions import db
from app.services import ensure_device, ensure_user

import pytest


@pytest.fixture()
def app():
    application = create_app(TestingConfig)
    with application.app_context():
        db.create_all()
        ensure_user("admin", "Admin@123", "ADMIN")
        ensure_user("operator", "Operator@123", "OPERATOR")
        ensure_user("viewer", "Viewer@123", "VIEWER")
        ensure_device("sim-esp32-001", "Simulated ESP32 Room 1", firmware_version="0.1.0-sim")
        db.session.commit()
    yield application
    with application.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def admin_headers(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "Admin@123"},
    )
    assert response.status_code == 200
    token = response.get_json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def operator_headers(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "operator", "password": "Operator@123"},
    )
    assert response.status_code == 200
    token = response.get_json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def viewer_headers(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "viewer", "password": "Viewer@123"},
    )
    assert response.status_code == 200
    token = response.get_json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
