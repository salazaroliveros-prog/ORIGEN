# ORIGEN ERP - IMPLEMENTACIÓN DE CORRECCIONES VISUALES

**Fecha:** 2024-01-15
**Fase:** HIGH PRIORITY (8 issues)
**Tiempo Estimado:** 2 horas
**Estado:** EN PROCESO

---

## 🎯 PLAN DE IMPLEMENTACIÓN HIGH PRIORITY

### Issue #1: Sticky Button z-index & Background
**Componente:** ProjectsList.tsx
**Línea Aproximada:** Button clase
**Cambio:**
```
ANTES: fixed bottom-20 right-4 ...
DESPUÉS: fixed bottom-20 right-4 z-50 bg-blue-600 hover:bg-blue-700 shadow-lg
```
**Tiempo:** 5 min
**Estado:** ⏳ PENDING

---

### Issue #2: Modal Backdrop Consistency  
**Componentes:** ExpensesView, QuotationsView, PersonnelView, SettingsView
**Cambio:** Estandarizar a `fixed inset-0 bg-black/50 flex items-center justify-center z-50`
**Tiempo:** 20 min
**Estado:** ⏳ PENDING

---

### Issue #3: Sort State Visual Feedback
**Componente:** ProjectsList.tsx
**Cambio:** Agregar visual indicator
**Tiempo:** 15 min
**Estado:** ⏳ PENDING

---

### Issue #4: Logo Upload Drop Zone
**Componente:** SettingsView.tsx
**Cambio:** `border-4 border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50`
**Tiempo:** 10 min
**Estado:** ⏳ PENDING

---

### Issue #5: Calendar Touch Targets
**Componente:** PersonnelView.tsx
**Cambio:** `h-12 w-12` mínimo en calendar days
**Tiempo:** 20 min
**Estado:** ⏳ PENDING

---

### Issue #6: Attendance Indicator Clarity
**Componente:** PersonnelView.tsx
**Cambio:** Agregar dot visual
**Tiempo:** 10 min
**Estado:** ⏳ PENDING

---

### Issue #7: Alert Consistency
**Componentes:** Todos (usar Alert component)
**Cambio:** Reemplazar inline alerts con Alert components
**Tiempo:** 30 min
**Estado:** ⏳ PENDING

---

### Issue #8: Remove Item Button Visibility
**Componente:** QuotationsView.tsx
**Cambio:** Cambiar X a Trash icon + mejor styling
**Tiempo:** 10 min
**Estado:** ⏳ PENDING

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

- [ ] Issue 1: Sticky button (5 min)
- [ ] Issue 2: Modal backdrop (20 min)
- [ ] Issue 3: Sort feedback (15 min)
- [ ] Issue 4: Drop zone (10 min)
- [ ] Issue 5: Touch targets (20 min)
- [ ] Issue 6: Indicators (10 min)
- [ ] Issue 7: Alerts (30 min)
- [ ] Issue 8: Remove button (10 min)
- [ ] Testing en desktop
- [ ] Testing en mobile
- [ ] Verificación final

---

**INICIANDO IMPLEMENTACIÓN...**
