$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")

# 1. Prepare runtime data
New-Item -ItemType Directory -Force -Path (Join-Path $root "instance") | Out-Null
if (-not (Test-Path (Join-Path $root "broker\passwd"))) {
    & (Join-Path $PSScriptRoot "setup_mqtt_passwords.ps1")
}

# 2. Database migration and seed data
Push-Location (Join-Path $root "backend")
try {
    $env:PYTHONPATH = "."
    & (Join-Path $root ".venv\Scripts\python.exe") -m flask --app wsgi:app db upgrade
} finally {
    Pop-Location
}
$env:PYTHONPATH = "backend"
& (Join-Path $root ".venv\Scripts\python.exe") (Join-Path $root "backend\bootstrap.py")

# 3. Mosquitto
Push-Location $root
docker compose up -d mosquitto
Pop-Location

# 4. Worker and simulator as background processes
$workerOut = Join-Path $root "worker.out.log"
$workerErr = Join-Path $root "worker.err.log"
$simOut = Join-Path $root "sim.out.log"
$simErr = Join-Path $root "sim.err.log"
$worker = Start-Process -FilePath (Join-Path $root ".venv\Scripts\python.exe") -ArgumentList @((Join-Path $root "backend\worker.py")) -WorkingDirectory $root -RedirectStandardOutput $workerOut -RedirectStandardError $workerErr -WindowStyle Hidden -PassThru
$sim = Start-Process -FilePath (Join-Path $root ".venv\Scripts\python.exe") -ArgumentList @((Join-Path $root "simulator\simulate_device.py"), "--telemetry-interval", "2", "--heartbeat-interval", "2") -WorkingDirectory $root -RedirectStandardOutput $simOut -RedirectStandardError $simErr -WindowStyle Hidden -PassThru

# 5. Backend API and frontend Vite as background processes
$backendOut = Join-Path $root "backend.out.log"
$backendErr = Join-Path $root "backend.err.log"
$frontendOut = Join-Path $root "frontend.out.log"
$frontendErr = Join-Path $root "frontend.err.log"
$env:PYTHONPATH = "."
$api = Start-Process -FilePath (Join-Path $root ".venv\Scripts\python.exe") -ArgumentList @("-m", "flask", "--app", "wsgi:app", "run", "--host", "127.0.0.1", "--port", "5000") -WorkingDirectory (Join-Path $root "backend") -RedirectStandardOutput $backendOut -RedirectStandardError $backendErr -WindowStyle Hidden -PassThru
$fe = Start-Process -FilePath "npm.cmd" -ArgumentList @("run", "dev") -WorkingDirectory (Join-Path $root "frontend") -RedirectStandardOutput $frontendOut -RedirectStandardError $frontendErr -WindowStyle Hidden -PassThru

Write-Host "Worker PID=$($worker.Id), Simulator PID=$($sim.Id), API PID=$($api.Id), Frontend PID=$($fe.Id)"
Write-Host "API: http://127.0.0.1:5000"
Write-Host "Frontend: http://127.0.0.1:5173"
Write-Host "Login admin / Admin@123"
