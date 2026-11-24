# DESIGN SYSTEM TOKENS - ORIGEN ERP

## Sistema de Diseño Profesional para Producción Empresarial

**Documento:** Design Tokens & Guidelines  
**Válido para:** ConstructERP Guatemala · Versión 2.0+  
**Última actualización:** 2026-11-23

---

## 📐 ARQUITECTURA DE TOKENS

### 1. COLOR TOKENS

#### Primaria (Sky - Confianza, Profesionalismo)

```css
--color-primary-50: #f0f9ff;
--color-primary-100: #e0f2fe;
--color-primary-200: #bae6fd;
--color-primary-300: #7dd3fc;
--color-primary-400: #38bdf8;
--color-primary-500: #0ea5e9; /* PRIMARY - Acción principal */
--color-primary-600: #0284c7; /* Hover */
--color-primary-700: #0369a1; /* Active */
```

#### Secundaria (Amber - Acción, Energía)

```css
--color-accent-50: #fffbeb;
--color-accent-100: #fef3c7;
--color-accent-300: #fcd34d;
--color-accent-400: #fbbf24;
--color-accent-500: #f59e0b; /* ACCENT - Alertas, avisos */
--color-accent-600: #d97706; /* Hover */
--color-accent-700: #b45309; /* Active */
```

#### Estados Semánticos

```css
--color-success: #10b981; /* ✅ Completado, éxito */
--color-warning: #f59e0b; /* ⚠️ Pendiente, advertencia */
--color-error: #ef4444; /* ❌ Error, rechazo */
--color-info: #3b82f6; /* ℹ️ Información */
--color-pending: #f59e0b; /* ⏳ Pendiente (igual a warning) */
--color-rejected: #a855f7; /* 🚫 Rechazado */
```

#### Fondos & Capas

```css
--color-bg-primary: #0f172a; /* Deep black - Base */
--color-bg-secondary: #1e293b; /* Elevated - Cards, panels */
--color-bg-tertiary: #334155; /* Surface - Inputs, hover states */
--color-bg-hover: #475569; /* Interactive - Hover states */
--color-text-primary: #f8fafc; /* Texto principal blanco */
--color-text-secondary: rgba(248, 250, 252, 0.75); /* Texto secundario */
--color-text-muted: rgba(248, 250, 252, 0.5); /* Texto mutead */
--color-border-weak: rgba(255, 255, 255, 0.08); /* Border sutil */
--color-border-strong: rgba(255, 255, 255, 0.18); /* Border notable */
```

#### Glass & Transparency

```css
--color-glass-l1-bg: rgba(255, 255, 255, 0.05);
--color-glass-l1-border: rgba(255, 255, 255, 0.1);
--color-glass-l2-bg: rgba(255, 255, 255, 0.08);
--color-glass-l2-border: rgba(255, 255, 255, 0.15);
--color-glass-l3-bg: rgba(255, 255, 255, 0.12);
--color-glass-l3-border: rgba(255, 255, 255, 0.25);
```

---

### 2. TIPOGRAFÍA

#### Font Family

```css
--font-sans: 'Geist', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', sans-serif;
--font-mono: 'Geist Mono', 'ui-monospace', 'SFMono-Regular', monospace;
```

#### Escala de Tamaños

```css
/* Tokens */
--font-size-xs: 0.75rem; /* 12px - Labels, badges */
--font-size-sm: 0.875rem; /* 14px - Body text pequeño */
--font-size-base: 1rem; /* 16px - Body text base */
--font-size-lg: 1.125rem; /* 18px - Subtítulos */
--font-size-xl: 1.25rem; /* 20px - Headers pequeños */
--font-size-2xl: 1.5rem; /* 24px - Headers medios */
--font-size-3xl: 1.875rem; /* 30px - Headers grandes */
--font-size-4xl: 2.25rem; /* 36px - Page headers */

/* Mobile adjustments */
@media (max-width: 640px) {
  --font-size-3xl: 1.5rem; /* 24px en mobile */
  --font-size-4xl: 1.875rem; /* 30px en mobile */
}
```

#### Pesos

```css
--font-weight-regular: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
```

#### Line Height

```css
--line-height-tight: 1.25; /* Headings */
--line-height-normal: 1.5; /* Body text */
--line-height-relaxed: 1.75; /* Long-form content */
```

---

### 3. ESPACIADO

#### Scale (Mobile-First)

