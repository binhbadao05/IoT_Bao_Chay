# Architecture

## Runtime processes

- Mosquitto: MQTT Broker.
- Flask API: REST only, does not create MQTT connections per request.
- MQTT Worker: separate Python process, consumes device messages and publishes pending commands.
- SQLite: shared database between API and worker.
- Simulator: standalone MQTT device. ESP32 firmware will use the same contract later.

## Flow

1. Device publishes telemetry/heartbeat/status to `smartroom/v1/devices/{device_id}/...`.
2. Worker validates JSON and topic/device match.
3. Worker writes telemetry and updates last_seen/connection state.
4. Worker evaluates alerts against active device thresholds.
5. REST API reads data from SQLite.
6. REST API creates `DeviceCommand` in PENDING state.
7. Worker polls pending commands and publishes them to MQTT.
8. Device/simulator executes and publishes ACK.
9. Worker updates command to ACKNOWLEDGED/FAILED; timeout task marks stale commands TIMEOUT.

## Device lifecycle vs connection state

- `lifecycle_state`: REGISTERED, PROVISIONED, ACTIVE, OFFLINE, FAULT, MAINTENANCE, DECOMMISSIONED.
- `connection_state`: UNKNOWN, ONLINE, OFFLINE.
- A device can be `ACTIVE` and `OFFLINE`; telemetry is rejected when lifecycle is not accepting.

## Security

- JWT for REST.
- RBAC roles.
- password hashing for users.
- MQTT broker username/password dev setup; simple ACL for broker.
- Per-device MQTT password derivation, stored as hash in DB.
- Full Mosquitto Dynamic Security is documented as a next step, not claimed implemented.

## Known shortcuts

- Broker revocation is modeled as revoking the credential in SQLite; actual Dynamic Security revocation is not implemented yet.
- MQTT integration tests are skip-gated behind `RUN_MQTT_INTEGRATION=1`.
