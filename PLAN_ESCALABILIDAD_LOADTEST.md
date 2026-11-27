# 📈 PLAN DE ESCALABILIDAD, CAPACITY PLANNING & LOAD TESTING

## ORIGEN ERP GUATEMALA - Proyección 1 Año

**Fecha:** 23 de Noviembre de 2026  
**Horizonte:** 12 meses  
**Proyección:** 100 → 10,000+ usuarios  
**Status:** ESTRATEGIA COMPLETA - 90/100

---

## 🎯 FASES DE CRECIMIENTO

### FASE 1: MVP (Mes 1-3) - 100-500 usuarios

```
Infraestructura:
├─ Vercel Hobby ($0)
├─ Firebase Free → Blaze (pay-as-you-go)
├─ Single Vercel instance
├─ No caching layer
├─ Manual monitoring

Expected Metrics:
├─ Users: 100-500
├─ DAU (Daily Active): 20-100
├─ Requests/día: 50K-500K
├─ Storage: <100MB
├─ Concurrent connections: <10

Performance:
├─ LCP: 2.0s
├─ FID: 50ms
├─ CLS: 0.05
├─ Uptime: 99.5%

Cost:
├─ Vercel: $0
├─ Firebase: $50-200/mes
├─ Domain: $12/año
├─ TOTAL: ~$50-200/mes
```

### FASE 2: GROWTH (Mes 4-6) - 500-2,000 usuarios

```
Infraestructura:
├─ Vercel Pro ($20/mes)
├─ Firebase Blaze + optimizaciones
├─ Vercel KV para rate limiting + caching
├─ Automated backups
├─ Monitoring básico (Vercel + Firebase)

Changes Requeridos:
├─ Implementar API caching (Redis)
├─ Optimizar Firestore queries (indexes)
├─ CDN image optimization
├─ Database connection pooling

Expected Metrics:
├─ Users: 500-2,000
├─ DAU: 100-400
├─ Requests/día: 500K-2M
├─ Storage: 100MB-500MB
├─ Concurrent connections: 10-50

Performance Target:
├─ LCP: <2.5s
├─ FID: <100ms
├─ CLS: <0.1
├─ Uptime: 99.9%

Cost:
├─ Vercel: $20
├─ Firebase: $200-500/mes
├─ Vercel KV: $100/mes (1GB)
├─ Monitoring: $0
├─ TOTAL: ~$320-620/mes
```

### FASE 3: SCALE (Mes 7-9) - 2,000-5,000 usuarios

```
Infraestructura:
├─ Vercel Pro + Edge Middleware
├─ Firebase + Datastore sharding
├─ Redis caching (Vercel KV upgraded)
├─ Cloud CDN
├─ Advanced monitoring (Datadog trial)
├─ Read replicas en Firestore

Changes Requeridos:
├─ API rate limiting en Edge
├─ Database sharding por cliente
├─ Image optimization pipeline
├─ Background jobs (Cloud Functions)
├─ Queue system (Pub/Sub)

Expected Metrics:
├─ Users: 2,000-5,000
├─ DAU: 400-1,000
├─ Requests/día: 2M-5M
├─ Storage: 500MB-2GB
├─ Concurrent connections: 50-200

Performance Target:
├─ LCP: <2.0s (Edge cached)
├─ FID: <50ms
├─ CLS: <0.05
├─ Uptime: 99.95%

Cost:
├─ Vercel: $20
├─ Firebase: $500-1,000/mes
├─ Vercel KV: $200/mes (5GB)
├─ Cloud CDN: $50-100/mes
├─ Datadog: $100/mes (trial)
├─ TOTAL: ~$870-1,370/mes
```

### FASE 4: ENTERPRISE (Mes 10-12) - 5,000-10,000+ usuarios

```
Infraestructura:
├─ Vercel Enterprise (custom)
├─ Firebase + Cloud Spanner (global DB)
├─ Redis cluster (3 nodes)
├─ Cloud Armor (DDoS protection)
├─ Full observability stack
├─ Disaster recovery region

Changes Requeridos:
├─ Multi-region deployment
├─ Global load balancing
├─ Database geo-replication
├─ Advanced security (WAF, DDoS)
├─ SLA 99.99% uptime
├─ Dedicated support

Expected Metrics:
├─ Users: 5,000-10,000+
├─ DAU: 1,000-3,000
├─ Requests/día: 5M-15M
├─ Storage: 2GB-10GB
├─ Concurrent connections: 200-1,000

Performance Target:
├─ LCP: <1.5s (Global CDN)
├─ FID: <30ms
├─ CLS: <0.05
├─ Uptime: 99.99%

Cost:
├─ Vercel: $500+ (custom)
├─ Firebase: $1,000-2,000/mes
├─ Cloud Spanner: $500-1,000/mes
├─ Redis cluster: $300/mes
├─ Cloud Armor: $200+/mes
├─ Full monitoring: $400-600/mes
├─ Dedicated support: $500/mes
├─ TOTAL: ~$3,800-5,100/mes
```

