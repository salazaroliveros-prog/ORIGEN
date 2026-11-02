# 🛠️ PLAN DETALLADO DE MEJORAS - CONSTRUCTERP GUATEMALA

**Objetivo:** Llevar el sistema de 88.5% a 100% en 12 semanas  
**Versión:** v1.1 → v2.0  
**Última Actualización:** 2025-05-16

---

## FASE 1: CRÍTICO (SEMANA 1-2)

### Task 1.1: Rate Limiting Implementation

**Descripción:** Agregar rate limiting en API + Firestore  
**Tiempo:** 2 días  
**Prioridad:** 🔴 CRÍTICO  
**Asignee:** Backend Developer

**Steps:**

```bash
# 1. Instalar dependencias
npm install @upstash/ratelimit @upstash/redis

# 2. Crear archivo de configuración
touch lib/rateLimit.ts
```

**Código:**

```typescript
// lib/rateLimit.ts

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

// 100 requests por minuto por usuario
const apiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  analytics: true,
});

// 10 requests por minuto para Firestore writes
const firestoreLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
});

export async function rateLimit(key: string, limit = apiLimiter) {
  const result = await limit.limit(key);
  if (!result.success) {
    throw new Error(`Rate limit exceeded. Retry after ${result.resetAfter}ms`);
  }
  return result;
}
```

**Integración:**

```typescript
// app/api/gemini/route.ts

import { rateLimit } from '@/lib/rateLimit';

export async function POST(request: Request) {
  try {
    const userId = await getAuthUser();

    // Aplicar rate limiting
    await rateLimit(`api:${userId}`);

    const body = await request.json();
    // ... rest of code
  } catch (error) {
    if (error.message.includes('Rate limit')) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }
    // ... other errors
  }
}
```

**Variables de Entorno:**

```bash
# .env.local
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

**Testing:**

```typescript
// lib/rateLimit.test.ts

import { describe, it, expect } from 'vitest';
import { rateLimit } from './rateLimit';

describe('Rate Limiting', () => {
  it('should allow requests under limit', async () => {
    const result = await rateLimit('test:user:1');
    expect(result.success).toBe(true);
  });

  it('should block requests over limit', async () => {
    // Simulate 101 requests
    for (let i = 0; i < 100; i++) {
      await rateLimit('test:user:2');
    }

    expect(() => rateLimit('test:user:2')).rejects.toThrow('Rate limit exceeded');
  });
});
```

**Checklist:**

- [ ] Instalar Upstash Redis
- [ ] Crear lib/rateLimit.ts
- [ ] Integrar en todos los endpoints
- [ ] Crear tests
- [ ] Configurar variables de entorno
- [ ] Deploy a staging
- [ ] Load testing

---

### Task 1.2: Input Validation

**Descripción:** Validar entrada de datos en todos los endpoints  
**Tiempo:** 3 días  
**Prioridad:** 🔴 CRÍTICO  
**Asignee:** Backend Developer

**Código:**

```typescript
// lib/validation.ts

import { z } from 'zod';

// Project Validation
export const projectCreateSchema = z.object({
  name: z.string().min(3, 'Mínimo 3 caracteres').max(100),
  client: z.string().min(2).max(100),
  location: z.string().min(5).max(200),
  budgetTotal: z.number().positive('Presupuesto debe ser > 0'),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  status: z.enum(['En Ejecución', 'Planificación', 'Finalizado', 'Suspendido']),
});

// APU Validation
export const apuCreateSchema = z.object({
  code: z.string().regex(/^[A-Z0-9]{3,10}$/, 'Código inválido'),
  description: z.string().min(5).max(500),
  quantity: z.number().positive(),
  unit: z.enum(['m2', 'm3', 'kg', 'ml', 'unidad', 'dia']),
  materialCost: z.number().nonnegative(),
  laborCost: z.number().nonnegative(),
  equipmentCost: z.number().nonnegative(),
});

// Expense Validation
export const expenseCreateSchema = z.object({
  projectId: z.string().uuid(),
  date: z.string().datetime(),
  category: z.enum([
    'Materiales (Cementos, Hierro)',
    'Mano de Obra',
    'Maquinaria y Combustible',
    'Permisos & Licencias',
    'Imprevistos',
  ]),
  description: z.string().min(5).max(500),
  amount: z.number().positive().max(999999),
  currency: z.enum(['GTQ', 'USD']),
  paymentMethod: z.enum(['Pendiente', 'Efectivo', 'Cheque', 'Transferencia']),
});

// Generic validator
export function validate<T>(data: unknown, schema: z.ZodSchema<T>): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formatted = error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      }));
      throw new Error(JSON.stringify(formatted));
    }
    throw error;
  }
}

// Sanitize HTML
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .slice(0, 1000); // Max 1000 chars
}
```

**Uso en Endpoints:**

```typescript
// app/api/projects/create.ts

