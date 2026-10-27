"""Pydantic schemas and MQTT payload validation."""
import json
import math
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

DEVICE_ID_PATTERN = r"^[A-Za-z0-9_-]{1,64}$"


class TelemetryPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: int = Field(ge=1, le=1)
    message_id: str = Field(min_length=1, max_length=64)
    device_id: str = Field(pattern=DEVICE_ID_PATTERN)
    temperature_c: float
    humidity_percent: float
    recorded_at: str | None = None

    @field_validator("temperature_c")
    @classmethod
    def validate_temperature(cls, value: float):
        if not math.isfinite(value) or value < -40.0 or value > 85.0:
            raise ValueError("temperature_c must be finite and between -40 and 85")
        return value

    @field_validator("humidity_percent")
    @classmethod
    def validate_humidity(cls, value: float):
        if not math.isfinite(value) or value < 0.0 or value > 100.0:
            raise ValueError("humidity_percent must be finite and between 0 and 100")
        return value


class HeartbeatPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: int = Field(ge=1, le=1)
    message_id: str = Field(min_length=1, max_length=64)
    device_id: str = Field(pattern=DEVICE_ID_PATTERN)
    firmware_version: str = Field(max_length=32)
    telemetry_interval_seconds: int = Field(gt=0, le=3600)
    heartbeat_interval_seconds: int = Field(gt=0, le=3600)


class StatusPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: int = Field(ge=1, le=1)
    message_id: str = Field(min_length=1, max_length=64)
    device_id: str = Field(pattern=DEVICE_ID_PATTERN)
    state: str = Field(pattern=r"^(online|offline|fault)$")


class CommandAckPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: int = Field(ge=1, le=1)
    command_id: str = Field(min_length=1, max_length=64)
    device_id: str = Field(pattern=DEVICE_ID_PATTERN)
    result: str = Field(pattern=r"^(ACKNOWLEDGED|FAILED)$")
    state: dict[str, Any] | None = None
    error_code: str | None = Field(default=None, max_length=64)


class ConfigAckPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: int = Field(ge=1, le=1)
    command_id: str = Field(min_length=1, max_length=64)
    device_id: str = Field(pattern=DEVICE_ID_PATTERN)
    result: str = Field(pattern=r"^(ACKNOWLEDGED|FAILED)$")
    config: dict[str, Any] | None = None
    error_code: str | None = Field(default=None, max_length=64)


def parse_payload(raw: bytes | str, model: type[BaseModel]) -> BaseModel:
    if isinstance(raw, bytes):
        raw = raw.decode("utf-8")
    if isinstance(raw, str):
        data = json.loads(raw)
    else:
        data = raw
    return model.model_validate(data)
