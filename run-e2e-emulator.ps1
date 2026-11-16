#!/usr/bin/env pwsh
# Ejecuta la suite E2E completa contra emuladores Firebase nuevos.
$ErrorActionPreference = "Stop"
Push-Location $PSScriptRoot
npm run test:e2e
$exitCode = $LASTEXITCODE
Pop-Location
exit $exitCode
