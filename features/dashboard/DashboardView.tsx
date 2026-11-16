'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Activity, Download, SlidersHorizontal } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CashFlowProjectionChart } from '@/components/CashFlowProjectionChart';
import { LaborProductivityChart } from '@/components/LaborProductivityChart';
import { MonthlyExpensesHistogram } from '@/components/MonthlyExpensesHistogram';
import { D3BudgetUtilizationChart } from '@/components/D3BudgetUtilizationChart';
import { exportDashboardPerformancePdf } from '@/lib/dashboardPdfExport';
import { initialCompanySettings } from '@/lib/data';
import type { DashboardViewProps, DashboardTotals, ProgressChartDataPoint, StackedChartDataPoint, WidgetId } from './types';
import { DEFAULT_VISIBLE_WIDGETS } from './types';
import {
  KPICards,
  OverbudgetWarning,
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

  const filteredProjects = useMemo(() => {
    if (statusFilter === 'todos') return projects;
    return projects.filter((p) => p.status === statusFilter);
  }, [projects, statusFilter]);

  const displayedActiveProjectId = useMemo(
    () =>
      filteredProjects.some((project) => project.id === activeProjectId)
        ? activeProjectId
        : filteredProjects[0]?.id ?? '',
    [filteredProjects, activeProjectId]
  );

  const totals = useMemo((): DashboardTotals => {
    const totalBudget = filteredProjects.reduce((sum, p) => sum + (p.budgetTotal || 0), 0);

    const projectSpentMap = new Map<string, number>();
    projects.forEach((p) => {
      const projExpenses = expenses.filter((e) => e.projectId === p.id);
      const computedSpent =
        projExpenses.length > 0
          ? projExpenses.reduce(
              (s, e) => (e.approvalStatus !== 'Rechazado' ? s + e.amount : s),
              0
            )
          : p.spentTotal;
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
              {displayedActiveProjectId ? 'Proyecto activo seleccionado' : 'Vista consolidada de la empresa'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="md" onClick={() => setIsWidgetModalOpen(true)}>
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            <span className="ml-2">Widgets ({activeWidgetCount})</span>
          </Button>
          <Button variant="primary" size="md" onClick={() => void handleExportPdf()} disabled={isExportingPdf}>
            <Download className="h-4 w-4" aria-hidden="true" />
            <span className="ml-2">{isExportingPdf ? 'Generando…' : 'Exportar PDF'}</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {(['todos', 'En Ejecución', 'Planificación', 'Finalizado'] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setStatusFilter(filter)}
            className={`rounded-full border px-4 py-1.5 text-xs font-bold transition-colors ${
              statusFilter === filter
                ? 'border-amber-500/40 bg-amber-500/15 text-amber-200'
                : 'border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.07]'
            }`}
          >
            {filter === 'todos' ? 'Todos' : filter}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <KPICards
        projects={filteredProjects}
        totals={totals}
      />

      <OverbudgetWarning totals={totals} />

      {/* Charts grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card variant="elevated" padding="md" className={visibleWidgets.progressComparison ? '' : 'hidden'}>
          <ProgressComparison
            data={progressChartData}
            visible={visibleWidgets.progressComparison}
            onToggle={() => handleToggleWidget('progressComparison')}
          />
        </Card>
        <Card variant="elevated" padding="md" className={visibleWidgets.stackedBudget ? '' : 'hidden'}>
          <StackedBudget
            data={stackedChartData}
            visible={visibleWidgets.stackedBudget}
            onToggle={() => handleToggleWidget('stackedBudget')}
          />
        </Card>
        {visibleWidgets.cashFlow && (
          <Card variant="elevated" padding="md">
            <CashFlowProjectionChart projects={filteredProjects} company={company} />
          </Card>
        )}
        {visibleWidgets.expensesHistogram && (
          <Card variant="elevated" padding="md">
            <MonthlyExpensesHistogram expenses={expenses} projects={filteredProjects} currency="GTQ" />
          </Card>
        )}
        {visibleWidgets.budgetUtilization && (
          <Card variant="elevated" padding="md">
            <D3BudgetUtilizationChart projects={filteredProjects} currency="GTQ" />
          </Card>
        )}
        {visibleWidgets.laborCosts && (
          <Card variant="elevated" padding="md">
            <LaborProductivityChart employees={employees} attendance={attendance} currency="GTQ" />
          </Card>
        )}
        <Card variant="elevated" padding="md" className={visibleWidgets.projectBreakdown ? '' : 'hidden'}>
          <ProjectBreakdown
            projects={filteredProjects}
            totals={totals}
            visible={visibleWidgets.projectBreakdown}
            onToggle={() => handleToggleWidget('projectBreakdown')}
          />
        </Card>
      </div>

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