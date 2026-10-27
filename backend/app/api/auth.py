"""Authentication endpoints."""
from flask import Blueprint, request
from flask_jwt_extended import (
    create_access_token,
    get_jwt,
    jwt_required,
)
from werkzeug.security import generate_password_hash

from ..extensions import db
from ..models import User
from .helpers import err, ok, require_role

bp = Blueprint("auth", __name__)


@bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    username = data.get("username", "")
    password = data.get("password", "")
    user = User.query.filter_by(username=username).first()
    if user is None or not user.is_active or not user.check_password(password):
        return err("invalid username or password", 401, "unauthorized")
    token = create_access_token(
        identity=user.id,
        additional_claims={
            "username": user.username,
            "role": user.role,
            "user_id": user.id,
        },
    )
    return ok({"access_token": token, "user": user_dict(user)})


@bp.post("/logout")
@jwt_required()
def logout():
    # JWTs are stateless. A short-lived token policy is the available revoke mechanism now.
    return ok({"message": "logout accepted; discard access token on client"})


@bp.get("/me")
@jwt_required()
def me():
    user = db.session.get(User, get_jwt()["user_id"])
    if user is None or not user.is_active:
        return err("user not found", 404, "not_found")
    return ok(user_dict(user))


@bp.post("/users")
@require_role("ADMIN")
def create_user():
    data = request.get_json(silent=True) or {}
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", ""))
    role = str(data.get("role", "VIEWER")).upper()
    if not username or not password:
        return err("username and password are required", 400, "validation_error")
    if role not in {"ADMIN", "OPERATOR", "VIEWER"}:
        return err("invalid role", 400, "validation_error")
    if User.query.filter_by(username=username).first():
        return err("username already exists", 409, "conflict")
    user = User(username=username, role=role)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return ok(user_dict(user), 201)


@bp.patch("/users/me/password")
@jwt_required()
def change_password():
    data = request.get_json(silent=True) or {}
    old_password = data.get("old_password", "")
    new_password = data.get("new_password", "")
    user = db.session.get(User, get_jwt()["user_id"])
    if user is None or not user.check_password(old_password):
        return err("old password invalid", 400, "validation_error")
    if len(new_password) < 8:
        return err("new password must be at least 8 characters", 400, "validation_error")
    user.set_password(new_password)
    db.session.commit()
    return ok({"message": "password updated"})


def user_dict(user: User):
    return {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat(),
    }
