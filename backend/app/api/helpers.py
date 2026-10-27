"""Shared API helpers and decorators."""
from functools import wraps
from typing import Callable

from flask import jsonify
from flask_jwt_extended import get_jwt, verify_jwt_in_request

from ..services import role_allowed


def current_user_id() -> str | None:
    claims = get_jwt()
    return claims.get("user_id")


def require_role(minimum: str) -> Callable:
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            role = get_jwt().get("role", "VIEWER")
            if not role_allowed(role, minimum):
                return jsonify({"error": "forbidden", "message": "insufficient role"}), 403
            return fn(*args, **kwargs)

        return wrapper

    return decorator


def ok(data=None, status=200):
    return jsonify(data if data is not None else {}), status


def err(message: str, status: int, error: str = "error"):
    return jsonify({"error": error, "message": message}), status
