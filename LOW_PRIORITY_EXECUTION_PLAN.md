---
contentType: Plan
title: Low priority execution plan — ORIGEN ERP
---

# Low priority execution plan — ORIGEN ERP

Fecha: 15 de enero de 2024  
Fase: Low priority (19 issues)  
Tiempo estimado: 2 horas  
Estado: Iniciando

## Estrategia rápida

### Grupo 1: Barras de progreso (3 issues) — 15 MIN

Objetivo: `h-2` → `h-3` (más visible)

Archivos:

- `DashboardOverview.tsx` (Budget Utilization)
- `ProjectsList.tsx` (Project Progress)
- `PayrollView.tsx` (si existe)

### Grupo 2: Badges y pills (4 issues) — 20 MIN

Objetivo: Estandarizar styling

Cambios:

- Todos los badges: `px-2 py-1 rounded-full font-semibold text-xs`
- Badges de estado: Usar `COLORS.status`
- Badges de categoría: Usar `COLORS.expenseCategories`

### Grupo 3: Tipografía (5 issues) — 15 MIN

Objetivo: Tamaños de fuente consistentes

Cambios:

- Etiquetas de formulario: `text-xs` → `text-sm` (más legible)
- Texto de ayuda: `text-xs text-slate-500`
- Texto de error: `text-xs text-red-600`
- Títulos de tarjeta: `font-semibold` uniforme

### Grupo 4: Efectos hover (4 issues) — 20 MIN

Objetivo: Transiciones suaves

Cambios:

- Botones: `hover:shadow-md transition-all`
- Tarjetas: `hover:shadow-md transition-shadow`
- Enlaces: `hover:text-blue-700`
- Inputs: `focus:ring-2 focus:ring-blue-500`

### Grupo 5: Estados vacíos y pulido (3 issues) — 10 MIN

Objetivo: Mejorar mensajes

Cambios:

- Estados vacíos: Icono + texto + llamada a la acción
- Marcadores de posición: Mejor contraste
- Sin datos: Estilado profesional
