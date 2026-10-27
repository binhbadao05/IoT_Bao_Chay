# MQTT Protocol v1

## Direction

Topic: `smartroom/v1/devices/{device_id}/<kind>`

| Topic | Publisher | Subscriber | QoS | Retain |
|---|---|---|---|---|
| telemetry | device/simulator | worker | 1 | no |
| heartbeat | device/simulator | worker | 1 | no |
| status | device/simulator | worker | 1 | no |
| commands | worker | device/simulator | 1 | no |
| commands/ack | device/simulator | worker | 1 | no |
| config | worker | device/simulator | 1 | no |
| config/ack | device/simulator | worker | 1 | no |

## Principles

- Worker trusts `device_id` only when it matches the topic prefix and the device is known/active.
- `timestamp` is not required from device; backend stores `received_at` as UTC on worker.
- Commands must not use retained messages to avoid re-running old commands.
- Last Will on status topic publishes `state: offline`.

## Payloads

Telemetry:

```json
{
  "schema_version": 1,
  "message_id": "sim-esp32-001-telemetry-1700000000-0001",
  "device_id": "sim-esp32-001",
  "temperature_c": 28.4,
  "humidity_percent": 66.2
}
```

Heartbeat:

```json
{
  "schema_version": 1,
  "message_id": "sim-esp32-001-heartbeat-1700000000-0002",
  "device_id": "sim-esp32-001",
  "firmware_version": "0.1.0-sim",
  "telemetry_interval_seconds": 5,
  "heartbeat_interval_seconds": 5
}
```

Status / LWT:

```json
{
  "schema_version": 1,
  "message_id": "sim-esp32-001-status-1700000000-0003",
  "device_id": "sim-esp32-001",
  "state": "online"
}
```

Command:

```json
{
  "schema_version": 1,
  "command_id": "command-uuid",
  "command_type": "LED_CONTROL",
  "payload": {
    "action": "ON"
  }
}
```

Command ACK:

```json
{
  "schema_version": 1,
  "command_id": "command-uuid",
  "device_id": "sim-esp32-001",
  "result": "ACKNOWLEDGED",
  "state": {
    "led_on": true
  }
}
```

Config ack contract is analogous, with `config` instead of `state`.
