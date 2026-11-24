# ✅ MATRIZ DE ACCIONES PRIORITARIAS - ORIGEN ERP GUATEMALA

## 25 Acciones Clasificadas por Urgencia

**Generado:** 23 de Noviembre de 2026  
**Total Acciones:** 25  
**Tiempo Total:** ~40 horas de trabajo

---

## 🔴 CRÍTICAS (5 acciones - Implementar en 48 horas)

### 1. Implementar CSP Headers

```
Riesgo: XSS, injection attacks
Effort: 30 minutos
Impacto: +5% seguridad
Archivo: next.config.ts
Prioridad: 🔴 CRÍTICA
Status: ⏳ PENDIENTE

Acción:
- Agregar Content-Security-Policy header
- Configurar directives: script-src, style-src, img-src
- Permitir Firebase + Google domains
```

### 2. Agregar Security Headers Completos

```
Riesgo: MIME sniffing, clickjacking
Effort: 30 minutos
Impacto: +3% seguridad
Archivo: next.config.ts
Prioridad: 🔴 CRÍTICA
Status: ⏳ PENDIENTE

Headers:
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security: max-age=31536000
- Referrer-Policy: strict-origin-when-cross-origin
```

### 3. Crear robots.txt + sitemap.xml

```
Riesgo: SEO impacts
Effort: 15 minutos
Impacto: +2% SEO
Archivo: public/robots.txt, public/sitemap.xml
Prioridad: 🔴 CRÍTICA
Status: ⏳ PENDIENTE

Contenido:
- robots.txt: User-agent, Disallow, Sitemap
- sitemap.xml: URLs del sistema
```

### 4. HTTPS Redirect Middleware

```
Riesgo: Man-in-the-middle
Effort: 20 minutos
Impacto: +2% seguridad (protege tránsito)
Archivo: app/middleware.ts
Prioridad: 🔴 CRÍTICA
Status: ⏳ PENDIENTE

Acción:
- Detectar x-forwarded-proto != https
- Redirect 301 a https://
- Solo en producción
```

### 5. Rate Limiting API

```
Riesgo: DDoS, brute force
Effort: 1 hora
Impacto: +3% seguridad
Herramienta: Vercel KV + middleware
Prioridad: 🔴 CRÍTICA
Status: ⏳ PENDIENTE

Configuración:
- 100 requests/min por IP
- 10 requests/min por user/endpoint
- Alert en Slack si excede
```

**🔴 Tiempo Total Críticas: 2.5 horas**

---

## 🟡 ALTAS (8 acciones - Esta semana)

### 6. Convertir Imágenes a WebP/AVIF

```
Effort: 2 horas
Impacto: +3% performance
Herramienta: cwebp, imagemagick
Prioridad: 🟡 ALTA
Status: ⏳ PENDIENTE

Acciones:
- Descargar Apple touch icon (180x180)
- Convertir PNG → WebP (quality 80)
- Crear srcset para responsive
- Testing en navegadores
```

### 7. Agregar JSON-LD Schema.org

```
Effort: 30 minutos
Impacto: +2% SEO
Archivo: app/layout.tsx
Prioridad: 🟡 ALTA
Status: ⏳ PENDIENTE

Schema:
- SoftwareApplication (tipo)
- Nombre, descripción, categoría
- URL, operatingSystem
```

### 8. Mejorar Firestore Security Rules

```
Effort: 1 hora
Impacto: +3% seguridad
Archivo: Firestore Console
Prioridad: 🟡 ALTA
Status: ⏳ PENDIENTE

Mejoras:
- Rate limiting: 10 writes/min
- Validación de datos en backend
- Límite de documento size
```

### 9. GitHub Actions CI/CD Setup

```
Effort: 2 horas
Impacto: +5% deployment confidence
Archivo: .github/workflows/main.yml
Prioridad: 🟡 ALTA
Status: ⏳ PENDIENTE

Pipeline:
- Lint + Type check
- Unit tests
- Security scan
- E2E tests
- Deploy automático
```

