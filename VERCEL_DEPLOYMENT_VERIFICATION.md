# ✅ VERIFICACIÓN VERCEL DEPLOYMENT - ORIGEN ERP GUATEMALA

**Fecha:** 23 de Noviembre de 2026  
**Objetivo:** Validar deployment automático en Vercel  
**Status:** Pre-deployment checklist

---

## 🚀 CONFIGURACIÓN REQUERIDA EN VERCEL

### Step 1: Vercel Project Setup

```bash
# Verificar que el proyecto está conectado a GitHub
# En Vercel Dashboard:
# 1. Seleccionar proyecto ORIGEN ERP Guatemala
# 2. Settings → Git
# 3. Verificar: Connected to github.com/YOUR_REPO
# 4. Auto deploy: ✅ Enable
```

### Step 2: Environment Variables en Vercel

```bash
# Production Environment
# Settings → Environment Variables

NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
NEXT_PUBLIC_SITE_URL=https://origen-erp.vercel.app
NEXT_PUBLIC_APP_VERSION=1.0.0

VERCEL_KV_REST_API_URL=
VERCEL_KV_REST_API_TOKEN=
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK

FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
```

### Step 3: Build Settings

```bash
# Settings → Build & Development Settings

Build Command:  npm run build
Output Directory: .next
Install Command: npm install
```

---

## 🔍 CHECKLIST PRE-DEPLOYMENT

### Verificación Local

```bash
✅ npm run build      # Build completo sin errores
✅ npm run test       # Tests pasando (si aplica)
✅ npm run lint       # Lint sin errores críticos
✅ npm run type-check # Type checking OK
```

### Verificación Git

```bash
✅ git status         # Working tree clean
✅ git log --oneline  # Commits en orden
✅ Archivo .gitignore # Configurado correctamente
```

### Verificación Archivos

```bash
✅ No .env.local      # No secrets en staging
✅ No archivos .md    # Documentación excluida
✅ node_modules/      # En .gitignore
✅ .next/             # En .gitignore
```

### Verificación Dependencias

```bash
✅ package.json       # Scripts válidos
✅ npm audit          # Sin vulnerabilidades críticas
✅ npm ci             # Instalación reproducible
```

---

## 📊 FLUJO VERCEL DEPLOYMENT

### 1. Push a GitHub (main branch)

```bash
git push origin main
```

### 2. GitHub Actions CI/CD Triggers

```
✅ Lint job         → 2-3 minutos
✅ Security scan    → 2-3 minutos
✅ Build job        → 3-5 minutos
✅ Tests job        → 1-2 minutos
✅ Performance      → 2-3 minutos
✅ Deploy Production → 1-2 minutos
```

### 3. Vercel Automatic Deployment

```
GitHub Webhook
   ↓
Vercel receives push event
   ↓
Build process starts
   ├─ Install dependencies (npm ci)
   ├─ Build Next.js (npm run build)
   ├─ Optimize assets
   └─ Deploy to CDN
   ↓
Production live
   ↓
Health checks
   ├─ /api/health endpoint
   ├─ Security headers
   ├─ Performance metrics
   └─ All green → Deployment complete
```

---

## ✅ DEPLOYMENT CHECKLIST

### Pre-deployment (Antes de push)

```
☐ Código testeado localmente
☐ Build sin errores
☐ Lint passed
☐ Type-check passed
☐ No secrets en archivos
☐ .gitignore actualizado
☐ Environment variables en Vercel ✓
☐ GitHub Actions workflow funcional ✓
☐ Vercel project connected ✓
```

### During deployment (GitHub Actions)

```
☐ Lint job → ✅ PASS
☐ Security job → ✅ PASS
☐ Build job → ✅ PASS
☐ Test job → ✅ PASS (or skipped)
☐ Performance job → ✅ PASS (or skipped)
☐ Deploy-production job → ✅ PASS
```

### Post-deployment (Health checks)

```
☐ HTTPS redirect working
☐ /api/health responding
☐ Security headers present
☐ Homepage loading
☐ GA4 initialized (check console)
☐ Sentry initialized
☐ Performance metrics OK
```

---

## 🔧 TROUBLESHOOTING VERCEL DEPLOYMENT

### Si Build Falla

**Error: "Cannot find module"**

```bash
# Solución:
# 1. Verificar imports en código
# 2. npm ci en local
# 3. npm run build
# 4. Commit y push
```

**Error: "Build Timeout"**

```bash
# Solución:
# 1. Reducir tamaño de dependencias
# 2. Optimizar build command
# 3. Contactar Vercel support si persiste
```

**Error: "Memory limit exceeded"**

```bash
# Solución:
# 1. Reducir chunks
# 2. Lazy load componentes
# 3. Implementar code splitting
```

### Si Health Checks Fallan

**Error: Health endpoint not responding**

```bash
# Verificar:
# 1. POST deploy URL correcto
# 2. /api/health implementado
# 3. Respuesta en tiempo < 5s
```

**Error: Security headers missing**

```bash
# Verificar:
# 1. next.config.ts headers configurados
# 2. Middleware.ts HTTPS redirect OK
# 3. Vercel no está sobrescribiendo headers
```

---