import { validate, projectCreateSchema } from '@/lib/validation';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = validate(body, projectCreateSchema);

    // Crear proyecto con datos validados
    const project = await createProject(validated);

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
```

**Testing:**

```typescript
// lib/validation.test.ts

describe('Validation Schemas', () => {
  it('should validate correct project data', () => {
    const data = {
      name: 'Proyecto Test',
      client: 'Cliente Test',
      location: 'Zona 1, Guatemala',
      budgetTotal: 50000,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(),
      status: 'En Ejecución',
    };

    expect(() => validate(data, projectCreateSchema)).not.toThrow();
  });

  it('should reject invalid project data', () => {
    const data = {
      name: 'AB', // Too short
      budgetTotal: -100, // Negative
    };

    expect(() => validate(data, projectCreateSchema)).toThrow();
  });
});
```

---

### Task 1.3: Error Boundaries

**Descripción:** Implementar error boundaries en componentes críticos  
**Tiempo:** 1 día  
**Prioridad:** 🔴 CRÍTICO

**Código:**

```typescript
// app/error-boundary.tsx

"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md">
        <div className="text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Algo salió mal
          </h1>
          <p className="text-slate-600 mb-6">
            {error.message || "Error inesperado. Por favor, intenta de nuevo."}
          </p>

          <button
            onClick={() => reset()}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            Intentar de nuevo
          </button>

          <button
            onClick={() => window.location.href = "/"}
            className="w-full mt-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition font-semibold"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    </div>
  );
}
```

```typescript
// components/MainApp.tsx (MODIFY)

"use client";

import { Suspense } from "react";
import ErrorBoundary from "@/app/error-boundary";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function MainApp() {
  return (
    <ErrorBoundary error={new Error()} reset={() => {}}>
      <Suspense fallback={<LoadingSpinner />}>
        <div className="app-container">
          {/* Main content */}
        </div>
      </Suspense>
    </ErrorBoundary>
  );
}
```

---

### Task 1.4: Complete E2E Tests

**Descripción:** Implementar suite completa de tests E2E  
**Tiempo:** 4 días  
**Prioridad:** 🔴 CRÍTICO

**Código:**

```typescript
// e2e/auth-flow.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should login successfully', async ({ page }) => {
    await page.click('[data-testid="login-link"]');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPass123!');
    await page.click('[data-testid="login-button"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid=user-menu]')).toBeVisible();
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.click('[data-testid="login-link"]');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');

    await expect(page.locator('[data-testid=error-message]')).toContainText('Invalid credentials');
  });
});
```

```typescript
// e2e/crud-flow.spec.ts

test.describe('CRUD Operations', () => {
  test('should create, read, update, delete project', async ({ page }) => {
    // LOGIN
    await login(page, 'admin@test.com', 'admin123');

    // CREATE
    await page.click('[data-testid="create-project-btn"]');
    await page.fill('[data-testid="project-name"]', 'New Test Project');
    await page.fill('[data-testid="client-name"]', 'Client Name');
    await page.fill('[data-testid="budget"]', '100000');
    await page.click('[data-testid="save-project-btn"]');

    await expect(page.locator('text=New Test Project')).toBeVisible();

    // READ
    const projectCard = page.locator('[data-testid="project-card"]:has-text("New Test Project")');
    await expect(projectCard).toBeVisible();

    // UPDATE
    await projectCard.click();
    await page.fill('[data-testid="budget"]', '150000');
    await page.click('[data-testid="save-changes-btn"]');

    // DELETE
    await page.click('[data-testid="delete-project-btn"]');
    await page.click('[data-testid="confirm-delete-btn"]');

    await expect(page.locator('text=New Test Project')).not.toBeVisible();
  });
});
```

---

### Task 1.5: API Documentation (OpenAPI)

**Descripción:** Generar documentación API con Swagger  
**Tiempo:** 3 días  
**Prioridad:** 🔴 CRÍTICO

**Código:**

```bash
# Instalar
npm install swagger-jsdoc swagger-ui-express @types/swagger-jsdoc @types/swagger-ui-express
```

```typescript
// lib/swagger.ts

import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ConstructERP API',
      version: '1.0.0',
      description: 'API Documentation for ConstructERP Guatemala',
      contact: {
        name: 'Support',
        email: 'support@constructerp.com',
      },
    },
    servers: [
      {
        url: 'https://origen-one-kohl.vercel.app',
        description: 'Production',
      },
      {
        url: 'http://localhost:3000',
        description: 'Development',
      },
    ],
    components: {
      securitySchemes: {
        firebase: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ firebase: [] }],
  },
  apis: ['./app/api/**/*.ts'],
};

export const specs = swaggerJsdoc(options);
```

```typescript
// app/api/docs/route.ts

