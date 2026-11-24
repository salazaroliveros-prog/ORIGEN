# GUÍA DE IMPLEMENTACIÓN - REFINAMIENTO UI/UX PROFESIONAL
## ConstructERP Guatemala - Fase de Producción Empresarial

**Fecha:** Noviembre 2026  
**Versión:** 1.0  
**Estado:** Listo para Desarrollo  

---

## 🎯 INICIO RÁPIDO

### Semana 1: Componentes Core (Prioridad Crítica)

```bash
# 1. Crear rama feature
git checkout -b feature/ui-professional-refinement

# 2. Crear componentes mejorados
# Ya incluidos en este proyecto:
# - components/DashboardEnhanced.tsx ✅
# - components/ProjectSelectorEnhanced.tsx ✅
# - components/TabsGrouped.tsx ✅
```

---

## 📝 TAREAS POR PRIORIDAD

### FASE 1: DASHBOARD MEJORADO (3-4 horas)

#### Tarea 1.1: Reemplazar DashboardOverview.tsx

**Archivo:** `components/DashboardOverview.tsx`

**Cambios:**
1. Renombrar export de `DashboardOverview` a `DashboardEnhancedLegacy`
2. Importar y usar `DashboardEnhanced` en lugar

```typescript
// components/MainApp.tsx (actual)
import { DashboardOverview } from '@/components/DashboardOverview';

// Cambiar a:
import { DashboardEnhanced as DashboardOverview } from '@/components/DashboardEnhanced';
```

**QA Checklist:**
- [ ] Empty state renderiza correctamente (sin light theme)
- [ ] KPI cards muestran colores diferenciados por tipo
- [ ] Charts renderean con unidades GTQ
- [ ] Responsive OK en mobile/tablet/desktop
- [ ] Lighthouse Performance ≥ 90
- [ ] Accesibilidad WCAG 2.1 AA

---

#### Tarea 1.2: Integrar Project Selector mejorado

**Archivo:** `components/ui/Sidebar.tsx`

**Búscar:**
```typescript
{projects.length > 0 && (
  <div className="border-b border-white/10 px-4 py-3">
    <label>...</label>
    <select ...>
```

**Reemplazar con:**
```typescript
import { ProjectSelectorEnhanced } from '@/components/ProjectSelectorEnhanced';

{projects.length > 0 && (
  <div className="border-b border-white/10 px-4 py-3">
    <ProjectSelectorEnhanced
      projects={projects}
      activeProjectId={activeProjectId}
      onSelectProject={onSelectProject}
    />
  </div>
)}
```

**QA Checklist:**
- [ ] Selector renderiza con preview de proyecto
- [ ] Progress bar actualiza correctamente
- [ ] Dropdown abre/cierra sin errores
- [ ] Seleccionar proyecto navega correctamente

---

### FASE 2: NAVEGACIÓN MEJORADA (2-3 horas)

#### Tarea 2.1: Refactorizar Sidebar con Tabs agrupadas

**Archivo:** `components/ui/Sidebar.tsx`

**Cambios principales:**

```typescript
import { TabsGrouped } from '@/components/TabsGrouped';

// Reemplazar la sección de navegación:
// Antes:
<nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
  {tabs.map(tab => (...))}
</nav>

// Después:
<nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
  <TabsGrouped
    tabs={tabs.map(t => ({
      ...t,
      icon: t.icon, // ya está disponible
      group: getTabGroup(t.id), // crear helper
    }))}
    activeTabId={activeTab}
    onSelectTab={onSelectTab}
  />
</nav>

// Helper function:
const getTabGroup = (tabId: string): 'operativo' | 'financiero' | 'personal' | 'admin' => {
  const groups: Record<string, any> = {
    operativo: ['dashboard', 'proyectos', 'cronograma_gantt', 'maquinaria'],
    financiero: ['apu_presupuestos', 'cotizaciones', 'gastos', 'fel_invoices', 'reportes'],
    personal: ['personal', 'planillas'],
    admin: ['inventario', 'gmail', 'ai', 'equipo'],
  };
  
  return Object.keys(groups).find(group => 
    groups[group].includes(tabId)
  ) as any ?? 'operativo';
};
```

**QA Checklist:**
- [ ] Tabs agrupadas se renderean correctamente
- [ ] Headers de grupo (Operativo, Financiero, etc.) visibles
- [ ] Badges de "Firma" y "Avance" con colores correctos
- [ ] Responsive OK en mobile/tablet
- [ ] Navegación funciona como antes

---

#### Tarea 2.2: Actualizar Mobile Navigation

**Archivo:** `components/ui/MobileSheet.tsx` o `components/ui/BottomNav.tsx`