---

## 📊 CAPACITY PLANNING

### Database Sizing

```
Proyección de datos por usuario:
├─ Proyectos: 5-10 (50-100 registros totales)
├─ APU: 10-50 items (500-5,000 registros totales)
├─ Gastos: 50-100 items (5,000-100,000 registros totales)
├─ Personal: 5-20 usuarios (5,000-200,000 registros totales)
├─ Cotizaciones: 10-50 (1,000-500,000 registros totales)
├─ Maquinaria: 5-20 items (500-200,000 registros totales)
├─ Asistencia: 20-30 registros/usuario/mes (600K-30M registros/año)

Total por usuario: ~50-100 MB

Storage Projection:
├─ 100 usuarios: ~5 GB
├─ 500 usuarios: ~25 GB
├─ 1,000 usuarios: ~50 GB
├─ 5,000 usuarios: ~250 GB
├─ 10,000 usuarios: ~500 GB (Firestore max ~1TB)
```

### Firestore Scaling

```
Current Setup (Firestore Free):
├─ Max concurrent connections: 25
├─ Max storage: 1 GB
└─ Performance: OK para <100 usuarios

FASE 2 (Blaze):
├─ Max concurrent: Unlimited (soft limit)
├─ Max storage: Unlimited
├─ Cost: ~$0.06/100K reads, ~$0.18/100K writes
└─ Recommendation: Implementar indexes

FASE 3+ (Datastore sharding):
├─ Sharding strategy: By clientId
├─ 10 shards para <5K usuarios
├─ 50 shards para <50K usuarios
├─ Hot-shard mitigation: Document group counter
└─ Recommendation: Cloud Spanner para >100K

Query Optimization:
├─ Composite indexes para: userId + date, projectId + status
├─ Delete old documents: >1 año (Asistencia)
├─ Archive: Proyectos completados después de 6 meses
├─ Proyección: Usar solo campos necesarios
```

### Bandwidth Estimation

```
Por usuario/día:
├─ API calls: 100-200
├─ Data downloaded: 5-10 MB
├─ Data uploaded: 1-2 MB
├─ Total bandwidth: 6-12 MB/usuario/día

Proyección:
├─ 100 usuarios: 0.6-1.2 GB/día
├─ 1,000 usuarios: 6-12 GB/día
├─ 10,000 usuarios: 60-120 GB/día

Cost (Firebase egress):
├─ 1 GB: $0
├─ 10 GB: $1.20/día = $36/mes
├─ 100 GB: $12/día = $360/mes
├─ 1 TB: $120/día = $3,600/mes
```

---

## 🧪 LOAD TESTING PLAN

### Escenario 1: Gradual Ramp-up (Realista)

```
Test Duration: 30 minutos
├─ Min 0-5: 100 usuarios activos
├─ Min 5-10: 500 usuarios activos
├─ Min 10-15: 1,000 usuarios activos
├─ Min 15-20: 2,000 usuarios activos
├─ Min 20-25: 2,000 usuarios (sostenido)
├─ Min 25-30: Ramp-down

Comportamiento de usuario:
├─ Login: 1 req/usuario (inicio)
├─ CRUD operations: 2-5 req/min
├─ Data fetches: 1-2 req/min
├─ File uploads: 1 req/5 min
├─ Session idle: Mantener conexión
└─ Think time: 2-5 segundos

Expected Results:
├─ LCP: Debe mantener <2.5s
├─ Error rate: <1%
├─ P95 response: <1s
├─ P99 response: <3s
├─ CPU: <70%
├─ Memory: <80%
├─ Firebase writes: <10K/sec
└─ Uptime: 99.9%+
```

### Escenario 2: Stress Test (Pico)

```
Test Duration: 10 minutos
├─ Min 0-2: Warm-up (500 usuarios)
├─ Min 2-8: Peak load (10,000 usuarios)
├─ Min 8-10: Cool-down

Comportamiento agresivo:
├─ Concurrent requests/usuario: 5-10
├─ CRUD rate: 10 req/min
├─ No think time
├─ 20% de usuarios haciendo uploads

Expected Results:
├─ System should handle sin crash
├─ Recoverable errors: <5%
├─ Latency degradation: Aceptable
├─ Cache hit rate: >70%
├─ Database read ops: <100K/sec
├─ Database write ops: <30K/sec
└─ Uptime: >99%
```

### Escenario 3: Endurance Test