import { NextResponse } from 'next/server';
import { specs } from '@/lib/swagger';

export async function GET() {
  return NextResponse.json(specs);
}
```

```typescript
// app/api/docs/[[...params]]/route.ts

import swaggerUi from 'swagger-ui-express';
import { specs } from '@/lib/swagger';

export async function GET() {
  // Retornar HTML con Swagger UI
  return new Response(
    swaggerUi.generateHTML(specs, {
      customCss: '.swagger-ui { background: #fafafa; }',
    }),
    { headers: { 'Content-Type': 'text/html' } }
  );
}
```

```typescript
// app/api/gemini/generate-apu/route.ts

/**
 * @swagger
 * /api/gemini/generate-apu:
 *   post:
 *     summary: Generate APU from description
 *     tags:
 *       - AI
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *                 example: "Fundición losa concreto 4000 PSI"
 *     responses:
 *       200:
 *         description: APU generated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */

export async function POST(request: Request) {
  // Implementación
}
```

URL documentación: `https://origen-one-kohl.vercel.app/api/docs`

---

## FASE 2: ALTO (SEMANA 3-4)

### Task 2.1: Field-Level Security Rules

```firestore
// firestore.rules (MODIFY)

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Salarios solo accesibles por owner/admin
    match /payroll/{document=**} {
      allow read: if request.auth.uid == resource.data.createdBy
                    || hasRole(['owner', 'admin']);
      allow write: if request.auth.uid == resource.data.createdBy
                    || hasRole(['owner', 'admin']);

      // Validaciones
      allow create: if validatePayroll(request.resource.data);
      allow update: if validatePayroll(request.resource.data);
    }

    // Gastos con restricciones
    match /expenses/{document=**} {
      allow read: if hasProjectAccess(resource.data.projectId);
      allow create: if validateExpense(request.resource.data)
                     && hasRole(['finance', 'admin', 'owner']);
      allow update: if request.resource.data.amount == resource.data.amount
                     || hasRole(['admin', 'owner']);
    }

    // Helper functions
    function hasRole(roles) {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in roles;
    }

    function validatePayroll(data) {
      return data.monthlySalary > 0
            && data.monthlySalary < 100000
            && data.createdBy != null;
    }

    function validateExpense(data) {
      return data.amount > 0
            && data.amount < 1000000
            && data.date != null
            && data.projectId != null;
    }

    function hasProjectAccess(projectId) {
      let project = get(/databases/$(database)/documents/projects/$(projectId)).data;
      return request.auth.uid == project.ownerId
          || request.auth.uid in project.collaborators
          || hasRole(['admin']);
    }
  }
}
```

---

### Task 2.2: Logging Estructurado

```typescript
// lib/logger.ts

import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'constructerp' },
  transports: [
    // Error logs
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    // Combined logs
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    })
  );
}

// Audit logging
export function logAudit(
  action: string,
  userId: string,
  resourceType: string,
  resourceId: string,
  changes?: any
) {
  logger.info('AUDIT', {
    action,
    userId,
    resourceType,
    resourceId,
    changes,
    timestamp: new Date().toISOString(),
  });
}

// Error logging
export function logError(message: string, error: Error, context?: any) {
  logger.error(message, {
    error: {
      message: error.message,
      stack: error.stack,
    },
    context,
  });
}

export { logger };
```

---

### Task 2.3: Monitoring Setup (Sentry)

```bash
npm install @sentry/nextjs
```

```typescript
// sentry.server.config.ts

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  integrations: [
    new Sentry.Integrations.OnUncaughtException(),
    new Sentry.Integrations.OnUnhandledRejection(),
  ],
  beforeSend(event) {
    // No enviar eventos de desarrollo
    if (process.env.NODE_ENV === 'development') {
      return null;
    }
    return event;
  },
});
```

```typescript
// app/layout.tsx (MODIFY)

import * as Sentry from "@sentry/nextjs";

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width" />
      </head>
      <body>
        <Sentry.Profiler name="RootLayout">
          {children}
        </Sentry.Profiler>
      </body>
    </html>
  );
}
```

---

## FASE 3: MEDIO (SEMANA 5-7)

### Task 3.1: Caching Strategy

```typescript
// lib/cache.ts

import { unstable_cache } from 'next/cache';
import { firebaseService } from './firebaseService';

// Cache proyectos por 1 hora
export const getProjectsCached = unstable_cache(
  async (userId: string) => {
    return await firebaseService.getProjectsByUser(userId);
  },
  ['projects'],
  { revalidate: 3600, tags: ['projects'] }
);

// Cache gastos por 30 minutos
export const getExpensesCached = unstable_cache(
  async (projectId: string) => {
    return await firebaseService.getProjectExpenses(projectId);
  },
  ['expenses'],
  { revalidate: 1800, tags: ['expenses'] }
);

// Cache APUs por 24 horas
export const getAPUsCached = unstable_cache(
  async () => {
    return await firebaseService.getAllAPUs();
  },
  ['apus'],
  { revalidate: 86400, tags: ['apus'] }
);
```

