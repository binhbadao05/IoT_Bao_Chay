# Mosquitto Broker

Dev broker config uses Docker.

## One-time setup

Generate `broker/passwd`:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup_mqtt_passwords.ps1
```

## Run

```powershell
docker compose up -d mosquitto
```

## Stop

```powershell
docker compose down
```

Current dev accounts: `backend_service` and `sim_device`. Do not use these in production.

Dynamic Security is not implemented in this iteration. The simple ACL in `broker/acl` prevents the provided simulator account from publishing to other devices, but real per-device provisioning should use Mosquitto Dynamic Security later.
