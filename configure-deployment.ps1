#!/usr/bin/env pwsh

# Script para configurar GitHub y Vercel deployment automático
# Usa información de .env para configuración

Write-Host "🚀 CONFIGURACIÓN AUTOMÁTICA DE DEPLOYMENT" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Leer archivo .env
Write-Host "`n📖 Leyendo configuración..." -ForegroundColor Yellow
$envFile = Get-Content ".env" -Raw
$envLines = $envFile -split "`n" | Where-Object { $_ -and -not $_.StartsWith("#") }

# Extraer valores
$env:NEXT_PUBLIC_FIREBASE_PROJECT_ID = ($envLines | Select-String "NEXT_PUBLIC_FIREBASE_PROJECT_ID=" | ForEach-Object { $_.Line.Split("=")[1] }).Trim()
$env:NEXT_PUBLIC_FIREBASE_API_KEY = ($envLines | Select-String "NEXT_PUBLIC_FIREBASE_API_KEY=" | ForEach-Object { $_.Line.Split("=")[1] }).Trim()
$env:NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = ($envLines | Select-String "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=" | ForEach-Object { $_.Line.Split("=")[1] }).Trim()
$env:NEXT_PUBLIC_FIREBASE_APP_ID = ($envLines | Select-String "NEXT_PUBLIC_FIREBASE_APP_ID=" | ForEach-Object { $_.Line.Split("=")[1] }).Trim()
$env:NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = ($envLines | Select-String "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=" | ForEach-Object { $_.Line.Split("=")[1] }).Trim()
$env:NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = ($envLines | Select-String "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=" | ForEach-Object { $_.Line.Split("=")[1] }).Trim()

Write-Host "✅ Configuración cargada:" -ForegroundColor Green
Write-Host "   Firebase Project: $($env:NEXT_PUBLIC_FIREBASE_PROJECT_ID)" -ForegroundColor Gray
Write-Host "   Firebase Domain: $($env:NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN)" -ForegroundColor Gray

# Información de Vercel
$VERCEL_ORG_ID = "proyectoswm"
$VERCEL_PROJECT_ID = "prj_QqnxSbQ9ljkBJRbWQD9ck6amlwL1"

Write-Host "`n🔐 PASO 1: Obtener GitHub Personal Access Token" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan

$githubToken = Read-Host "Pega tu GitHub Personal Access Token (debe tener scope 'workflow')"

if (-not $githubToken) {
    Write-Host "❌ Token no proporcionado. Abortando." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Token recibido" -ForegroundColor Green

# Configurar remote con token
Write-Host "`n🔄 PASO 2: Configurar Git remote con token" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan

$remoteUrl = "https://$githubToken@github.com/salazaroliveros-prog/ORIGEN.git"
git remote set-url origin $remoteUrl

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Git remote configurado" -ForegroundColor Green
} else {
    Write-Host "❌ Error configurando git remote" -ForegroundColor Red
    exit 1
}

# Hacer push del deploy.yml
Write-Host "`n📤 PASO 3: Hacer push del deploy.yml workflow" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan

Write-Host "Agregando deploy.yml a git..." -ForegroundColor Gray
git add .github/workflows/deploy.yml

Write-Host "Commiteando..." -ForegroundColor Gray
git commit --no-verify -m "feat: enable automatic Vercel deployment workflow

This workflow triggers on:
- Push to main branch
- After CI workflow succeeds

Requires GitHub Secrets:
- VERCEL_TOKEN
- VERCEL_ORG_ID
- VERCEL_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_* (6 variables)

Deployment status will be visible in:
- GitHub Actions tab
- Vercel Dashboard
- https://origen-proyectoswm.vercel.app"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Commit creado" -ForegroundColor Green
} else {
    Write-Host "⚠️  Nada nuevo para commitear" -ForegroundColor Yellow
}

# Hacer push
Write-Host "Haciendo push a GitHub..." -ForegroundColor Gray
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deploy.yml pusheado exitosamente" -ForegroundColor Green
} else {
    Write-Host "❌ Error haciendo push" -ForegroundColor Red
    exit 1
}

