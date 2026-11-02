# ORIGEN ERP - LOW PRIORITY PHASE

**Fecha:** 2024-01-15
**Fase:** LOW PRIORITY (19 issues)
**Tiempo Estimado:** 2 horas
**Estado:** INICIANDO

---

## 🎯 LOW PRIORITY ISSUES (Polish & Refinement)

### Grupo 1: Typography Fixes (5 issues)
**Objetivo:** Mejorar tamaños y pesos de fuentes

**Changes:**
- [ ] Form labels: text-xs → text-sm (más legible)
- [ ] Card titles: Asegurar font-semibold uniform
- [ ] Badge text: text-xs font-semibold (consistent)
- [ ] Helper text: text-xs text-slate-500 (consistent)
- [ ] Error messages: text-xs text-red-600 (consistent)

**Time:** ~20 min

---

### Grupo 2: Hover Effects & Transitions (4 issues)
**Objetivo:** Mejorar feedback visual en interacciones

**Changes:**
- [ ] All buttons: `hover:shadow-md transition-all`
- [ ] All cards: `hover:shadow-md transition-shadow`
- [ ] Input focus: `focus:ring-2 focus:ring-blue-500` (verified)
- [ ] Links: `hover:text-blue-700 underline` (on hover)

**Time:** ~30 min

---

### Grupo 3: Progress Bar & Indicators (3 issues)
**Objetivo:** Mejorar visibilidad de progress bars

**Changes:**
- [ ] Progress bar height: h-2 → h-3
- [ ] Progress bar radius: No cambios, rounded-full
- [ ] Budget utilization bar: Add shadow/border
- [ ] Status indicators: Mejorar contrast

**Time:** ~15 min

---

### Grupo 4: Badge & Pill Styling (4 issues)
**Objetivo:** Estandarizar badges y pills

**Changes:**
- [ ] All badges: px-2 py-1 rounded-full font-semibold text-xs
- [ ] Status badges: Usar COLORS.status
- [ ] Category badges: Usar COLORS.expenseCategories
- [ ] Priority badges: Agregar colores

**Time:** ~25 min

---

### Grupo 5: Placeholder & Empty States (3 issues)
**Objetivo:** Mejorar messaging y empty states

**Changes:**
- [ ] Empty states: Icono + texto + CTA
- [ ] Placeholders: Mejorar contraste
- [ ] No data states: Styling consistente
- [ ] Loading states: Skeleton components uniform

**Time:** ~20 min

---

## 🔧 ESTRATEGIA DE EJECUCIÓN

**Paso 1:** Typography (5 min)
- Buscar/Replace todas las etiquetas
- Verificar consistency

**Paso 2:** Hover Effects (10 min)
- Agregar clases transition
- Verificar en componentes principales

**Paso 3:** Progress Bars (5 min)
- h-2 → h-3 en todos los progress bars
- Verificar visual

**Paso 4:** Badges (10 min)
- Estandarizar clase de badge
- Aplicar a componentes

**Paso 5:** Empty States (10 min)
- Mejorar mensajes
- Agregar consistency

---

## ✅ SUCCESS CRITERIA

- [ ] Todas las fuentes: Consistent sizing & weight
- [ ] Todos los hover effects: Smooth & visible
- [ ] Todos los progress bars: h-3 uniform
- [ ] Todos los badges: Styling consistente
- [ ] Todos los empty states: Professional look

**Expected Score Gain:** +0.08 → Final: 9.30/10

---

**NEXT: Ejecutar LOW PRIORITY fixes**