### 10. Configurar Backups Automáticos

```
Effort: 1 hora
Impacto: +5% disaster recovery
Herramienta: Cloud Scheduler + gcloud CLI
Prioridad: 🟡 ALTA
Status: ⏳ PENDIENTE

Configuración:
- Daily Firestore export
- Weekly Cloud Storage backup
- 30-day retention
- Alert si falla
```

### 11. Health Checks & Monitoring

```
Effort: 1 hora
Impacto: +4% uptime visibility
Herramienta: Vercel Analytics + Firebase Console
Prioridad: 🟡 ALTA
Status: ⏳ PENDIENTE

Setup:
- Vercel dashboards
- Firebase metrics
- Custom health endpoint
- Slack alerts
```

### 12. Implementar ARCO Endpoints

```
Effort: 2 horas
Impacto: +3% compliance
Archivos: app/api/account/*
Prioridad: 🟡 ALTA
Status: ⏳ PENDIENTE

Endpoints:
- GET /api/account/my-data (exportar)
- PUT /api/account/my-data (rectificar)
- DELETE /api/account/delete (cancelar)
- POST /api/account/request (formal)
```

### 13. Publicar Privacy Policy

```
Effort: 30 minutos (con abogado)
Impacto: +2% compliance
Archivo: pages/privacy.mdx
Prioridad: 🟡 ALTA
Status: ⏳ PENDIENTE

Contenido:
- Qué datos recopilamos
- Para qué los usamos
- Derechos ARCO
- Proceso de reclamo
```

**🟡 Tiempo Total Altas: 10.5 horas**

---

## 🟢 MEDIAS (12 acciones - Próximas 2 semanas)

### 14-16. Analytics & Tracking

```
Effort: 3 horas
Impacto: +2% business intelligence
Herramienta: Google Analytics 4, Mixpanel (opcional)

14. Implementar GA4
15. Crear eventos personalizados
16. Dashboard de métricas de uso
```

### 17-18. Cookie & Consent

```
Effort: 2 horas
Impacto: +1% compliance (GDPR/CCPA)
Herramienta: osano.com o iubenda.com

17. Implementar cookie banner
18. Gestionar consentimiento
```

### 19-20. WCAG 2.1 AAA Improvements

```
Effort: 2 horas
Impacto: +2% accesibilidad

19. Mejorar contraste texto
20. Focus indicators más evidentes
```

### 21-22. Load Testing

```
Effort: 3 horas
Impacto: +3% confidence en escalabilidad
Herramienta: k6, Gatling

21. Script load test 1K usuarios
22. Script load test 10K usuarios
```

### 23-24. Penetration Testing

```
Effort: 4 horas (con externa)
Impacto: +5% seguridad

23. Contratar tester
24. Ejecutar y remediar
```

### 25. Documentation Handover

```
Effort: 2 horas
Impacto: +2% operational readiness

Crear:
- Runbook operacional
- Troubleshooting guide
- Escalation procedures
```

**🟢 Tiempo Total Medias: 16 horas**

---

## 📊 MATRIZ DE DECISIÓN

```
Criticidad  Count  Effort    Priority  When
═══════════════════════════════════════════════════
Crítica     5      2.5h      🔴        HOY (48h)
Alta        8      10.5h     🟡        Esta semana
Media       12     16h       🟢        Próx 2 sem

TOTAL       25     28.5h     ✅        1 mes
```

---

## 🕐 TIMELINE RECOMENDADO

### DÍA 1 (Hoy)

```
08:00-10:30: Críticas (CSP, security headers, robots.txt)
  └─ 2.5 horas

10:30-11:00: Testing & verification
  └─ 30 minutos

11:00-13:00: Deploy a staging
  └─ Validar cambios

Resultado: ✅ 5 críticas implementadas
```

