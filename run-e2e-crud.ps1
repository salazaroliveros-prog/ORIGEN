#!/usr/bin/env pwsh
# Script para ejecutar pruebas E2E de CRUD contra emuladores

$ErrorActionPreference = "Stop"

# Configurar variables de entorno para emulador
$env:NEXT_PUBLIC_USE_FIREBASE_EMULATORS = "true"
$env:NEXT_PUBLIC_FIREBASE_PROJECT_ID = "demo-origen-erp-test"
$env:NEXT_PUBLIC_FIREBASE_API_KEY = "demo-api-key"
$env:NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = "localhost"
$env:NEXT_PUBLIC_FIREBASE_APP_ID = "1:000000000000:web:demo"
$env:NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = "demo-origen-erp-test.appspot.com"
$env:NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = "000000000000"
$env:NEXT_PUBLIC_FIREBASE_EMULATOR_HOST = "127.0.0.1"

# Variables para Playwright E2E
$env:E2E_ALLOW_FIREBASE_MUTATIONS = "1"
$env:E2E_ADMIN_EMAIL = "admin@test.com"
$env:E2E_ADMIN_PASSWORD = "test123"
$env:E2E_FIREBASE_TARGET = "emulator"
$env:E2E_BASE_URL = "http://localhost:3000"

Write-Host "=== Verificando emuladores de Firebase ===" -ForegroundColor Cyan
$emulators = @("9099", "8080", "9199")
foreach ($port in $emulators) {
    $conn = netstat -ano | Select-String -Pattern ":${port}\s"
    if ($conn) {
        Write-Host "  Puerto ${port}: ACTIVO" -ForegroundColor Green
    } else {
        Write-Host "  Puerto ${port}: NO ACTIVO - iniciando..." -ForegroundColor Yellow
        npm run emulators > emulators.log 2>&1 &
        Start-Sleep -Seconds 15
    }
}

Write-Host "=== Levantando servidor Next.js dev en puerto 3000 ===" -ForegroundColor Cyan
$server = Start-Process -FilePath "node" -ArgumentList "node_modules/next/dist/bin/next", "dev", "-p", "3000", "-H", "0.0.0.0" -WorkingDirectory (Get-Location) -RedirectStandardOutput "e2e-crud.log" -RedirectStandardError "e2e-crud-error.log" -PassThru

# Esperar a que el servidor esté listo
Write-Host "Esperando a que el servidor esté disponible..." -ForegroundColor Cyan
$serverReady = $false
for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 2
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -ErrorAction Stop
        if ($r.StatusCode -eq 200) {
            Write-Host "Servidor listo en http://localhost:3000" -ForegroundColor Green
            $serverReady = $true
            break
        }
    } catch {}
}

if (-not $serverReady) {
    Write-Host "El servidor no respondió después de 120 segundos" -ForegroundColor Red
    Get-Content "e2e-crud-error.log" -Tail 30
    Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "=== Ejecutando pruebas E2E de CRUD ===" -ForegroundColor Cyan
npx playwright test e2e/system-crud.spec.ts --project=chromium 2>&1

$exitCode = $LASTEXITCODE

Write-Host "=== Deteniendo servidor ===" -ForegroundColor Cyan
Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue

Write-Host "=== Script finalizado con código: $exitCode ===" -ForegroundColor Cyan
exit $exitCode
