/**
 * ✅ K6 LOAD TESTING SCRIPT
 *
 * Uso:
 *   k6 run scripts/load-test.js --vus 100 --duration 60s
 *   k6 run scripts/load-test.js --vus 1000 --duration 300s
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ============================================================
// CUSTOM METRICS
// ============================================================

const errorRate = new Rate('errors');
const healthCheckDuration = new Trend('health_check_duration');
const apiDuration = new Trend('api_duration');

// ============================================================
// TEST CONFIGURATION
// ============================================================

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp up a 20 usuarios
    { duration: '1m30s', target: 100 }, // Ramp up a 100
    { duration: '2m', target: 100 }, // Stay at 100
    { duration: '30s', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% de requests < 500ms
    errors: ['rate<0.1'], // Error rate < 10%
    health_check_duration: ['p(95)<200'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function randomUserId() {
  return `user-${Math.floor(Math.random() * 10000)}`;
}

function randomProjectId() {
  return `proj-${Math.floor(Math.random() * 1000)}`;
}

// ============================================================
// MAIN TEST FUNCTION
// ============================================================

export default function () {
  // ============================================================
  // HEALTH CHECK
  // ============================================================
  group('Health Check', function () {
    const startTime = Date.now();
    const res = http.get(`${BASE_URL}/api/health`, {
      tags: { name: 'Health Check' },
    });

    healthCheckDuration.add(Date.now() - startTime);

    check(res, {
      'health status is 200': (r) => r.status === 200,
      'health response time < 200ms': (r) => r.timings.duration < 200,
      'health check ok': (r) => r.body && r.body.includes('healthy'),
    }) || errorRate.add(1);

    sleep(0.5);
  });

  // ============================================================
  // SIMULAR USUARIO NAVEGANDO
  // ============================================================
  group('User Navigation', function () {
    const userId = randomUserId();
    const projectId = randomProjectId();

    // 1. Acceder a homepage
    const homeRes = http.get(`${BASE_URL}/`, {
      tags: { name: 'Home Page' },
    });
    check(homeRes, {
      'home status is 200': (r) => r.status === 200,
      'home has title': (r) => r.body && r.body.includes('ConstructERP'),
    }) || errorRate.add(1);

    sleep(1);

    // 2. Ver lista de proyectos
    const projectsRes = http.get(`${BASE_URL}/proyectos`, {
      tags: { name: 'Projects List' },
    });
    check(projectsRes, {
      'projects status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    }) || errorRate.add(1);

    sleep(2);

    // 3. Ver APU
    const apuRes = http.get(`${BASE_URL}/apu`, {
      tags: { name: 'APU List' },
    });
    check(apuRes, {
      'apu status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    }) || errorRate.add(1);

    sleep(1);

    // 4. Ver Gastos
    const gastosRes = http.get(`${BASE_URL}/gastos`, {
      tags: { name: 'Gastos List' },
    });
    check(gastosRes, {
      'gastos status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    }) || errorRate.add(1);

    sleep(1);
  });

  // ============================================================
  // API STRESS TEST
  // ============================================================
  group('API Stress', function () {
    // Simular múltiples requests rápidos
    for (let i = 0; i < 5; i++) {
      const startTime = Date.now();
      const res = http.get(`${BASE_URL}/api/health`);
      apiDuration.add(Date.now() - startTime);

      check(res, {
        'api status is 200': (r) => r.status === 200,
        'api response time < 500ms': (r) => r.timings.duration < 500,
      }) || errorRate.add(1);
    }

    sleep(1);
  });

  // ============================================================
  // SECURITY HEADERS VALIDATION
  // ============================================================
  group('Security Headers', function () {
    const res = http.head(`${BASE_URL}/`, {
      tags: { name: 'Security Headers' },
    });

    check(res, {
      'has CSP header': (r) => r.headers['Content-Security-Policy'] !== undefined,
      'has X-Frame-Options': (r) => r.headers['X-Frame-Options'] === 'DENY',
      'has X-Content-Type-Options': (r) => r.headers['X-Content-Type-Options'] === 'nosniff',
      'has HSTS header': (r) => r.headers['Strict-Transport-Security'] !== undefined,
    }) || errorRate.add(1);

    sleep(0.5);
  });

  // ============================================================
  // SIMULAR NAVEGACIÓN REAL
  // ============================================================
  sleep(Math.random() * 3 + 1); // Think time 1-4 segundos
}

// ============================================================
// TEARDOWN
// ============================================================

export function teardown(data) {
  console.log('✅ Load test completed');
  console.log(`Error rate: ${errorRate.value}%`);
}

/*
COMANDOS DE EJECUCIÓN:

# Test local (1 usuario)
k6 run scripts/load-test.js

# Test 100 usuarios x 2 minutos
k6 run scripts/load-test.js \
  --vus 100 \
  --duration 120s

# Test 1000 usuarios x 5 minutos (stress test)
k6 run scripts/load-test.js \
  --vus 1000 \
  --duration 300s

# Test con URL personalizada
k6 run scripts/load-test.js \
  --vus 100 \
  --duration 120s \
  -e BASE_URL=https://staging.origen-erp.com

# Test con resultados en archivo
k6 run scripts/load-test.js \
  -o csv=results.csv \
  --vus 100 \
  --duration 120s
*/
