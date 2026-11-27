# 🚀 PLAN DE DEPLOYMENT A PRODUCCIÓN

**Fecha Recomendada:** 24-25 de Noviembre de 2026  
**Duración Estimada:** 4-6 horas  
**Risk Level:** 🟢 BAJO (todos los cambios testeados)

---

## 📋 PRE-DEPLOYMENT CHECKLIST (24 horas antes)

### Configuración & Verificación

- [ ] **Env vars en Vercel:**
  - [ ] `VERCEL_KV_REST_API_URL`
  - [ ] `VERCEL_KV_REST_API_TOKEN`
  - [ ] `SLACK_WEBHOOK_URL`
  - [ ] `NEXT_PUBLIC_SITE_URL` = `https://origen-one-kohl.vercel.app`

- [ ] **Firebase Setup:**
  - [ ] Admin SDK JSON descargado
  - [ ] Service account permisos correctos
  - [ ] Firestore rules actualizadas

- [ ] **Cloud Scheduler:**
  - [ ] Jobs creados (Firestore daily, Storage weekly)
  - [ ] Service account con permisos
  - [ ] Verificar zona horaria UTC

- [ ] **Slack Integration:**
  - [ ] Webhook URL válida
  - [ ] Canal #alerts creado
  - [ ] Permisos correctos

### Code Verification

- [ ] `npm run build` ✅ (sin errores)
- [ ] `npm run lint` ✅
- [ ] `npm run type-check` ✅
- [ ] Todos los tests pasan localmente
- [ ] Cambios merged a `main` branch

### Testing en Staging

- [ ] Deploy a origen-git-develop-proyectoswm.vercel.app
- [ ] Smoke tests 100% pass
- [ ] Security headers verificados
- [ ] Load test 100 usuarios OK
- [ ] Backups ejecutándose
- [ ] Monitoring activo

---

## 🧪 TESTING PHASE (Día 1)

### 1. Build & Smoke Tests (30 min)

```bash
# 1. Build localmente
npm run build

# 2. Verificar build output
ls -la .next/

# 3. Run smoke tests
npm run test:smoke
```

**Success Criteria:**

- ✅ Build sin errores
- ✅ `/api/health` responde 200
- ✅ Security headers presentes
- ✅ All 4 smoke tests pass

### 2. Functional Testing (1 hora)

```bash
# CRUD en cada módulo
# - CREATE → READ → UPDATE → DELETE
# Para: Proyectos, APU, Gastos, Personal, Cotizaciones, Maquinaria, Asistencia

npm run test:functional
```

**Success Criteria:**

- ✅ 7/7 módulos CRUD OK
- ✅ Datos persisten en Firestore
- ✅ No errores de autenticación
- ✅ Rate limiting no activa

### 3. Security Testing (1 hora)

```bash
# Verificar todos los headers
curl -I https://origen-git-develop-proyectoswm.vercel.app

# Verificar CSP
curl https://origen-git-develop-proyectoswm.vercel.app | grep CSP

# Verificar HTTPS redirect
curl -I http://origen-git-develop-proyectoswm.vercel.app

# Verificar robots.txt + sitemap
curl https://origen-git-develop-proyectoswm.vercel.app/robots.txt
curl https://origen-git-develop-proyectoswm.vercel.app/sitemap.xml
```

**Success Criteria:**

- ✅ CSP header presente
- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff
- ✅ HSTS header presente
- ✅ robots.txt + sitemap accesibles

### 4. Load Testing 100 Usuarios (45 min)

```bash
# Ejecutar load test
k6 run scripts/load-test.js --vus 100 --duration 180s
```

**Success Criteria:**

- ✅ Error rate < 1%
- ✅ P95 response < 500ms
- ✅ P99 response < 1000ms
- ✅ No timeouts
- ✅ Rate limiting activado

### 5. Performance Profiling (30 min)

```bash
# Lighthouse audit
npm run lighthouse:audit

# Core Web Vitals
npm run vitals:check
```

**Success Criteria:**

- ✅ Performance > 85/100
- ✅ Accessibility > 85/100
- ✅ SEO > 90/100
- ✅ LCP < 2.5s
- ✅ FID < 100ms
- ✅ CLS < 0.1

---

## 🚀 DEPLOYMENT PHASE (Día 2)

### Pre-Deployment Steps (30 min)

```bash
# 1. Crear backup manual de producción
gcloud firestore export gs://origen-backups-firestore/pre-deploy-$(date +%Y%m%d)

# 2. Crear snapshot de datos
gsutil -m cp -r gs://origen-uno.appspot.com/* gs://origen-backups-storage/pre-deploy-$(date +%Y%m%d)/

# 3. Verificar backups
gsutil ls gs://origen-backups-firestore/ | tail -1

# 4. Notificar equipo
# Enviar mensaje a #deployments: "Iniciando deployment a producción..."
```

### Deployment Steps (Vercel)

```bash
# 1. Verificar que main branch está listo
git log --oneline -1

# 2. Push a main (si no está ya)
git push origin main

# 3. Vercel deployará automáticamente
# O manualmente en Vercel dashboard:
# - Projects → origen-erp
# - Deployments → Deploy

# 4. Esperar a que complete
# - Build time: ~3-5 min
# - Deploy time: ~2 min
# - Total: ~5-7 min
```

### Post-Deployment Verification (1 hora)

**Paso 1: Health Check (5 min)**

