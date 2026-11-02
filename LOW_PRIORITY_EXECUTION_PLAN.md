# ORIGEN ERP - LOW PRIORITY EXECUTION PLAN

**Fecha:** 2024-01-15
**Fase:** LOW PRIORITY (19 issues)
**Tiempo Estimado:** 2 horas
**Estado:** INICIANDO

---

## 🎯 ESTRATEGIA RÁPIDA

### Grupo 1: Progress Bars (3 issues) - 15 MIN
```
Objetivo: h-2 → h-3 (más visible)
Archivos: 
  • DashboardOverview.tsx (Budget Utilization)
  • ProjectsList.tsx (Project Progress)
  • PayrollView.tsx (if exists)
```

### Grupo 2: Badges & Pills (4 issues) - 20 MIN
```
Objetivo: Estandarizar styling
Cambios:
  • All badges: px-2 py-1 rounded-full font-semibold text-xs
  • Status badges: Usar COLORS.status
  • Category badges: Usar COLORS.expenseCategories
```

### Grupo 3: Typography (5 issues) - 15 MIN
```
Objetivo: Consistent font sizing
Cambios:
  • Form labels: text-xs → text-sm (más legible)
  • Helper text: text-xs text-slate-500
  • Error text: text-xs text-red-600
  • Card titles: font-semibold uniform
```

### Grupo 4: Hover Effects (4 issues) - 20 MIN
```
Objetivo: Smooth transitions
Cambios:
  • Buttons: hover:shadow-md transition-all
  • Cards: hover:shadow-md transition-shadow
  • Links: hover:text-blue-700
  • Inputs: focus:ring-2 focus:ring-blue-500
```

### Grupo 5: Empty States & Polish (3 issues) - 10 MIN
```
Objetivo: Better messaging
Cambios:
  • Empty states: Icon + text + CTA
  • Placeholders: Better contrast
  • No data: Professional styling
```

---

## 📋 EJECUCIÓN RÁPIDA

**Total Time: ~80 minutes**

### FASE 1: Progress Bars (15 min)
- [ ] Search all "h-2" en componentes
- [ ] Cambiar a "h-3"
- [ ] Verificar visual

### FASE 2: Badges (20 min)
- [ ] ProjectsList status badges
- [ ] ExpensesView category badges
- [ ] QuotationsView status badges
- [ ] Aplicar colores uniformes

### FASE 3: Typography (15 min)
- [ ] Form labels: review & update
- [ ] Error messages: uniform text-xs text-red-600
- [ ] Helper text: uniform text-xs text-slate-500

### FASE 4: Hover Effects (20 min)
- [ ] Review button classes
- [ ] Add hover:shadow-md transition-all
- [ ] Cards: Add hover effects

### FASE 5: Polish (10 min)
- [ ] Empty states review
- [ ] Final touches

---

**NEXT: Start FASE 1**