**Cambios:**
1. Mostrar más opciones en bottom nav (6-8 en lugar de 4-5)
2. Implementar selector dinámico según permisos
3. Añadir indicador visual de sección activa

```typescript
// Bottom nav mejorada
const BOTTOM_NAV_ITEMS = [
  { id: 'dashboard', label: 'Tablero', icon: LayoutDashboard, group: 'operativo' },
  { id: 'proyectos', label: 'Obras', icon: HardHat, group: 'operativo' },
  { id: 'cronograma_gantt', label: 'Cronograma', icon: CalendarDays, group: 'operativo' },
  { id: 'personal', label: 'Personal', icon: Users, group: 'personal' },
  { id: 'gastos', label: 'Gastos', icon: Receipt, group: 'financiero' },
  { id: 'reportes', label: 'Reportes', icon: PieChart, group: 'financiero' },
];
```

---

### FASE 3: COMPONENTES AUXILIARES (2-3 horas)

#### Tarea 3.1: Crear KPICard Mejorado

**Archivo:** `components/ui/KPICard.tsx` (nuevo)

```typescript
'use client';

import React from 'react';

interface KPICardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral' | 'warning' | 'critical';
  icon: React.ReactNode;
  trend?: number;
  onClick?: () => void;
}

export function KPICard({
  title,
  value,
  change,
  changeType,
  icon,
  trend,
  onClick,
}: KPICardProps) {
  const getStyles = () => {
    switch (changeType) {
      case 'positive':
        return 'bg-emerald-500/20 ring-emerald-500/30';
      case 'negative':
        return 'bg-red-500/20 ring-red-500/30';
      case 'warning':
        return 'bg-amber-500/20 ring-amber-500/30';
      case 'critical':
        return 'bg-red-600/20 ring-red-600/30';
      default:
        return 'bg-sky-500/20 ring-sky-500/30';
    }
  };

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border border-white/10 p-5 backdrop-blur-lg transition-all duration-300 hover:border-white/20 hover:shadow-xl ${getStyles()} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      role="region"
      aria-label={`${title}: ${value}`}
    >
      {/* Content */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {title}
          </p>
          <p className="text-2xl font-bold text-white sm:text-3xl">{value}</p>
          <p className="text-xs text-slate-400">{change}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/[0.08]">
          {icon}
        </div>
      </div>
    </div>
  );
}
```

**Integrar en DashboardEnhanced:**
```typescript
import { KPICard } from '@/components/ui/KPICard';

// Reemplazar las divs de KPI con:
<KPICard {...card} key={idx} />
```

---

#### Tarea 3.2: Crear ResponsiveGrid Helper

**Archivo:** `components/ui/ResponsiveGrid.tsx` (nuevo)

```typescript
interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
}

export function ResponsiveGrid({
  children,
  cols = { mobile: 1, tablet: 2, desktop: 4 },
  gap = 'md',
}: ResponsiveGridProps) {
  const gapMap = {
    sm: 'gap-3',
    md: 'gap-4 md:gap-5 lg:gap-6',
    lg: 'gap-6 md:gap-8 lg:gap-10',
  };

  return (
    <div
      className={`grid ${gapMap[gap]} grid-cols-${cols.mobile} md:grid-cols-${cols.tablet} lg:grid-cols-${cols.desktop}`}
    >
      {children}
    </div>
  );
}
```

**Nota:** Tailwind no soporta clases dinámicas. Usar inline styles o crear clase util:

```typescript
// Mejor alternativa:
const gridColsMap = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
};

className={`grid ${gapMap[gap]} ${gridColsMap[cols.mobile]} md:${gridColsMap[cols.tablet]} lg:${gridColsMap[cols.desktop]}`}
```

---

### FASE 4: TESTING & QA (4-5 horas)

#### Tarea 4.1: Validación Visual

**Checklist:**

```
Mobile (375px - 430px):
- [ ] Dashboard renderiza correctamente
- [ ] KPI cards stack en 2x2 o 2x1
- [ ] Charts legibles sin scroll horizontal
- [ ] Bottom nav visible y funcional
- [ ] Touch targets ≥ 44px

Tablet (768px - 1024px):
- [ ] Dashboard renderiza en 2 columnas
- [ ] Sidebar colapsable
- [ ] Charts side-by-side
- [ ] Proyecto selector visible

Desktop (1024px+):
- [ ] Dashboard 4 columnas
- [ ] Sidebar fijo 260px
- [ ] Content expandido
- [ ] Charts optimizadas
```

---

#### Tarea 4.2: Accesibilidad (WCAG 2.1 AA)

**Validar:**
```bash
# En DevTools > Lighthouse
npm run build
npx lighthouse http://localhost:3000 --view

# Target: Accessibility ≥ 95
```

