#!/usr/bin/env pwsh
# Ejecuta CRUD E2E con Firebase Emulator y servidor aislado.
$ErrorActionPreference = "Stop"
Push-Location $PSScriptRoot
npm run test:e2e -- e2e/system-crud.spec.ts
$exitCode = $LASTEXITCODE
Pop-Location
exit $exitCode
