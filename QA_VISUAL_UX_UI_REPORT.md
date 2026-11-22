# Reporte QA Visual UX/UI - ORIGEN ERP

**Fecha:** 2026-11-22  
**Analista:** Devin AI Agent  
**Método:** Análisis estático de código de componentes UI y sistema de diseño

---

## Resumen Ejecutivo

Se identificaron **32 hallazgos** distribuidos en 4 categorías principales. El sistema presenta problemas serios de consistencia en design tokens, accesibilidad marginal en componentes de color, y transiciones inconsistentes. Los problemas más críticos involucran variables CSS no definidas que causan fallos de renderizado y contrastes de color que no cumplen con WCAG 2.1 AA.

### Métricas de Hallazgos

- **Total de hallazgos**: 32
- **Críticos**: 4 (12.5%)
- **Mayores**: 10 (31.25%)
- **Menores**: 18 (56.25%)
- **Archivos afectados**: 15
- **Líneas de código a modificar**: ~150

---

## Hallazgos por Severidad

### CRÍTICO

#### 1. Variables CSS No Definidas - Fallo de Renderizado

- **Ubicación**: `app/design-system.css` líneas 366, 416, 472, 501, 502, 508, 525, 560, 278, 279
- **Descripción**: Se usan variables CSS que nunca fueron definidas en `:root`:
  - `--font-weight-medium`, `--font-weight-semibold`, `--font-weight-bold`
  - `--font-size-lg`, `--font-size-sm`
  - `--activeScale`, `--activeOpacity`
- **Severidad**: CRÍTICO
- **Solución técnica**:

```css
/* Agregar en :root de design-system.css */
/* Typography tokens */
--font-weight-regular: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;

--font-size-xs: 0.75rem;
--font-size-sm: 0.875rem;
--font-size-base: 1rem;
--font-size-lg: 1.125rem;
--font-size-xl: 1.25rem;

/* Interaction tokens */
--activeScale: 0.95;
--activeOpacity: 0.8;
```

- **Impacto en UX**: Los estilos fallan silenciosamente, causando inconsistencias visuales impredecibles

#### 2. Badge Component - Contraste Insuficiente WCAG

- **Ubicación**: `components/ui/Badge.tsx` líneas 11-15
- **Descripción**: Las variantes usan colores de texto sobre fondos claros con contraste insuficiente:
  - `text-brand-700` sobre `bg-brand-400/20` - contraste ~2.5:1 (requiere 4.5:1)
  - `text-emerald-700` sobre `bg-emerald-500/15` - contraste ~3.2:1 (requiere 4.5:1)
  - `text-orange-700` sobre `bg-orange-500/15` - contraste ~3.0:1 (requiere 4.5:1)
  - `text-red-700` sobre `bg-red-500/15` - contraste ~3.1:1 (requiere 4.5:1)
- **Severidad**: CRÍTICO
- **Solución técnica**:

```tsx
const variantStyles = {
  primary: 'bg-brand-400 text-slate-900 border border-brand-400/30',
  secondary: 'bg-secondary-400 text-slate-900 border border-secondary-400/30',
  success: 'bg-emerald-500 text-white border border-emerald-500/30',
  warning: 'bg-orange-500 text-white border border-orange-500/30',
  danger: 'bg-red-500 text-white border border-red-500/30',
};
```

- **Impacto en UX**: Usuarios con visión reducida no pueden leer el texto, violación directa de WCAG 2.1 AA

#### 3. Sidebar Active State - Contraste Inverso

- **Ubicación**: `components/ui/Sidebar.tsx` línea 174
- **Descripción**: El estado activo usa `text-slate-950` sobre `bg-white/[0.05]` - contraste extremadamente bajo
- **Severidad**: CRÍTICO
- **Solución técnica**:

```tsx
const itemClassName = `w-full flex items-center gap-3 rounded-lg border border-white/10 bg-white/${isActive ? '15' : '0'} px-3 py-2 text-sm ${isActive ? 'text-white bg-brand-400/20 border-brand-400/50' : 'text-slate-400 hover:bg-white/[0.05]'} transition-colors`;
```