**Checklist:**
- [ ] Color contrast ≥ 4.5:1 (normal), 3:1 (large)
- [ ] Touch targets ≥ 44x44px
- [ ] Focus visible en todos los elementos interactivos
- [ ] Labels para inputs
- [ ] ARIA labels apropiados
- [ ] Keyboard navigation funcional

---

#### Tarea 4.3: Performance

**Validar:**
```bash
npm run build:analyze
# Verificar bundle size

# Target: Lighthouse Performance ≥ 90
```

**Optimizaciones:**
- [ ] Componentes memorizados (useMemo, React.memo)
- [ ] Lazy loading de charts
- [ ] Image optimization (Next/Image)
- [ ] Code splitting automático

---

#### Tarea 4.4: Testing E2E

**Crear archivo:** `e2e/dashboard-enhancement.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test('dashboard enhanced renders correctly', async ({ page }) => {
  await page.goto('/');
  
  // Verificar KPI cards
  const kpiCards = page.locator('[role="region"]');
  expect(await kpiCards.count()).toBe(4);
  
  // Verificar charts
  expect(page.locator('canvas')).toBeTruthy();
  
  // Verificar selector de proyecto
  const projectSelector = page.locator('[role="button"]').first();
  await projectSelector.click();
  expect(page.locator('[role="listbox"]')).toBeTruthy();
});

test('dashboard responsive on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');
  
  // Verificar que mobile layout se activa
  const bottomNav = page.locator('[role="tablist"]');
  expect(bottomNav).toBeTruthy();
});
```

**Ejecutar:**
```bash
npm run test:e2e
```

---

## 🎨 PALETA DE COLORES - IMPLEMENTACIÓN

### Actualizar tailwind.config.js

```javascript
// Cambiar brand primario
colors: {
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    400: '#38bdf8',
    500: '#0ea5e9',  // PRIMARY - Sky
    600: '#0284c7',
  },
}

// Agregar estados semánticos
state: {
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  pending: '#f59e0b',
  rejected: '#a855f7',
}
```

### Aplicar cambios globales

**Archivo:** `app/globals.css`

```css
/* Variables CSS para fácil customización */
:root {
  --color-primary: #0ea5e9;
  --color-primary-dark: #0284c7;
  --color-accent: #f59e0b;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-pending: #f59e0b;
  --color-rejected: #a855f7;
}
```

---

## 📊 MÉTRICAS DE ÉXITO

### Antes vs Después

| Métrica | Antes | Después | Meta |
|---------|-------|---------|------|
| Lighthouse Performance | 85 | 92+ | ✅ |
| Lighthouse Accessibility | 78 | 95+ | ✅ |
| Component consistency | 65% | 100% | ✅ |
| Mobile usability | 75% | 98%+ | ✅ |
| Touch target adequacy | 70% | 100% | ✅ |

---

## 🚀 DEPLOYMENT CHECKLIST

### Pre-deployment

- [ ] Todos los tests pasan (unit + E2E)
- [ ] Lighthouse score ≥ 90 en Performance, ≥ 95 en Accessibility
- [ ] Code review completado
- [ ] Cambios en production branch

### Deployment stages

```bash
# 1. Dev
git push origin feature/ui-professional-refinement

# 2. Staging
# Merge a develop branch
# Testing en staging

# 3. Production
# Merge a main branch
# Deploy a Vercel/producción

# Monitoreo post-deploy
# - Verificar errores en Sentry
# - Monitorear Core Web Vitals
# - Recolectar feedback de usuarios
```

---

## 📞 TROUBLESHOOTING

### Problema: Dashboard no renderiza
**Solución:** Verificar imports, asegurar componentes en lugar correcto

### Problema: Tailwind classes no aplican
**Solución:** Ejecutar `npm run build` o verificar content paths en tailwind.config.js

### Problema: Mobile layout roto
**Solución:** Verificar breakpoints en tailwind.config.js, ajustar media queries

### Problema: Charts no renderean
**Solución:** Verificar que ResponsiveContainer tenga parent con altura definida

---

## 📚 REFERENCIAS

- [Tailwind CSS Documentation](https://tailwindcss.com)
- [Recharts Documentation](https://recharts.org)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Lucide React Icons](https://lucide.dev)

---

## 📋 SEGUIMIENTO

**Responsable:** [Tu nombre]  
**Fecha inicio:** [Fecha]  
**Fecha finalización estimada:** [+2-3 semanas]  

**Estado actual:** ✅ Documentación Lista → 🔄 Desarrollo Fase 1

---

**Última actualización:** 2026-11-23  
**Versión:** 1.0
