# Testing

## Unit tests without broker

```powershell
.\.venv\Scripts\python -m pytest -q
```

Expected: unit tests pass; broker integration test skips unless `RUN_MQTT_INTEGRATION=1`.

## Manual end-to-end evidence

Automated commands after `scripts\run_demo.ps1` has started the app:

```powershell
cd frontend
npm run test:e2e:api
npm run test:e2e:ui
npm run test:e2e:animation
```

For UI tests that mutate data (acknowledge alerts, send LED commands), set `$env:RUN_QA_MUTATIONS='1'` first.

Commands run in this iteration:

1. `docker compose up -d mosquitto` — broker started.
2. Flask-Migrate `db upgrade` — initial schema PASS.
3. `backend/bootstrap.py` — seed admin/device PASS.
4. Worker connected to broker and subscribed topics — PASS.
5. Simulator published status/heartbeat/telemetry over MQTT — PASS.
6. API `/devices/sim-esp32-001/telemetry/latest` returned MQTT-sourced data — PASS.
7. API command `LED ON` created PENDING command — PASS.
8. Worker published command to MQTT — PASS.
9. Simulator received command and published ACK — PASS.
10. API `/commands/{id}` returned ACKNOWLEDGED with `led_on: true` — PASS.
11. `--force-alert` generated `TEMPERATURE_HIGH` and `HUMIDITY_HIGH` — PASS.
12. Stopping simulator for >15s changed status to OFFLINE and generated `DEVICE_OFFLINE` — PASS.

## Not tested

- Physical ESP32 firmware.
- Physical DHT22/LED wiring.
- Mosquitto Dynamic Security API integration.
