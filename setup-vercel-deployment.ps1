#!/usr/bin/env pwsh

# Script de Configuración Automática de Vercel Deployment
# Este script resuelve el problema de GitHub auth automáticamente

Write-Host "🔧 Herramienta de Configuración - Vercel Auto-Deployment" -ForegroundColor Cyan

# 1. Verificar Vercel Token
Write-Host "`n📋 Paso 1: Generando Vercel Token..." -ForegroundColor Yellow
Write-Host "Ejecuta en tu terminal:" -ForegroundColor Gray
Write-Host "  vercel tokens create" -ForegroundColor Green
Write-Host "`nNombre recomendado: ORIGEN-GITHUB-DEPLOY" -ForegroundColor Gray
Write-Host "Copia el token y guárdalo en un lugar seguro" -ForegroundColor Cyan

$vercelToken = Read-Host "`nPega el Vercel Token aquí (o presiona Enter para saltar)"

if ($vercelToken) {
    Write-Host "✅ Token recibido" -ForegroundColor Green
} else {
    Write-Host "⏭️  Saltando paso del token" -ForegroundColor Yellow
}

# 2. Opción de Autenticación GitHub
Write-Host "`n📋 Paso 2: Selecciona método de autenticación GitHub" -ForegroundColor Yellow
Write-Host "1. Personal Access Token (PAT) - RECOMENDADO" -ForegroundColor Green
Write-Host "2. SSH Key" -ForegroundColor Green
Write-Host "3. Saltar (configurar manualmente en GitHub UI)" -ForegroundColor Gray

$choice = Read-Host "`nOpción (1/2/3)"

switch ($choice) {
    "1" {
        Write-Host "`n📝 Personal Access Token Setup:" -ForegroundColor Cyan
        Write-Host "1. Ve a: https://github.com/settings/tokens/new" -ForegroundColor Gray
        Write-Host "2. Nombre: ORIGEN-DEPLOY" -ForegroundColor Gray
        Write-Host "3. Scopes: repo, workflow, admin:repo_hook" -ForegroundColor Gray
        Write-Host "4. Copia el token (ghp_xxxx...)" -ForegroundColor Gray
        
        $pat = Read-Host "`nPega el Personal Access Token"
        if ($pat) {
            Write-Host "`n🔄 Configurando Git remote..." -ForegroundColor Cyan
            $url = "https://$($pat)@github.com/salazaroliveros-prog/ORIGEN.git"
            git remote set-url origin $url
            Write-Host "✅ Remote actualizado" -ForegroundColor Green
            
            Write-Host "`n⏳ Haciendo push..." -ForegroundColor Cyan
            git push origin main
            Write-Host "✅ Push completado" -ForegroundColor Green
        }
    }
    "2" {
        Write-Host "`n📝 SSH Key Setup:" -ForegroundColor Cyan
        Write-Host "1. Ejecuta: ssh-keygen -t ed25519 -C `"tu@email.com`"" -ForegroundColor Gray
        Write-Host "2. Ve a: https://github.com/settings/keys" -ForegroundColor Gray
        Write-Host "3. Agrega tu clave pública (~/.ssh/id_ed25519.pub)" -ForegroundColor Gray
        
        Write-Host "`n🔄 Cambiando remote a SSH..." -ForegroundColor Cyan
        git remote set-url origin git@github.com:salazaroliveros-prog/ORIGEN.git
        Write-Host "✅ Remote configurado" -ForegroundColor Green
        
        Write-Host "`n⏳ Haciendo push..." -ForegroundColor Cyan
        git push origin main
        Write-Host "✅ Push completado" -ForegroundColor Green
    }
    "3" {
        Write-Host "`n📝 Configuración Manual en GitHub UI:" -ForegroundColor Cyan
        Write-Host "1. Ve a: https://github.com/salazaroliveros-prog/ORIGEN/settings/secrets/actions" -ForegroundColor Gray
        Write-Host "2. Add repository secret:" -ForegroundColor Gray
        if ($vercelToken) {
            Write-Host "   - Name: VERCEL_TOKEN" -ForegroundColor Gray
            Write-Host "   - Value: (token copiado)" -ForegroundColor Gray
        } else {
            Write-Host "   - Name: VERCEL_TOKEN" -ForegroundColor Gray
            Write-Host "   - Value: (crear con 'vercel tokens create')" -ForegroundColor Gray
        }
        Write-Host "   - Name: VERCEL_ORG_ID" -ForegroundColor Gray
        Write-Host "   - Value: proyectoswm" -ForegroundColor Gray
        Write-Host "   - Name: VERCEL_PROJECT_ID" -ForegroundColor Gray
        Write-Host "   - Value: prj_QqnxSbQ9ljkBJRbWQD9ck6amlwL1" -ForegroundColor Gray
    }
}

# 3. Verificación Final
Write-Host "`n✅ Verificando configuración..." -ForegroundColor Cyan
git remote -v
Write-Host "`n✅ Estado actual:" -ForegroundColor Green
git log --oneline -3

Write-Host "`n🎉 Configuración completada" -ForegroundColor Green
Write-Host "La próxima vez que hagas push, GitHub Actions debería:" -ForegroundColor Cyan
Write-Host "1. Ejecutar CI (lint, tests, build)" -ForegroundColor Gray
Write-Host "2. Si CI pass, ejecutar Deploy a Vercel" -ForegroundColor Gray
Write-Host "3. Vercel actualizar: https://origen-proyectoswm.vercel.app" -ForegroundColor Gray