```css
--spacing-0: 0;
--spacing-1: 0.25rem; /* 4px */
--spacing-2: 0.5rem; /* 8px */
--spacing-3: 0.75rem; /* 12px */
--spacing-4: 1rem; /* 16px - BASE */
--spacing-5: 1.25rem; /* 20px */
--spacing-6: 1.5rem; /* 24px */
--spacing-8: 2rem; /* 32px */
--spacing-10: 2.5rem; /* 40px */
--spacing-12: 3rem; /* 48px */
--spacing-16: 4rem; /* 64px */
```

#### Responsive Padding

```css
/* Mobile */
--px-mobile: var(--spacing-4); /* 16px */
--py-mobile: var(--spacing-4); /* 16px */

/* Tablet */
--px-tablet: var(--spacing-6); /* 24px */
--py-tablet: var(--spacing-6); /* 24px */

/* Desktop */
--px-desktop: var(--spacing-8); /* 32px */
--py-desktop: var(--spacing-8); /* 32px */
```

#### Gaps (Contenedores)

```css
--gap-xs: var(--spacing-2); /* 8px - Elementos compactos */
--gap-sm: var(--spacing-3); /* 12px - Componentes pequeños */
--gap-md: var(--spacing-4); /* 16px - Gap por defecto */
--gap-lg: var(--spacing-6); /* 24px - Containers grandes */
--gap-xl: var(--spacing-8); /* 32px - Sections */
```

---

### 4. BORDER & RADIUS

#### Border Radius

```css
--radius-sm: 8px; /* Buttons, inputs */
--radius-md: 12px; /* Cards, panels */
--radius-lg: 16px; /* Dialogs, modals */
--radius-xl: 20px; /* Large components */
--radius-2xl: 24px; /* Extra large */
--radius-full: 9999px; /* Pills, avatars */
```

#### Border Width

```css
--border-width-hairline: 0.5px;
--border-width-thin: 1px; /* DEFAULT */
--border-width-thick: 2px;
```

---

### 5. SHADOWS

#### Elevation System

```css
/* Base shadows */
--shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.1);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.15);

/* Glass morphism */
--shadow-glass-sm: 0 4px 16px 0 rgba(0, 0, 0, 0.3);
--shadow-glass-md: 0 8px 32px 0 rgba(0, 0, 0, 0.35);
--shadow-glass-lg: 0 12px 40px 0 rgba(0, 0, 0, 0.4);

/* Glow effects */
--shadow-glow-brand: 0 0 24px rgba(245, 158, 11, 0.4);
--shadow-glow-primary: 0 0 20px rgba(56, 189, 248, 0.4);
--shadow-glow-success: 0 0 20px rgba(16, 185, 129, 0.3);
```

---

### 6. TRANSICIONES & ANIMACIONES

#### Timing

```css
--transition-fast: 150ms;
--transition-normal: 250ms;
--transition-slow: 350ms;
--transition-slower: 500ms;
```

#### Easing Functions

```css
--easing-fast: cubic-bezier(0.4, 0, 0.2, 1);
--easing-normal: cubic-bezier(0.4, 0, 0.2, 1);
--easing-bounce: cubic-bezier(0.68, -0.55, 0.27, 1.55);
```

#### Propiedades a Animar

```css
/* Comúnes */
--transition-properties: background-color, border-color, color, fill, stroke;

/* Hover effects */
transition: all var(--transition-normal) var(--easing-normal);

/* Focus states */
transition: outline-color var(--transition-fast);
```

---

## 🎯 COMPONENTE TOKENS

### KPI Cards

```css
/* Estados */
--kpi-neutral: {
  bg: rgba(56, 189, 248, 0.2);
  ring: rgba(56, 189, 248, 0.3);
  text: rgb(56, 189, 248);
};

--kpi-warning: {
  bg: rgba(245, 158, 11, 0.2);
  ring: rgba(245, 158, 11, 0.3);
  text: rgb(245, 158, 11);
};

--kpi-critical: {
  bg: rgba(239, 68, 68, 0.2);
  ring: rgba(239, 68, 68, 0.3);
  text: rgb(239, 68, 68);
};

--kpi-positive: {
  bg: rgba(16, 185, 129, 0.2);
  ring: rgba(16, 185, 129, 0.3);
  text: rgb(16, 185, 129);
};
```

### Buttons

```css
/* Primary */
--btn-primary-bg: #0ea5e9;
--btn-primary-bg-hover: #0284c7;
--btn-primary-bg-active: #0369a1;
--btn-primary-text: #0f172a;

/* Secondary */
--btn-secondary-bg: rgba(255, 255, 255, 0.05);
--btn-secondary-border: rgba(255, 255, 255, 0.1);
--btn-secondary-text: #f8fafc;

/* Ghost */
--btn-ghost-bg: transparent;
--btn-ghost-text: #cbd5e1;
--btn-ghost-text-hover: #f8fafc;

/* Danger */
--btn-danger-bg: #ef4444;
--btn-danger-bg-hover: #dc2626;
```