---

### Task 3.2: Performance Optimization

```typescript
// next.config.ts (MODIFY)

const nextConfig: NextConfig = {
  // ... existing config

  // Headers para caching
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=600',
          },
        ],
      },
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Rewrites para CDN
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/images/:path*',
          destination: 'https://cdn.example.com/images/:path*',
        },
      ],
    };
  },
};
```

---

### Task 3.3: Component Refactoring

Descomponer `GanttSchedule.tsx`:

```typescript
// components/GanttSchedule/GanttSchedule.tsx

import GanttTaskList from "./GanttTaskList";
import GanttTimelineBar from "./GanttTimelineBar";
import GanttMilestones from "./GanttMilestones";
import { useGanttData } from "./useGanttData";

export default function GanttSchedule({ projectId }: Props) {
  const { tasks, milestones, loading } = useGanttData(projectId);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="gantt-container">
      <GanttMilestones milestones={milestones} />
      <div className="gantt-content">
        <GanttTaskList tasks={tasks} />
        <GanttTimelineBar tasks={tasks} />
      </div>
    </div>
  );
}
```

---

## FASE 4: DOCUMENTACIÓN (PARALELO)

### Task 4.1: Create Contributing Guide

```markdown
# CONTRIBUTING.md

## Development Setup

1. Clone repository
2. Install dependencies: `npm install`
3. Create `.env.local` with Firebase config
4. Run dev server: `npm run dev`

## Code Style

- Use TypeScript strict mode
- Follow ESLint rules
- Format with Prettier
- Write tests for new features

## PR Process

1. Create feature branch: `git checkout -b feature/description`
2. Make changes and tests
3. Submit PR with description
4. Wait for review and CI pass

## Testing Requirements

- Unit tests: 80% coverage minimum
- E2E tests for user-facing features
- Run locally: `npm test`

## Commit Messages

Format: `type(scope): description`

- feat: new feature
- fix: bug fix
- docs: documentation
- test: testing code
- refactor: code refactoring
```

---

### Task 4.2: Installation Guide

```markdown
# INSTALLATION.md

## Prerequisites

- Node.js 18+
- Firebase project
- Git

## Setup Steps

### 1. Clone Repository

\`\`\`bash
git clone https://github.com/salazaroliveros-prog/ORIGEN.git
cd ORIGEN
\`\`\`

### 2. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 3. Configure Firebase

Create \`.env.local\`:
\`\`\`
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
...
\`\`\`

### 4. Run Development Server

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000)

### 5. Setup Firestore

- Visit Firebase Console
- Create Firestore database
- Deploy rules: `firebase deploy --only firestore:rules`
```

---

## TRACKING & METRICS

### Success Criteria

```
✅ v1.1 Release (6 semanas):
  • Rate limiting: 100 requests/min
  • Test coverage: 95%+
  • API docs: 100% endpoints
  • Security issues: 0 críticos
  • Performance: <2.5s LCP

✅ v1.2 Release (10 semanas):
  • Caching: 50% cache hit rate
  • Monitoring: <1% error rate
  • Documentation: 90% complete
  • Accesibilidad: AAA level
  • Performance: <1.5s LCP
```

### Metrics Dashboard

```
Crear dashboard en Vercel Analytics:
  • Page load time
  • Error rate
  • API latency
  • Cache hit rate
  • User session duration

Crear dashboard en Sentry:
  • Crash rate
  • Error trends
  • Performance issues
  • Release health
```

---

## ESTIMACIÓN FINAL

```
Fase 1 (Crítico):    8-9 días
Fase 2 (Alto):       8-11 días
Fase 3 (Medio):      14-19 días
Fase 4 (Documentación): 10-15 días
─────────────────────────────
Total:               40-54 días (~8 semanas)

Recursos:
  • 2 desarrolladores full-time
  • 1 QA engineer
  • 1 DevOps engineer (part-time)

Costo estimado: $15,000-25,000
```

---

## ROADMAP POSTERIOR

```
v1.3 (Noviembre 2025):
  ✓ Mobile app MVP
  ✓ Offline support
  ✓ Advanced reporting

v2.0 (Q1 2026):
  ✓ Multi-tenant platform
  ✓ Enterprise SSO
  ✓ Advanced analytics

v3.0 (Q3 2026):
  ✓ AI-powered forecasting
  ✓ Integration marketplace
  ✓ Mobile apps (iOS/Android)
```

---

**Generado:** 2025-05-16  
**Versión:** 1.0  
**Próxima Revisión:** Al completar Fase 1