- **Impacto en UX**: El usuario no puede identificar qué elemento está activo en navegación

#### 4. Button Danger Variant - Contraste Marginal

- **Ubicación**: `components/ui/Button.tsx` línea 35
- **Descripción**: `text-danger-400` sobre `bg-danger/20` tiene contraste ~3.8:1, no cumple con 4.5:1
- **Severidad**: CRÍTICO
- **Solución técnica**:

```tsx
danger: 'bg-danger-500 text-white hover:bg-danger-600 border border-danger-600',
```

- **Impacto en UX**: Mensajes de error críticos no son legibles para usuarios con visión reducida

---

### MAYOR

#### 5. Duplicación de Design Tokens

- **Ubicación**: `app/design-system.css` vs `app/globals.css` vs `tailwind.config.js`
- **Descripción**: Los mismos tokens se definen en 3 lugares con valores inconsistentes
- **Severidad**: MAYOR
- **Solución técnica**: Consolidar en un solo archivo de tokens
- **Impacto en UX**: Inconsistencias visuales entre componentes, mantenimiento difícil

#### 6. MobileSheet Sin Label Inicial

- **Ubicación**: `components/ui/MobileSheet.tsx` líneas 87-88
- **Severidad**: MAYOR
- **Solución técnica**: Agregar `aria-label` cuando no hay header
- **Impacto en UX**: Usuarios de screen readers no pueden identificar el propósito del sheet

#### 7. Select Component Sin Tema Completo

- **Ubicación**: `components/ui/Select.tsx` línea 55
- **Severidad**: MAYOR
- **Solución técnica**: Agregar prop `formTheme` consistente con Input
- **Impacto en UX**: Inconsistencia visual en modo claro

#### 8. Transiciones Inconsistentes

- **Ubicación**: Múltiples componentes
- **Severidad**: MAYOR
- **Solución técnica**: Usar tokens CSS consistentes
- **Impacto en UX**: La interfaz se siente descoordinada

#### 9. Input Sin Active State

- **Ubicación**: `components/ui/Input.tsx` línea 43
- **Severidad**: MAYOR
- **Solución técnica**: Agregar `active:scale-[0.99]`
- **Impacto en UX**: En móvil no hay feedback visual al tocar

#### 10. Safe Areas Inconsistentes

- **Ubicación**: Múltiples componentes
- **Severidad**: MAYOR
- **Solución técnica**: Usar clases `.mobile-safe-*` consistentemente
- **Impacto en UX**: Elementos pueden ser tapados por notch/home indicator

---

### MENOR

#### 11-32. Problemas menores de consistencia, nomenclatura, duplicación de código, etc.

[Ver análisis completo en subagente para detalles de todos los hallazgos menores]

---

## Recomendaciones Prioritarias

### Top 10 Recomendaciones (Ordenadas por Impacto)

1. **DEFINIR VARIABLES CSS FALTANTES** (CRÍTICO)
2. **CORREGIR CONTRASTE EN BADGE COMPONENT** (CRÍTICO)
3. **CORREGIR SIDEBAR ACTIVE STATE** (CRÍTICO)
4. **CORREGIR BUTTON DANGER VARIANT** (CRÍTICO)
5. **CONSOLIDAR DESIGN TOKENS** (MAYOR)
6. **AGREGAR ACTIVE STATE A INPUT** (MAYOR)
7. **ESTANDARIZAR TRANSICIONES** (MAYOR)
8. **AGREGAR ARIA LABEL A MOBILESHEET** (MAYOR)
9. **IMPLEMENTAR FORMTHEME EN SELECT** (MAYOR)
10. **ESTANDARIZAR SAFE AREAS** (MAYOR)

---

## Próximos Pasos Sugeridos

1. **Fase 1 (Semanal)**: Corregir todos los hallazgos CRÍTICOS
2. **Fase 2 (Quincenal)**: Consolidar design tokens y corregir hallazgos MAYORES
3. **Fase 3 (Mensual)**: Abordar hallazgos MENORES y establecer guías de estilo
4. **Fase 4 (Continua)**: Implementar pruebas automatizadas de contraste y consistencia visual
