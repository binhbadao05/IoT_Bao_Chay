$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$out = Join-Path $root "broker\passwd"
$passwordFile = "/mosquitto/config/passwd"
docker run --rm eclipse-mosquitto:2 sh -lc "rm -f $passwordFile; touch $passwordFile; mosquitto_passwd -b $passwordFile backend_service backend_service_password; mosquitto_passwd -b $passwordFile sim_device sim_device_password; cat $passwordFile" | Where-Object { $_ -notmatch '^Adding password for ' } | Set-Content -Encoding UTF8 $out
Write-Host "Wrote $out"
