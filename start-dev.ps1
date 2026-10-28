# Script para iniciar el servidor de desarrollo sin debugger de VS Code
$env:NODE_OPTIONS = ""
$env:VSCODE_DEBUGGER_AUTO_ATTACH = "disabled"

Write-Host "Iniciando servidor de desarrollo..." -ForegroundColor Green
Write-Host "Presione Ctrl+C para detener" -ForegroundColor Yellow

npm run dev