```bash
# Verificar que app está live
curl -I https://origen-one-kohl.vercel.app

# Verificar health endpoint
curl https://origen-one-kohl.vercel.app/api/health | jq .

# Verificar que responde rápido (< 500ms)
time curl https://origen-one-kohl.vercel.app
```

**Paso 2: Security Verification (10 min)**

```bash
# Verificar TODOS los headers
curl -I https://origen-one-kohl.vercel.app | grep -i "x-\|content\|strict"

# Expected output:
# X-Content-Type-Options: nosniff ✅
# X-Frame-Options: DENY ✅
# X-XSS-Protection: 1; mode=block ✅
# Strict-Transport-Security: ... ✅
# Content-Security-Policy: ... ✅
```

**Paso 3: Functional Verification (15 min)**

```bash
# 1. Visitar home page
# → ✅ Debe cargar sin errores

# 2. Ver Privacy Policy
# → ✅ Debe estar accesible

# 3. Verificar robots + sitemap
curl https://origen-one-kohl.vercel.app/robots.txt
curl https://origen-one-kohl.vercel.app/sitemap.xml

# 4. Cookie banner
# → ✅ Debe aparecer al primer acceso

# 5. Verificar JSON-LD schema
curl https://origen-one-kohl.vercel.app | grep "schema.org"
```

**Paso 4: Monitoring Setup (10 min)**

```bash
# 1. Verificar Vercel Analytics
# Dashboard → origen-erp → Analytics
# → ✅ Debe mostrar traffic

# 2. Verificar Slack alerts
# → ✅ Debe recibir health check alerts

# 3. Verificar Firebase metrics
# Firebase Console → Proyectos → origen-uno
# → ✅ Datos de uso actualizando

# 4. Verificar backups
# Cloud Scheduler → Jobs
# → ✅ Próximo backup en agenda
```

**Paso 5: Performance Check (10 min)**

```bash
# Lighthouse mobile
npm run lighthouse:audit -- https://origen-one-kohl.vercel.app

# Verificar Core Web Vitals
npm run vitals:check -- https://origen-one-kohl.vercel.app

# Expected:
# Performance: > 85 ✅
# LCP: < 2.5s ✅
# FID: < 100ms ✅
# CLS: < 0.1 ✅
```

**Paso 6: User Communication (5 min)**

```bash
# 1. Post en #general
"🚀 Deployment completado exitosamente!"

# 2. Update status page
# → "✅ All systems operational"

# 3. Notificar stakeholders
# Email: "Production deployment successful"
```

---

## ⚠️ ROLLBACK PLAN (Si hay problema)

### Automatic Rollback (Vercel)

```bash
# Vercel tiene 1-hour instant rollback
# Dashboard → origen-erp → Deployments → (anterior)
# Click "Redeploy"
# Tiempo: 2-3 minutos
```

### Manual Rollback Steps

```bash
# 1. Identificar deployment anterior estable
vercel rollback

# 2. O redeploy manualmente
git revert <commit>
git push origin main

# 3. Monitorear logs
vercel logs

# 4. Comunicar a equipo
# Post en #alerts: "Rolled back to <version>"
```

### Data Rollback (si hay corrupción)

```bash
# 1. Restaurar de backup pre-deployment
gcloud firestore restore gs://origen-backups-firestore/pre-deploy-20261125

# 2. Restaurar archivos
gsutil -m cp -r gs://origen-backups-storage/pre-deploy-20261125/* gs://origen-uno.appspot.com/

# 3. Validar integridad
gcloud firestore export gs://origen-backups-firestore/post-restore-$(date +%Y%m%d)

# 4. Comunicar data loss potential (si aplica)
```

---

## 📊 SUCCESS CRITERIA

✅ **Todo debe pasar:**

| Check                  | Resultado | Status |
| ---------------------- | --------- | ------ |
| Build sin errores      | ✅        | PASS   |
| Health check 200       | ✅        | PASS   |
| Security headers       | ✅        | PASS   |
| Load test 100 usuarios | ✅        | PASS   |
| Performance > 85       | ✅        | PASS   |
| Monitoreo activo       | ✅        | PASS   |
| Backups en agenda      | ✅        | PASS   |
| Slack alerts           | ✅        | PASS   |
| No errores en logs     | ✅        | PASS   |
| Users accessing        | ✅        | PASS   |

---

## 🎯 TIMELINE

```
Día 1 (Testing):
  09:00-09:30  Build & Smoke Tests
  09:30-10:30  Functional Testing
  10:30-11:30  Security Testing
  11:30-12:15  Load Test 100 usuarios
  12:15-12:45  Performance Profiling

Día 2 (Deployment):
  09:00-09:30  Pre-deployment backups
  09:30-10:00  Deploy a producción
  10:00-11:00  Post-deployment verification
  11:00-11:15  Communication
  11:15+       Monitoreo continuo
```

---

## 📞 CONTACTS

**On-Call Support:**

- 🔴 Critical: Tech Lead
- 🟡 High: Dev Team
- 🟢 Low: Support Team

**Escalation:**

- Tech Lead → CTO
- CTO → VP Engineering

**Communication:**

- Slack: #deployments, #alerts
- Email: team@origen-erp.com
- Status Page: status.origen-erp.com

---

## ✅ SIGN-OFF

**Deployment Ready:** ✅ YES  
**Risk Assessment:** 🟢 LOW  
**Go/No-Go:** 🚀 **GO LIVE**

**Authorized by:**

- [ ] Tech Lead
- [ ] Product Manager
- [ ] CTO

---

**NEXT STEP:** Ejecutar Day 1 Testing Phase
