---
contentType: Plan
title: Low priority phase — ORIGEN ERP
---

# Low priority phase — ORIGEN ERP

Fecha: 15 de enero de 2024  
Fase: Low priority (19 issues)  
Tiempo estimado: 2 horas  
Estado: Iniciando

## Low priority issues (polish and refinement)

### Group 1: Typography fixes (5 issues)

Objetivo: Mejorar tamaños y pesos de fuentes

Cambios:

- Etiquetas de formulario: `text-xs` → `text-sm` (más legible)
- Títulos de tarjetas: Asegurar `font-semibold` uniforme
- Texto de badge: `text-xs font-semibold` (consistente)
- Texto de ayuda: `text-xs text-slate-500` (consistente)
- Mensajes de error: `text-xs text-red-600` (consistente)

Tiempo: Aproximadamente 20 minutos

### Group 2: Hover effects and transitions (4 issues)

Objetivo: Mejorar feedback visual en interacciones

Cambios:

- Todos los botones: `hover:shadow-md transition-all`
- Todas las tarjetas: `hover:shadow-md transition-shadow`
- Enfoque de inputs: `focus:ring-2 focus:ring-blue-500` (verificado)
- Enlaces: `hover:text-blue-700 underline` (al pasar el cursor)

Tiempo: Aproximadamente 30 minutos

### Group 3: Progress bar and indicators (3 issues)

Objetivo: Mejorar visibilidad de barras de progreso

Cambios:

- Altura de barra de progreso: `h-2` → `h-3`
- Radio de barra de progreso: Sin cambios, `rounded-full`
- Barra de utilización de presupuesto: Agregar sombra o borde
- Indicadores de estado: Mejorar contraste

Tiempo: Aproximadamente 15 minutos

### Group 4: Badge and pill styling (4 issues)

Objetivo: Estandarizar badges y pills

Cambios:

- Todos los badges: `px-2 py-1 rounded-full font-semibold text-xs`
- Badges de estado: Usar `COLORS.status`
- Badges de categoría: Usar `COLORS.expenseCategories`
- Badges de prioridad: Agregar colores
