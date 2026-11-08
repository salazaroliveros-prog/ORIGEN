---
contentType: Reference
title: Complete file index and directory structure — ORIGEN ERP
---

# Complete file index and directory structure — ORIGEN ERP

Last updated: January 15, 2024  
Total files: 50-plus components plus utilities, tests, and documentation

## Project root structure

```
origen_app_erp/
├── ORIGEN/
│   ├── components/               [10 main components]
│   ├── lib/                      [Utilities, hooks, tests]
│   ├── app/                      [Next.js app directory]
│   ├── public/                   [Static assets]
│   ├── Documentation/            [Setup and guides]
│   ├── package.json              [Dependencies]
│   ├── tsconfig.json             [TypeScript config]
│   ├── next.config.js            [Next.js config]
│   ├── Dockerfile                [Docker configuration]
│   └── compose.yaml              [Docker Compose]
```

## Main components (10 files)

### 1. Authentication

**File:** `components/auth/AuthContainer.tsx` (17 KB)  
**Status:** Complete  
**Features:**

- Rate limiting (5 attempts)
- Password visibility toggle
- Attack tracking
- Form validation

**Usage:**

```typescript
import { AuthContainer } from '@/components/auth/AuthContainer';
<AuthContainer />
```

### 2. Dashboard overview

**File:** `components/DashboardOverview.tsx` (15 KB)  
**Status:** Complete  
**Features:**

- Loading skeleton
- KPI memoization
- Chart legend repositioning
- Empty state UI
- Real-time calculations

**Usage:**

```typescript
import { DashboardOverview } from '@/components/DashboardOverview';
<DashboardOverview projectId={projectId} />
```