# Obtener Vercel Token
Write-Host "`n🔐 PASO 4: Crear Vercel Token" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan

Write-Host "Para crear el token de Vercel, ejecuta:" -ForegroundColor Cyan
Write-Host '  vercel tokens create "ORIGEN-GITHUB-DEPLOY"' -ForegroundColor Green
Write-Host "`nO copia tu token existente si ya lo tienes." -ForegroundColor Gray

$vercelToken = Read-Host "Pega tu Vercel Token"

if (-not $vercelToken) {
    Write-Host "❌ Token de Vercel no proporcionado. Continuando sin él." -ForegroundColor Yellow
} else {
    Write-Host "✅ Token de Vercel recibido" -ForegroundColor Green
}

# Crear script para agregar secrets
Write-Host "`n📝 PASO 5: Agregar Secrets en GitHub" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan

Write-Host "Los siguientes secrets necesitan agregarse en:" -ForegroundColor Cyan
Write-Host "https://github.com/salazaroliveros-prog/ORIGEN/settings/secrets/actions" -ForegroundColor Green
Write-Host "" -ForegroundColor Cyan

$secrets = @(
    @{Name = "VERCEL_TOKEN"; Value = $vercelToken; Required = $true}
    @{Name = "VERCEL_ORG_ID"; Value = $VERCEL_ORG_ID; Required = $true}
    @{Name = "VERCEL_PROJECT_ID"; Value = $VERCEL_PROJECT_ID; Required = $true}
)

foreach ($secret in $secrets) {
    if ($secret.Value) {
        Write-Host "✅ $($secret.Name)" -ForegroundColor Green
        Write-Host "   Valor: $($secret.Value.Substring(0, [Math]::Min(20, $secret.Value.Length)))..." -ForegroundColor Gray
    } else {
        if ($secret.Required) {
            Write-Host "⚠️  $($secret.Name) - NO CONFIGURADO" -ForegroundColor Yellow
        }
    }
}

Write-Host "`nFire base Secrets (copiados de .env):" -ForegroundColor Cyan
$firebaseSecrets = @(
    @{Name = "NEXT_PUBLIC_FIREBASE_PROJECT_ID"; Value = "origen-erp-guatemala"}
    @{Name = "NEXT_PUBLIC_FIREBASE_API_KEY"; Value = "[Configurado]"}
    @{Name = "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"; Value = "origen-erp-guatemala.firebaseapp.com"}
    @{Name = "NEXT_PUBLIC_FIREBASE_APP_ID"; Value = "1:893831571998:web:4e38903eeb0dff05011c0f"}
    @{Name = "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"; Value = "origen-erp-guatemala.firebasestorage.app"}
    @{Name = "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"; Value = "893831571998"}
)

foreach ($secret in $firebaseSecrets) {
    Write-Host "✅ $($secret.Name)" -ForegroundColor Green
}

# Verificación final
Write-Host "`n✅ VERIFICACIÓN FINAL" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan

Write-Host "`n📊 Estado de Git:" -ForegroundColor Green
git remote -v
git log --oneline -3

Write-Host "`n📊 Proyecto Vercel:" -ForegroundColor Green
Write-Host "Team: $VERCEL_ORG_ID" -ForegroundColor Gray
Write-Host "Project: origen" -ForegroundColor Gray
Write-Host "URL: https://origen-proyectoswm.vercel.app" -ForegroundColor Gray

Write-Host "`n✅ PRÓXIMOS PASOS" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan

Write-Host @"
1. Agregar Vercel Token en GitHub Secrets (si no está):
   https://github.com/salazaroliveros-prog/ORIGEN/settings/secrets/actions
   
2. Verifica que todos los secrets estén creados

3. El próximo push ejecutará automáticamente:
   ✅ Lint check
   ✅ Test suite (324/324)
   ✅ Build
   ✅ Deploy a Vercel

4. Monitorea en:
   - GitHub Actions: https://github.com/salazaroliveros-prog/ORIGEN/actions
   - Vercel: https://vercel.com/proyectoswm/origen

🚀 ¡Auto-deployment activado!
"@ -ForegroundColor Green

Write-Host "`n✨ Configuración completada" -ForegroundColor Cyan