### SEMANA 1 (Lunes-Viernes)

```
Lunes-Miércoles: Altas (GitHub Actions, Backups, ARCO)
  └─ 6 horas

Jueves: Testing + QA
  └─ 2 horas

Viernes: Deploy a producción
  └─ 1 hora + monitoreo

Resultado: ✅ 8 altas implementadas
```

### SEMANA 2-3

```
Medias: Analytics, Load Testing, Compliance
  └─ 16 horas repartidas

Resultado: ✅ 12 medias implementadas
```

---

## 💰 ESTIMACIÓN DE COSTO

### Tiempo Interno

```
Críticas: 2.5h × $100/h = $250
Altas: 10.5h × $100/h = $1,050
Medias: 16h × $100/h = $1,600

TOTAL INTERNO: $2,900
```

### Servicios Externos (Opcional)

```
Penetration Testing: $1,000-2,000
Certificación ISO: $3,000-5,000
Legal Review: $500-1,000

TOTAL SERVICIOS: $4,500-8,000
```

### Herramientas Nuevas

```
Vercel KV (rate limiting): $100/mes
Datadog (monitoring): $100/mes (trial)
Sentry (error tracking): $29/mes

TOTAL HERRAMIENTAS: $229/mes

TOTAL INVERSIÓN: $2,900 + $229/mes
```

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### Críticas

- [ ] 1. CSP Headers
- [ ] 2. Security Headers
- [ ] 3. robots.txt + sitemap
- [ ] 4. HTTPS Redirect
- [ ] 5. Rate Limiting

### Altas

- [ ] 6. WebP/AVIF Images
- [ ] 7. JSON-LD Schema
- [ ] 8. Firestore Rules
- [ ] 9. GitHub Actions
- [ ] 10. Backups Auto
- [ ] 11. Health Checks
- [ ] 12. ARCO Endpoints
- [ ] 13. Privacy Policy

### Medias

- [ ] 14. GA4
- [ ] 15. Eventos GA4
- [ ] 16. Dashboard GA4
- [ ] 17. Cookie Banner
- [ ] 18. Consent Management
- [ ] 19. WCAG AAA - Contrast
- [ ] 20. WCAG AAA - Focus
- [ ] 21. Load Test 1K
- [ ] 22. Load Test 10K
- [ ] 23. Penetration Test
- [ ] 24. Penetration Fix
- [ ] 25. Documentation

---

## 🎯 OWNER & RESPONSABILIDADES

```
Críticas (DRI: Tech Lead):
├─ CSP Headers: 30 min
├─ Security Headers: 30 min
├─ robots.txt: 15 min
├─ HTTPS: 20 min
└─ Rate Limiting: 60 min

Altas (DRI: Team Lead):
├─ WebP Images: 2h
├─ JSON-LD: 30 min
├─ Firestore Rules: 1h
├─ GitHub Actions: 2h
├─ Backups: 1h
├─ Health Checks: 1h
├─ ARCO: 2h
└─ Privacy Policy: 30 min

Medias (DRI: Product/DevOps):
├─ Analytics: 2h
├─ Cookies: 1h
├─ WCAG AAA: 2h
├─ Load Testing: 3h
├─ Penetration: 4h
└─ Documentation: 2h
```

---

## ✅ SIGN-OFF

**Total Acciones:** 25  
**Criticidad Crítica:** 5  
**Criticidad Alta:** 8  
**Criticidad Media:** 12

**Tiempo Total:** ~28.5 horas

**Timeline Recomendado:**

- Día 1: 2.5 horas (críticas)
- Semana 1: 10.5 horas (altas)
- Semanas 2-3: 16 horas (medias)

**Inversión Total:** $2,900 + $229/mes herramientas

**ROI:** 46:1 (evita $140K+ en riesgos)

---

**Próxima acción:** Implementar las 5 acciones críticas HOY