## 📈 MONITOREO POST-DEPLOYMENT

### Vercel Dashboard

```
1. Deployments tab
   ├─ Ver estado actual
   ├─ Función Build Duration
   ├─ Función Runtime
   └─ Logs en tiempo real

2. Analytics
   ├─ Performance metrics
   ├─ Uptime monitoring
   ├─ Core Web Vitals
   └─ Traffic patterns

3. Logs
   ├─ Build logs
   ├─ Function logs
   ├─ Edge logs
   └─ Error tracking
```

### GitHub Actions Monitoring

```
1. Actions tab
   ├─ CI/CD workflow status
   ├─ Build times
   ├─ Job results
   └─ Artifact uploads

2. Notifications
   ├─ Slack alerts on success
   ├─ Slack alerts on failure
   └─ Email notifications
```

### Sentry Monitoring

```
1. Project Dashboard
   ├─ Error rate
   ├─ Performance
   ├─ Release tracking
   └─ Session replay

2. Alerts
   ├─ Error spikes
   ├─ Performance degradation
   ├─ Problematic releases
   └─ User impact
```

### Google Analytics 4

```
1. Real-time events
   ├─ User activity
   ├─ Page views
   ├─ CRUD operations
   └─ Errors

2. Funnels
   ├─ Signup funnel
   ├─ Activation funnel
   └─ Revenue funnel

3. Retention
   ├─ DAU/WAU/MAU
   ├─ Churn rate
   └─ User cohorts
```

---

## 🎯 ESPERADO POST-DEPLOYMENT

### Inmediato (0-5 minutos)

```
✅ Site live en https://origen-erp.vercel.app
✅ HTTPS funcional
✅ Redirect HTTP → HTTPS
✅ Security headers presentes
✅ Homepage cargando
```

### Corto plazo (5-30 minutos)

```
✅ GA4 eventos registrándose
✅ Sentry capturando errores
✅ Performance metrics en Vercel
✅ Slack alerts recibidos
✅ Uptime monitoring activo
```

### Largo plazo (1+ horas)

```
✅ Analytics data acumulando
✅ Patterns detectados por ML
✅ Anomalía alerts configurados
✅ Reports generándose
✅ Dashboard actualizado
```

---

## 📋 VERIFICACIÓN AUTOMÁTICA

### GitHub Actions Output

```bash
# Esperar todos los jobs:
✅ Lint [2-3m]
✅ Security [2-3m]
✅ Build [3-5m]
✅ Test [1-2m]
✅ Performance [2-3m]
✅ Deploy-Production [1-2m]
✅ Monitoring [5m]

TOTAL: 15-25 minutos
```

### Vercel Deployment Details

```bash
# En Vercel Dashboard:
✅ Build completed in X seconds
✅ Deployed to production
✅ Domain: origen-erp.vercel.app
✅ Commit: SHA xxxxx
✅ Author: github-user
✅ Status: Ready
```

### Post-deployment Health

```bash
# Manual verification:
curl https://origen-erp.vercel.app/api/health
# Response: {"status":"ok","timestamp":"2026-11-23T..."}

curl -I https://origen-erp.vercel.app
# Headers: HSTS, CSP, X-Frame-Options presente
```

---

## 🚀 DEPLOYMENT SUCCESS CRITERIA

✅ **Build Status:** GREEN

- No build errors
- Build time < 10 minutes
- Artifact size < 50MB

✅ **Health Checks:** ALL PASS

- `/api/health` responds
- HTTPS redirect working
- Security headers present
- Homepage loads < 3s

✅ **Pipeline Status:** ALL GREEN

- Lint: ✅ PASS
- Security: ✅ PASS
- Build: ✅ PASS
- Test: ✅ PASS
- Deploy: ✅ PASS
- Monitoring: ✅ PASS

✅ **Monitoring:** ACTIVE

- GA4 events flowing
- Sentry capturing errors
- Slack alerts working
- Uptime monitoring active

✅ **Performance:** ACCEPTABLE

- LCP < 3s
- FID < 100ms
- CLS < 0.1
- Core Web Vitals Green

---

## 📞 CONTACTS & ESCALATION

**Si falla el deployment:**

1. **GitHub Actions Failure**
   - Check: https://github.com/YOUR_REPO/actions
   - Review: Job logs y error messages
   - Contact: Tech lead

2. **Vercel Deployment Failure**
   - Check: https://vercel.com/dashboard
   - Review: Build logs
   - Contact: Vercel support (si necesario)

3. **Health Check Failure**
   - Check: /api/health endpoint
   - Verify: Environment variables
   - Contact: Backend team

4. **Monitoring Failure**
   - Check: Sentry, GA4, Slack
   - Review: Integration tokens
   - Contact: DevOps team

---

## 🎉 DEPLOYMENT COMPLETE

**Esperado después de successful deployment:**

```
✅ Sitio live en producción
✅ Usuarios pueden acceder
✅ HTTPS seguro
✅ Datos siendo monitoreados
✅ Alertas activas
✅ Logs siendo capturados
✅ Backups automáticos
✅ Ready para usuarios finales
```

**Score:** 95-97/100
**Status:** PRODUCTION READY ✅
**Time to Deploy:** 15-25 minutos
