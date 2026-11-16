#!/usr/bin/env pwsh
# Ejecuta autenticación y CRUD E2E con infraestructura efímera.
$ErrorActionPreference = "Stop"
Push-Location $PSScriptRoot
npm run test:e2e -- e2e/auth.spec.ts e2e/system-crud.spec.ts
$exitCode = $LASTEXITCODE
Pop-Location
exit $exitCode
