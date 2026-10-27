# REST API Summary

Base URL: `http://localhost:5000/api/v1`

Auth: `Authorization: Bearer <JWT>`.

Roles: `VIEWER < OPERATOR < ADMIN`.

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | /health | public | liveness |
| GET | /ready | public | readiness |
| POST | /auth/login | public | get JWT |
| POST | /auth/logout | any | client discard hint |
| GET | /auth/me | any | current user |
| POST | /auth/users | ADMIN | create user |
| PATCH | /auth/users/me/password | any | change own password |
| GET | /devices | any | list devices |
| POST | /devices | ADMIN | create device |
| GET | /devices/{id} | any | device detail |
| PATCH | /devices/{id} | OPERATOR | update metadata |
| POST | /devices/{id}/activate | OPERATOR | activate lifecycle |
| POST | /devices/{id}/disable | OPERATOR | maintenance |
| POST | /devices/{id}/decommission | ADMIN | decommission/revoke |
| POST | /devices/{id}/config | OPERATOR | update local thresholds |
| GET | /devices/{id}/status | any | lifecycle + connection status |
| GET | /devices/{id}/telemetry/latest | any | latest telemetry |
| GET | /devices/{id}/telemetry | any | paginated telemetry |
| POST | /devices/{id}/commands | OPERATOR | LED ON/OFF command |
| GET | /devices/{id}/commands | any | device command history |
| GET | /commands/{command_id} | any | command status |
| GET | /alerts | any | list alerts |
| POST | /alerts/{id}/acknowledge | OPERATOR | ack alert |

## Example login

```powershell
$body = @{ username='admin'; password='Admin@123' } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/v1/auth/login -ContentType 'application/json' -Body $body
$headers = @{ Authorization = "Bearer $($login.access_token)" }
```

## Example send command

```powershell
$body = @{ action='ON' } | ConvertTo-Json
$cmd = Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/v1/devices/sim-esp32-001/commands -Headers $headers -ContentType 'application/json' -Body $body
Invoke-RestMethod -Method Get -Uri "http://localhost:5000/api/v1/commands/$($cmd.id)" -Headers $headers
```
