"""Device password derivation without storing plaintext MQTT secrets unnecessarily."""
import hashlib
import hmac


def derive_device_password(device_id: str, secret: str) -> str:
    """Derive a stable per-device broker password from app secret and device id."""
    if not secret:
        raise ValueError("empty secret")
    digest = hmac.new(secret.encode(), device_id.encode(), hashlib.sha256).hexdigest()
    return digest[:32]