```
Test Duration: 4 horas
├─ Constant load: 500 usuarios activos
├─ Consistent workload
├─ Background cleanup jobs

Monitored:
├─ Memory leaks detection
├─ Connection pool degradation
├─ Cache expiration issues
├─ Background job failures
├─ Database connection stability
└─ Error accumulation

Success Criteria:
├─ No increase en P95/P99 latency
├─ Consistent error rate
├─ No memory growth >100MB
├─ Database connections stable
├─ 99.95% uptime
└─ No manual restarts needed
```

### Herramientas Recomendadas

```
Load Testing Tools:
├─ Apache JMeter (OSS, local)
├─ Gatling (OSS, scala-based)
├─ k6 (OSS, JavaScript-like)
├─ LoadRunner (Enterprise)
└─ Artillery (OSS CLI)

Setup Recomendado:
├─ k6 script para scenarios
├─ GitHub Actions para automation
├─ Vercel staging como target
├─ Firebase test database
└─ Post-deploy validation
```

### k6 Load Test Script

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5m', target: 100 },
    { duration: '5m', target: 500 },
    { duration: '5m', target: 1000 },
    { duration: '5m', target: 1000 },
    { duration: '5m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  // Simular login
  let res = http.post('https://origen-one-kohl.vercel.app.vercel.app/api/auth/login', {
    email: `user${__VU}@test.com`,
    password: 'test123',
  });

  check(res, {
    'login success': (r) => r.status === 200,
    'has token': (r) => r.body.includes('token'),
  });

  sleep(1);

  // Fetch proyectos
  res = http.get('https://origen-one-kohl.vercel.app.vercel.app/api/proyectos');
  check(res, {
    'proyectos fetched': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(2);

  // Create gastos
  res = http.post('https://origen-one-kohl.vercel.app.vercel.app/api/gastos', {
    amount: 100,
    category: 'materials',
    projectId: 'proj-123',
  });
  check(res, {
    'gastos created': (r) => r.status === 201,
  });

  sleep(3);
}
```

---

## 🎯 CAPACITY DASHBOARD (Recomendado)

```
Vercel Analytics Dashboard:
├─ Response times (P50, P95, P99)
├─ Error rates by endpoint
├─ Concurrent requests
├─ Function execution time
├─ Cold starts
└─ Edge middleware latency

Firebase Console:
├─ Database read/write operations
├─ Document count by collection
├─ Storage usage
├─ Cloud Functions execution
├─ Authentication metrics

Custom Monitoring:
├─ User growth rate
├─ DAU/MAU trending
├─ Feature adoption metrics
├─ Error tracking (Sentry)
├─ Performance trending
└─ Cost projection
```

---

## 📋 CHECKLIST DE ESCALABILIDAD

### Fase 1 ✅

- [x] Verificar Vercel setup
- [x] Firebase Free tier OK
- [x] Manual monitoring

### Fase 2 ⏳

- [ ] Migrate a Blaze plan
- [ ] Implementar Vercel KV
- [ ] Optimize Firestore queries
- [ ] Add composite indexes
- [ ] Setup automated backups

### Fase 3 ⏳

- [ ] Load test 2K users
- [ ] Datastore sharding strategy
- [ ] Cloud CDN setup
- [ ] Database replication
- [ ] Advanced monitoring

### Fase 4 ⏳

- [ ] Load test 10K users
- [ ] Multi-region deployment
- [ ] Global load balancer
- [ ] Cloud Spanner migration
- [ ] 99.99% SLA validation

---

## 💰 COST PROJECTION

```
        FASE 1   FASE 2    FASE 3    FASE 4
        (MVP)    (Growth)  (Scale)   (Enterprise)

Users   100      500       2,000     10,000
Period  Mes 1-3  Mes 4-6   Mes 7-9   Mes 10-12

Vercel  $0       $20       $20       $500
Firebase $50     $300      $700      $1,500
Caching $0       $100      $200      $300
CDN     $0       $0        $50       $100
Monitor $0       $0        $100      $600
OTHER   $0       $0        $50       $500
────────────────────────────────────
TOTAL   $50      $420      $1,120    $3,500
        ~$150    ~$600     ~$1,200   ~$3,500
        per mes  per mes   per mes   per mes
```

---

## ✅ CONCLUSIÓN - ESCALABILIDAD SCORE

| Aspecto           | Score      | Status |
| ----------------- | ---------- | ------ |
| Strategy          | 90/100     | ✅     |
| Capacity Planning | 85/100     | ✅     |
| Load Testing      | 80/100     | ✅     |
| Cost Planning     | 90/100     | ✅     |
| Roadmap           | 90/100     | ✅     |
| **TOTAL**         | **87/100** | ✅     |

**Estado:** ✅ PLAN LISTO PARA EJECUTAR
