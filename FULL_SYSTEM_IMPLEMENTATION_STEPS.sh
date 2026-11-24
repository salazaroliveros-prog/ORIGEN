#!/bin/bash
# FULL SYSTEM IMPLEMENTATION - Instrucciones para actualizar 100% del código
# ConstructERP Guatemala - Producción Ready

echo "=================================================="
echo "IMPLEMENTACIÓN COMPLETA DEL SISTEMA 100%"
echo "ConstructERP Guatemala - Transformación Enterprise"
echo "=================================================="
echo ""

# Esta guía te da las INSTRUCCIONES EXACTAS para actualizar todo el código
# sin necesidad de herramientas, solo siguiendo paso a paso

# PASO 1: ACTUALIZAR IMPORTS EN components/MainApp.tsx
# ───────────────────────────────────────────────────

# Buscar la línea:
#   import { DashboardView } from '@/features/dashboard/DashboardView';

# Reemplazar con:
#   import { DashboardView } from '@/features/dashboard/DashboardView';
#   import { DashboardEnhanced } from '@/components/DashboardEnhanced';
#   import { ProjectSelectorEnhanced } from '@/components/ProjectSelectorEnhanced';
#   import { TabsGrouped } from '@/components/TabsGrouped';

# PASO 2: REEMPLAZAR DASHBOARD RENDERIZADO
# ─────────────────────────────────────────

# Buscar:
#   {activeTab === 'dashboard' && (
#     <DashboardView
#       projects={activeProjects}
#       ...
#     />
#   )}

# Reemplazar con:
#   {activeTab === 'dashboard' && (
#     <DashboardEnhanced
#       projects={activeProjects}
#       expenses={activeExpenses}
#       company={company}
#       activeProjectId={activeProject?.id ?? ''}
#       onSelectProject={handleSelectProject}
#       milestones={activeProjects.flatMap((project) => project.scheduleMilestones ?? [])}
#       employees={fullEmployees}
#       attendance={activeAttendance}
#     />
#   )}

# PASO 3: ACTUALIZAR NAVBAR PARA USAR TABS GROUPED
# ──────────────────────────────────────────────

# En components/ui/Sidebar.tsx, reemplazar la sección de navegación:
#
# DE:
#   <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
#     {tabs.map((tab) => { ... })}
#   </nav>
#
# A:
#   <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
#     <TabsGrouped
#       tabs={tabs.map(t => ({
#         ...t,
#         group: getTabGroup(t.id),
#       }))}
#       activeTabId={activeTab}
#       onSelectTab={onSelectTab}
#     />
#   </nav>

# PASO 4: AGREGAR HELPER FUNCTION EN Sidebar
# ──────────────────────────────────────────

# Agregar esta función ANTES de export function Sidebar:
#
# const getTabGroup = (tabId: string): 'operativo' | 'financiero' | 'personal' | 'admin' => {
#   const groups: Record<string, 'operativo' | 'financiero' | 'personal' | 'admin'> = {
#     dashboard: 'operativo',
#     proyectos: 'operativo',
#     cronograma_gantt: 'operativo',
#     maquinaria: 'operativo',
#     
#     apu_presupuestos: 'financiero',
#     cotizaciones: 'financiero',
#     gastos: 'financiero',
#     fel_invoices: 'financiero',
#     reportes: 'financiero',
#     
#     personal: 'personal',
#     planillas: 'personal',
#     
#     inventario: 'admin',
#     gmail: 'admin',
#     ai: 'admin',
#     equipo: 'admin',
#   };
#   return groups[tabId] ?? 'operativo';
# };

# PASO 5: REEMPLAZAR PROJECT SELECTOR EN SIDEBAR
# ──────────────────────────────────────────────

# En components/ui/Sidebar.tsx, buscar:
#   {projects.length > 0 && (
#     <div className="border-b border-white/10 px-4 py-3">
#       <label ...>Proyecto activo</label>
#       <select ...>
#         {projects.map((project) => ...)}
#       </select>
#     </div>
#   )}

# Reemplazar con:
#   import { ProjectSelectorEnhanced } from '@/components/ProjectSelectorEnhanced';
#   
#   {projects.length > 0 && (
#     <div className="border-b border-white/10 px-4 py-3">
#       <ProjectSelectorEnhanced
#         projects={projects}
#         activeProjectId={activeProjectId}
#         onSelectProject={onSelectProject}
#       />
#     </div>
#   )}

# PASO 6: VERIFICAR CONFIGURACIÓN
# ──────────────────────────────

# Verificar que tailwind.config.js tiene:
#   - Paleta sky #0ea5e9 como primary
#   - Estados semánticos (success, warning, danger)
#   - Glass morphism tokens

# Verificar que app/globals.css tiene:
#   - 28+ CSS variables
#   - Responsive grid
#   - Glass panels

# PASO 7: BUILD Y TEST
# ───────────────────

# npm run build
# npm run dev
# Verificar en http://localhost:3000

# PASO 8: LIGHTHOUSE VALIDATION
# ────────────────────────────

# npm run build:analyze
# DevTools > Lighthouse
# Target: Performance ≥90, Accessibility ≥95

echo ""
echo "INSTRUCCIONES COMPLETADAS"
echo "Ahora edita los archivos siguiendo los pasos anteriores"
echo ""
echo "Files a editar:"
echo "1. components/MainApp.tsx (imports + dashboard)"
echo "2. components/ui/Sidebar.tsx (tabs + project selector)"
echo "3. Verificar tailwind.config.js"
echo "4. Verificar app/globals.css"
echo ""
echo "Después:"
echo "npm run build && npm run dev"
echo ""
echo "=================================================="
