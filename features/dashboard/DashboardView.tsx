'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Activity, Download, SlidersHorizontal, Eye, EyeOff } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CashFlowProjectionChart } from '@/components/CashFlowProjectionChart';
import { LaborProductivityChart } from '@/components/LaborProductivityChart';
import { MonthlyExpensesHistogram } from '@/components/MonthlyExpensesHistogram';
import { D3BudgetUtilizationChart } from '@/components/D3BudgetUtilizationChart';
import { exportDashboardPerformancePdf } from '@/lib/dashboardPdfExport';
import { formatGTQ, initialCompanySettings } from '@/lib/data';
import type { DashboardViewProps, DashboardTotals, ProgressChartDataPoint, StackedChartDataPoint, WidgetId } from './types';
import { WIDGET_CATALOG, DEFAULT_VISIBLE_WIDGETS, HIGH_PRIORITY_WIDGETS } from './widgetCatalog';
import {
  KPICards,
  OverbudgetWarning,
  UpcomingMilestones,
  ProgressComparison,
  StackedBudget,
  ProjectBreakdown,
} from './widgets';
import { DashboardWidgetsModal } from './DashboardWidgetsModal';

export function DashboardView({
  projects = [],
  expenses = [],
  company = initialCompanySettings,
  activeProjectId,
  onSelectProject,
  milestones = [],
  employees = [],
  attendance = [],
}: DashboardViewProps) {
  const [statusFilter, setStatusFilter] = useState<'todos' | 'En Ejecución' | 'Planificación' | 'Finalizado'>('todos');
  const [visibleWidgets, setVisibleWidgets] = useState<Record<WidgetId, boolean>>(DEFAULT_VISIBLE_WIDGETS);
  const [isWidgetModalOpen, setIsWidgetModalOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('constructerp_dashboard_widgets');
        if (saved) {
          const parsed = JSON.parse(saved) as unknown;
          if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
            const parsedWidgets = parsed as Partial<Record<WidgetId, boolean>>;
            setVisibleWidgets((prev) => ({ ...prev, ...parsedWidgets }));
          }
        }
      } catch (e) {
        console.warn('Could not parse saved widget settings');
      }
    }
  }, []);

  const handleToggleWidget = (id: WidgetId) => {
    setVisibleWidgets((prev) => {
      const updated = { ...prev, [id]: !prev[id] };
      if (typeof window !== 'undefined') {
        localStorage.setItem('constructerp_dashboard_widgets', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleResetWidgets = () => {
    setVisibleWidgets(DEFAULT_VISIBLE_WIDGETS);
    if (typeof window !== 'undefined') {
      localStorage.setItem('constructerp_dashboard_widgets', JSON.stringify(DEFAULT_VISIBLE_WIDGETS));
    }
  };

  const handleSetOnlyHighPriority = () => {
    setVisibleWidgets(HIGH_PRIORITY_WIDGETS);
    if (typeof window !== 'undefined') {
      localStorage.setItem('constructerp_dashboard_widgets', JSON.stringify(HIGH_PRIORITY_WIDGETS));
    }
  };

  const filteredProjects = useMemo(() => {
    if (statusFilter === 'todos') return projects;
    return projects.filter((p) => p.status === statusFilter);
  }, [projects, statusFilter]);

  const displayedActiveProjectId = filteredProjects.some((project) => project.id === activeProjectId)
    ? activeProjectId
    : filteredProjects[0]?.id ?? '';

  const totals = useMemo((): DashboardTotals => {
    const totalBudget = filteredProjects.reduce((sum, p) => sum + (p.budgetTotal || 0), 0);

    const projectSpentMap = new Map<string, number>();
    projects.forEach((p) => {
      const projExpenses = expenses.filter((e) => e.projectId === p.id);
      const computedSpent =
        projExpenses.length > 0 ? projExpenses.reduce((s, e) => s + e.amount, 0) : p.spentTotal;
      projectSpentMap.set(p.id, computedSpent);
    });

    const totalSpent = filteredProjects.reduce(
      (sum, p) => sum + (projectSpentMap.get(p.id) || p.spentTotal || 0),
      0
    );
    const overbudgetProjects = filteredProjects.filter(
      (p) => (projectSpentMap.get(p.id) || p.spentTotal) > p.budgetTotal
    );

    return {
      totalBudget,
      totalSpent,
      remaining: totalBudget - totalSpent,
      spentPercentage: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
      overbudgetCount: overbudgetProjects.length,
      overbudgetProjects,
      projectSpentMap,
    };
  }, [filteredProjects, projects, expenses]);

  const progressChartData = useMemo((): ProgressChartDataPoint[] => {
    return filteredProjects.map((p) => {
      const actualSpent = totals.projectSpentMap.get(p.id) || p.spentTotal || 0;
      const financialPercent = p.budgetTotal > 0 ? Math.round((actualSpent / p.budgetTotal) * 100) : 0;
      const physicalPercent = p.progressPercent || 0;
      const gap = financialPercent - physicalPercent;

      return {
        id: p.id,
        name: p.code ? `${p.code} - ${p.name.substring(0, 18)}...` : p.name.substring(0, 22),
        fullName: p.name,
        code: p.code || p.id,
        avanceFisico: physicalPercent,
        ejecucionFinanciera: financialPercent,
        presupuesto: p.budgetTotal,
        gastoReal: actualSpent,
        descalce: gap,
        isAlert: gap > 10,
      };
    });
  }, [filteredProjects, totals.projectSpentMap]);

  const stackedChartData = useMemo((): StackedChartDataPoint[] => {
    return filteredProjects.map((p) => {
      const budget = p.budgetTotal || 0;
      const spent = totals.projectSpentMap.get(p.id) || p.spentTotal || 0;

      const isOver = spent > budget;
      const spentWithinBudget = isOver ? budget : spent;
      const remainingBudget = isOver ? 0 : Math.max(0, budget - spent);
      const excessSpent = isOver ? spent - budget : 0;
      const percentExecuted = budget > 0 ? Math.round((spent / budget) * 100) : 0;

      return {
        id: p.id,
        name: p.code ? `${p.code}` : p.name.substring(0, 15),
        fullName: p.name,
        presupuestoAsignado: budget,
        gastoReal: spentWithinBudget,
        saldoDisponible: remainingBudget,
        sobrecostoExcedido: excessSpent,
        totalGasto: spent,
        percentExecuted,
        isOverbudget: isOver,
      };
    });
  }, [filteredProjects, totals.projectSpentMap]);

  const activeWidgetCount = Object.values(visibleWidgets).filter(Boolean).length;

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      await exportDashboardPerformancePdf({
        projects: filteredProjects,
        expenses,
        company,
        visibleWidgets,
        currency: 'GTQ',
      });
    } catch (err) {
      console.error('Error generating Dashboard PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="responsive-container safe-area-top safe-area-bottom min-h-full space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-white/15 bg-gradient-to-r from-slate-900/90 via-slate-900/80 to-slate-950/90 p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.45)] ring-1 ring-white/10 backdrop-blur-2xl md:flex-row md:items-center">
        <div className="flex items-center gap-3.5">
          <span className="rounded-2xl border border-amber-500/40 bg-amber-500/20 p-3.5 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.25)]" aria-hidden="true">
            <Activity className="h-6 w-6 stroke-[2.5]" />
          </span>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white drop-shadow-sm">
              Tablero de Control Financiero & Avance de Obras
            </h1>
            <p className="mt-0.5 text-xs font-medium text-slate-300">
              Monitoreo analítico en tiempo real de presupuestos proyectados, gastos ejecutados y descalces de obra en Guatemala.
            </p>
          </div>
        </div>

        {/* Filter & Widget Customization Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label htmlFor="project-status-filter" className="sr-only">Filtrar proyectos por estado</label>
          <select
            id="project-status-filter"
            value={statusFilter}
            onChange={(e) => {
              const nextFilter = e.target.value as typeof statusFilter;
              setStatusFilter(nextFilter);
              if (
                nextFilter !== 'todos' &&
                !projects.some((project) => project.id === activeProjectId && project.status === nextFilter)
              ) {
                const firstMatchingProject = projects.find((project) => project.status === nextFilter);
                if (firstMatchingProject) onSelectProject(firstMatchingProject.id);
              }
            }}
            className="cursor-pointer rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 font-bold text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="todos">Todos los proyectos ({projects.length})</option>
            <option value="En Ejecución">En Ejecución</option>
            <option value="Planificación">Planificación</option>
            <option value="Finalizado">Finalizado</option>
          </select>

          <Button variant="outline" size="sm" onClick={() => setIsWidgetModalOpen(true)} className="flex items-center gap-2 border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20">
            <SlidersHorizontal className="h-4 w-4 text-amber-400" aria-hidden="true" />
            <span>Personalizar Widgets ({activeWidgetCount}/7)</span>
          </Button>

          <Button variant="primary" size="sm" disabled={isExportingPdf} onClick={handleExportPdf} className="flex items-center gap-2 font-bold shadow-md">
            <Download className="h-4 w-4 text-slate-950" aria-hidden="true" />
            <span>{isExportingPdf ? 'Generando PDF…' : 'Exportar Reporte PDF'}</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <KPICards projects={filteredProjects} totals={totals} />

      {/* Financial Overbudget Warning Banner */}
      <OverbudgetWarning totals={totals} />

      {/* Upcoming Milestones */}
      <UpcomingMilestones projects={projects} milestones={milestones} onSelectProject={onSelectProject} />

      {/* Dynamic Widgets Section */}
      <div className="space-y-6">
        {/* WIDGET 1: CASH FLOW PROJECTION CHART (High Priority) */}
        {visibleWidgets.cashFlow && (
          <div className="group relative">
            <div className="absolute right-3 top-3 z-10 opacity-0 transition group-hover:opacity-100">
              <button
                onClick={() => handleToggleWidget('cashFlow')}
                title="Ocultar Widget"
                className="rounded-lg border border-slate-700 bg-slate-800/80 p-1.5 text-slate-400 hover:text-white"
                aria-label="Ocultar widget Proyección de Flujo de Caja"
              >
                <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
            <CashFlowProjectionChart
              projects={filteredProjects}
              milestones={milestones}
              activeProjectId={displayedActiveProjectId}
              onSelectProject={onSelectProject}
            />
          </div>
        )}

        {/* WIDGET 2: ACTIVE LABOR COSTS & PRODUCTIVITY (High Priority) */}
        {visibleWidgets.laborCosts && (
          <div className="group relative">
            <div className="absolute right-3 top-3 z-10 opacity-0 transition group-hover:opacity-100">
              <button
                onClick={() => handleToggleWidget('laborCosts')}
                title="Ocultar Widget"
                className="rounded-lg border border-slate-700 bg-slate-800/80 p-1.5 text-slate-400 hover:text-white"
                aria-label="Ocultar widget Costos de Mano de Obra"
              >
                <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
            <LaborProductivityChart
              employees={employees}
              attendance={attendance}
              projects={filteredProjects}
              activeProjectId={displayedActiveProjectId}
              company={company}
              currency="GTQ"
            />
          </div>
        )}

        {/* WIDGET 3: PHYSICAL PROGRESS VS FINANCIAL EXECUTION */}
        <ProgressComparison
          data={progressChartData}
          visible={visibleWidgets.progressComparison}
          onToggle={() => handleToggleWidget('progressComparison')}
        />

        {/* WIDGET 4: STACKED BUDGET COMPARISON */}
        <StackedBudget
          data={stackedChartData}
          visible={visibleWidgets.stackedBudget}
          onToggle={() => handleToggleWidget('stackedBudget')}
        />

        {/* WIDGET 5: MONTHLY EXPENSES HISTOGRAM */}
        {visibleWidgets.expensesHistogram && (
          <div className="group relative">
            <div className="absolute right-3 top-3 z-10 opacity-0 transition group-hover:opacity-100">
              <button
                onClick={() => handleToggleWidget('expensesHistogram')}
                title="Ocultar Widget"
                className="rounded-lg border border-slate-700 bg-slate-800/80 p-1.5 text-slate-400 hover:text-white"
                aria-label="Ocultar widget Histórico de Gastos Mensuales"
              >
                <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
            <MonthlyExpensesHistogram
              projects={filteredProjects}
              expenses={expenses}
              company={company}
              currency="GTQ"
              activeProjectId={displayedActiveProjectId}
              onSelectProject={onSelectProject}
            />
          </div>
        )}

        {/* WIDGET 6: D3 BUDGET UTILIZATION */}
        {visibleWidgets.budgetUtilization && (
          <div className="group relative">
            <div className="absolute right-3 top-3 z-10 opacity-0 transition group-hover:opacity-100">
              <button
                onClick={() => handleToggleWidget('budgetUtilization')}
                title="Ocultar Widget"
                className="rounded-lg border border-slate-700 bg-slate-800/80 p-1.5 text-slate-400 hover:text-white"
                aria-label="Ocultar widget Utilización de Presupuesto APU"
              >
                <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
            <D3BudgetUtilizationChart
              projects={filteredProjects}
              activeProjectId={displayedActiveProjectId}
              onSelectProject={onSelectProject}
              currency="GTQ"
              company={company}
            />
          </div>
        )}

        {/* WIDGET 7: PROJECT BREAKDOWN CARDS */}
        <ProjectBreakdown
          projects={filteredProjects}
          totals={totals}
          visible={visibleWidgets.projectBreakdown}
          onToggle={() => handleToggleWidget('projectBreakdown')}
        />
      </div>

      {/* Widget Selection Modal */}
      <DashboardWidgetsModal
        isOpen={isWidgetModalOpen}
        onClose={() => setIsWidgetModalOpen(false)}
        visibleWidgets={visibleWidgets}
        onToggleWidget={handleToggleWidget}
        activeWidgetCount={activeWidgetCount}
      />
    </div>
  );
}