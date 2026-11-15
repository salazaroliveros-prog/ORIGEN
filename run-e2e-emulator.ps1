#!/usr/bin/env pwsh
# Script para ejecutar pruebas E2E contra emuladores de Firebase
# Levanta el servidor Next.js, ejecuta las pruebas y detiene el servidor

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
    $conn = netstat -ano | Select-String -Pattern ":$port\s"
    if ($conn) {
        Write-Host "  Puerto ${port}: ACTIVO" -ForegroundColor Green
    } else {
        Write-Host "  Puerto ${port}: NO ACTIVO - iniciando emuladores..." -ForegroundColor Yellow
        npm run emulators > emulators.log 2>&1 &
        Start-Sleep -Seconds 10
        break
    }
}

Write-Host "=== Construyendo Next.js con emulador ===" -ForegroundColor Cyan
npm run build 2>&1 | Select-Object -Last 5

Write-Host "=== Levantando servidor Next.js en puerto 3000 ===" -ForegroundColor Cyan
$server = Start-Process -FilePath "node" -ArgumentList ".next/standalone/server.js" -WorkingDirectory (Get-Location) -RedirectStandardOutput "e2e-server.log" -RedirectStandardError "e2e-server-error.log" -PassThru

# Esperar a que el servidor esté listo
Write-Host "Esperando a que el servidor esté disponible..." -ForegroundColor Cyan
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 2
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -ErrorAction Stop
        if ($r.StatusCode -eq 200) {
            Write-Host "Servidor listo en http://localhost:3000" -ForegroundColor Green
            break
        }
    } catch {
        if ($i -eq 29) {
            Write-Host "El servidor no respondió después de 60 segundos" -ForegroundColor Red
            Get-Content "e2e-server-error.log" -Tail 20
            exit 1
        }
    }
}

# Verificar el header de emulador
Write-Host "=== Verificando configuración de emulador ===" -ForegroundColor Cyan
try {
    $config = Invoke-WebRequest -Uri "http://localhost:3000/api/firebase-config.js" -TimeoutSec 10 -ErrorAction Stop
    $headers = $config.Headers
    $emulatorMode = $headers['X-Firebase-Emulator-Mode']
    Write-Host "  X-Firebase-Emulator-Mode: $emulatorMode" -ForegroundColor Cyan
    Write-Host "  Contenido: $($config.Content.Substring(0,100))..." -ForegroundColor Cyan
} catch {
    Write-Host "  No se pudo verificar la configuración Firebase" -ForegroundColor Yellow
}

Write-Host "=== Ejecutando pruebas E2E ===" -ForegroundColor Cyan
npx playwright test e2e/auth.spec.ts e2e/system-crud.spec.ts --project=chromium 2>&1

$exitCode = $LASTEXITCODE

Write-Host "=== Deteniendo servidor ===" -ForegroundColor Cyan
Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue

Write-Host "=== Script finalizado con código: $exitCode ===" -ForegroundColor Cyan
exit $exitCode
