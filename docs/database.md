# Database

Tables:

- `users`
- `devices`
- `device_credentials`
- `telemetry`
- `device_commands`
- `device_configs`
- `alerts`
- `audit_logs`

Core rules:

- Primary keys use UUID strings for domain objects, autoincrement only for append-heavy logs/rows.
- Datetimes are stored as UTC aware where supported.
- `telemetry` has unique `(device_id, message_id)` to deduplicate MQTT redelivery.
- Command state: PENDING -> ACKNOWLEDGED / FAILED / TIMEOUT.
- Alert dedupe key prevents repeated active alerts for the same device/alert type.
- SQLite is P0; Flask-SQLAlchemy + Alembic keeps a path toward PostgreSQL later.

## Migration

```powershell
cd backend
$env:PYTHONPATH='.'
..\.venv\Scripts\python -m flask --app wsgi:app db upgrade
```