### Inputs & Forms

```css
--input-bg: rgba(255, 255, 255, 0.03);
--input-border: rgba(255, 255, 255, 0.1);
--input-border-focus: #0ea5e9;
--input-text: #f8fafc;
--input-placeholder: rgba(248, 250, 252, 0.5);
--input-error-border: #ef4444;
--input-error-bg: rgba(239, 68, 68, 0.1);
```

---

## 📱 BREAKPOINTS

```css
--breakpoint-xs: 320px; /* Extra small phones */
--breakpoint-sm: 640px; /* Small phones */
--breakpoint-md: 768px; /* Tablets */
--breakpoint-lg: 1024px; /* Desktops */
--breakpoint-xl: 1280px; /* Large desktops */
--breakpoint-2xl: 1536px; /* Extra large desktops */
```

### Responsive Strategy (Mobile-First)

```
xs: 320px   → Base styles
sm: 640px   → Small adjustments
md: 768px   → Tablet layout
lg: 1024px  → Desktop full
xl: 1280px  → Large screens
2xl: 1536px → Ultra-wide
```

---

## 🎨 PALETA POR USO

### Dashboard

```css
--kpi-budget-bg: rgba(56, 189, 248, 0.2); /* Sky */
--kpi-expense-bg: rgba(239, 68, 68, 0.2); /* Red */
--kpi-active-bg: rgba(245, 158, 11, 0.2); /* Amber */
--kpi-completed-bg: rgba(139, 92, 246, 0.2); /* Violet */
```

### Proyectos

```css
--status-planning: #f59e0b; /* Amber - Planificación */
--status-active: #0ea5e9; /* Sky - En ejecución */
--status-completed: #10b981; /* Emerald - Finalizado */
--status-archived: #64748b; /* Slate - Archivado */
```

### Presupuestos

```css
--budget-ok: #10b981; /* < 50% utilizado */
--budget-warning: #f59e0b; /* 50-75% utilizado */
--budget-critical: #ef4444; /* > 75% utilizado */
```

---

## 📋 APLICACIÓN EN CÓDIGO

### CSS Variables

```css
/* app/globals.css */
:root {
  /* Colors */
  --color-primary: #0ea5e9;
  --color-primary-dark: #0284c7;
  --color-accent: #f59e0b;

  /* Typography */
  --font-sans: 'Geist', system-ui;
  --font-size-base: 1rem;

  /* Spacing */
  --spacing-base: 1rem;

  /* Transitions */
  --transition-fast: 150ms;
}

/* Uso */
.btn-primary {
  background-color: var(--color-primary);
  font-family: var(--font-sans);
  transition: background-color var(--transition-fast);
}
```

### Tailwind Integration

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    colors: {
      primary: 'var(--color-primary)',
      accent: 'var(--color-accent)',
    },
    spacing: {
      base: 'var(--spacing-base)',
    },
    transitionDuration: {
      fast: 'var(--transition-fast)',
    },
  },
};
```

### Componentes

```typescript
// component.tsx
import { clsx } from 'clsx';

export function Button() {
  return (
    <button
      style={{
        '--bg-color': 'var(--color-primary)',
        '--text-color': 'white',
      } as React.CSSProperties}
      className={clsx(
        'px-[var(--spacing-4)]',
        'py-[var(--spacing-3)]',
        'bg-[var(--bg-color)]',
        'text-[var(--text-color)]',
        'transition-[background-color] duration-[var(--transition-fast)]'
      )}
    >
      Click me
    </button>
  );
}
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [ ] Variables CSS definidas en `app/globals.css`
- [ ] tailwind.config.js referencias a variables
- [ ] Componentes actualizados para usar tokens
- [ ] Testing en mobile, tablet, desktop
- [ ] Accesibilidad validada (color contrast, etc.)
- [ ] Documentación del Design System

---

## 📞 REFERENCIAS & HERRAMIENTAS

- [CSS Custom Properties (Variables)](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [Tailwind Configuration](https://tailwindcss.com/docs/configuration)
- [Design Tokens Community](https://www.designtokens.org/)
- [Sistema de Tokens W3C](https://github.com/design-tokens/community-group)

---

**Válido desde:** 2026-11-23  
**Próxima revisión:** 2027-Q1
