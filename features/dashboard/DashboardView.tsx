'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
  ReferenceLine,
} from 'recharts';
import {
  Building2,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  DollarSign,
  Activity,
  Layers,
  SlidersHorizontal,
  Eye,
  EyeOff,
  RotateCcw,
  Check,
  X,
  Users,
  PieChart as PieChartIcon,
  Sparkles,
  Briefcase,
  Clock,
  Download,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CashFlowProjectionChart } from '@/components/CashFlowProjectionChart';
import { LaborProductivityChart } from '@/components/LaborProductivityChart';
import { MonthlyExpensesHistogram } from '@/components/MonthlyExpensesHistogram';
import { D3BudgetUtilizationChart } from '@/components/D3BudgetUtilizationChart';
import { exportDashboardPerformancePdf } from '@/lib/dashboardPdfExport';
import type { CompanySettings, Project, ExpenseRecord, Milestone, Employee, AttendanceRecord } from '@/lib/types';
import { formatGTQ, initialCompanySettings } from '@/lib/data';

interface DashboardViewProps {
  projects: Project[];
  expenses?: ExpenseRecord[];
  company?: CompanySettings;
  milestones?: Milestone[];
  employees?: Employee[];
  attendance?: AttendanceRecord[];
}

export type WidgetId =
  | 'cashFlow'
  | 'laborCosts'
  | 'progressComparison'
  | 'stackedBudget'
  | 'expensesHistogram'
  | 'budgetUtilization'
  | 'projectBreakdown';

interface WidgetMetadata {
  id: WidgetId;
  title: string;
  description: string;
  category: 'financiero' | 'mano_obra' | 'avance';
  priority: 'alta' | 'media';
  icon: React.ElementType;
}

const WIDGET_CATALOG: WidgetMetadata[] = [
  {
    id: 'cashFlow',
    title: 'Proyección de Flujo de Caja Semestral',
    description: 'Proyección financiera basada en hitos de entrega y desembolsos programados',
    category: 'financiero',
    priority: 'alta',
    icon: DollarSign,
  },
  {
    id: 'laborCosts',
    title: 'Costos de Mano de Obra Activa & Productividad',
    description: 'Rendimiento y costo diario de cuadrillas en campo con métricas IGSS',
    category: 'mano_obra',
    priority: 'alta',
    icon: Users,
  },
  {
    id: 'progressComparison',
    title: 'Avance Físico vs. Ejecución Financiera (%)',
    description: 'Detección de descalces donde el gasto presupuestario supera al avance real',
    category: 'avance',
    priority: 'alta',
    icon: BarChart3,
  },
  {
    id: 'stackedBudget',
    title: 'Presupuesto Asignado vs. Gasto Real (Barras Apiladas)',
    description: 'Visibiliza saldo disponible presupuestario y sobrecostos excedidos',
    category: 'financiero',
    priority: 'alta',
    icon: Layers,
  },
  {
    id: 'expensesHistogram',
    title: 'Histórico de Gastos Mensuales por Categoría',
    description: 'Evolución cronológica de facturación y rubros operativos',
    category: 'financiero',
    priority: 'media',
    icon: Activity,
  },
  {
    id: 'budgetUtilization',
    title: 'Utilización de Presupuesto APU (Interactivo D3)',
    description: 'Desglose circular y por renglones de la estructura de costos',
    category: 'financiero',
    priority: 'media',
    icon: PieChartIcon,
  },
  {
    id: 'projectBreakdown',
    title: 'Tarjetas Resumen por Proyecto',
    description: 'Monitoreo individualizado de obras con barra de progreso y balance',
    category: 'avance',
    priority: 'media',
    icon: Briefcase,
  },
];

const DEFAULT_VISIBLE_WIDGETS: Record<WidgetId, boolean> = {
  cashFlow: true,
  laborCosts: true,
  progressComparison: true,
  stackedBudget: true,
  expensesHistogram: true,
  budgetUtilization: true,
  projectBreakdown: true,
};

export function DashboardView({
  projects = [],
  expenses = [],
  company = initialCompanySettings,
  milestones = [],
  employees = [],
  attendance = [],
}: DashboardViewProps) {
  const [statusFilter, setStatusFilter] = useState<'todos' | 'En Ejecución' | 'Planificación' | 'Finalizado'>('todos');
  const [visibleWidgets, setVisibleWidgets] = useState<Record<WidgetId, boolean>>(DEFAULT_VISIBLE_WIDGETS);
  const [isWidgetModalOpen, setIsWidgetModalOpen] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string>('');

  // Load saved widget preferences
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

  // Save widget state to localStorage
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
    const highPriorityOnly: Record<WidgetId, boolean> = {
      cashFlow: true,
      laborCosts: true,
      progressComparison: true,
      stackedBudget: true,
      expensesHistogram: false,
      budgetUtilization: false,
      projectBreakdown: true,
    };
    setVisibleWidgets(highPriorityOnly);
    if (typeof window !== 'undefined') {
      localStorage.setItem('constructerp_dashboard_widgets', JSON.stringify(highPriorityOnly));
    }
  };

  // Filter projects by status
  const filteredProjects = useMemo(() => {
    if (statusFilter === 'todos') return projects;
    return projects.filter((p) => p.status === statusFilter);
  }, [projects, statusFilter]);

  useEffect(() => {
    if (filteredProjects.length > 0 && !activeProjectId) {
      setActiveProjectId(filteredProjects[0].id);
    }
  }, [filteredProjects, activeProjectId]);

  // Aggregate totals
  const totals = useMemo(() => {
    const totalBudget = filteredProjects.reduce((sum, p) => sum + (p.budgetTotal || 0), 0);

    const projectSpentMap = new Map<string, number>();
    projects.forEach((p) => {
      const projExpenses = expenses.filter((e) => e.projectId === p.id);
      const computedSpent = projExpenses.length > 0 ? projExpenses.reduce((s, e) => s + e.amount, 0) : p.spentTotal;
      projectSpentMap.set(p.id, computedSpent);
    });

    const totalSpent = filteredProjects.reduce((sum, p) => sum + (projectSpentMap.get(p.id) || p.spentTotal || 0), 0);
    const overbudgetProjects = filteredProjects.filter((p) => (projectSpentMap.get(p.id) || p.spentTotal) > p.budgetTotal);

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

  // Data for Chart 1: Progress Comparison
  const progressChartData = useMemo(() => {
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

  // Data for Chart 2: Stacked Bar Chart
  const stackedChartData = useMemo(() => {
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

  const [isExportingPdf, setIsExportingPdf] = useState(false);

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
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <span className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
            <Activity className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">
              Tablero de Control Financiero & Avance de Obras
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Monitoreo analítico en tiempo real de presupuestos proyectados, gastos ejecutados y descalces de obra.
            </p>
          </div>
        </div>

        {/* Filter & Widget Customization Controls */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          <select
            aria-label="Filtrar proyectos por estado"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 font-bold text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
          >
            <option value="todos">Todos los proyectos ({projects.length})</option>
            <option value="En Ejecución">En Ejecución</option>
            <option value="Planificación">Planificación</option>
            <option value="Finalizado">Finalizado</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsWidgetModalOpen(true)}
            className="flex items-center gap-2 bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
          >
            <SlidersHorizontal className="w-4 h-4 text-amber-400" />
            <span>Personalizar Widgets ({activeWidgetCount}/7)</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            disabled={isExportingPdf}
            onClick={handleExportPdf}
            className="flex items-center gap-2 font-bold shadow-md"
          >
            <Download className="w-4 h-4 text-slate-950" />
            <span>{isExportingPdf ? 'Generando PDF...' : 'Exportar Reporte PDF'}</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="elevated" padding="md" className="bg-slate-900/80 border-slate-800">
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Proyectos Activos</p>
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-white mt-1">{filteredProjects.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{totals.overbudgetCount} con alerta de sobrecosto</p>
        </Card>

        <Card variant="elevated" padding="md" className="bg-slate-900/80 border-slate-800">
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Presupuesto Proyectado</p>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">
            {formatGTQ(totals.totalBudget)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Cartera global administrada</p>
        </Card>

        <Card variant="elevated" padding="md" className="bg-slate-900/80 border-slate-800">
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gasto Real Acumulado</p>
            <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-sky-400 mt-1 font-mono">
            {formatGTQ(totals.totalSpent)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">{totals.spentPercentage}% del presupuesto ejercido</p>
        </Card>

        <Card
          variant="elevated"
          padding="md"
          className={`border ${
            totals.overbudgetCount > 0
              ? 'bg-rose-950/30 border-rose-800/80'
              : 'bg-slate-900/80 border-slate-800'
          }`}
        >
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-rose-400 uppercase tracking-wider">Alertas de Sobrecosto</p>
            <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-rose-400 mt-1">
            {totals.overbudgetCount} Obras
          </p>
          <p className="text-[11px] text-rose-300/80 mt-0.5">
            {totals.overbudgetCount > 0 ? 'Superan el 100% del presupuesto' : 'Sin desviaciones críticas'}
          </p>
        </Card>
      </div>

      {/* Financial Overbudget Warning Banner */}
      {totals.overbudgetCount > 0 && (
        <div className="bg-rose-950/60 border border-rose-800 rounded-2xl p-4 text-rose-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-rose-900/80 text-rose-300 border border-rose-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </span>
            <div>
              <h4 className="font-extrabold text-white text-xs uppercase tracking-wider">
                Atención Contable: {totals.overbudgetCount} proyecto(s) han excedido su límite financiero
              </h4>
              <p className="text-xs text-rose-300 mt-0.5">
                Proyectos afectados:{' '}
                <strong>
                  {totals.overbudgetProjects.map((p) => `${p.name} (${p.code || p.id})`).join(', ')}
                </strong>
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold bg-rose-900 border border-rose-700 text-rose-100 px-3 py-1 rounded-xl shrink-0">
            Revisar APU y Solicitudes
          </span>
        </div>
      )}

      {/* ================= DYNAMIC WIDGETS SECTION ================= */}
      <div className="space-y-6">
        {/* WIDGET 1: CASH FLOW PROJECTION CHART (High Priority) */}
        {visibleWidgets.cashFlow && (
          <div className="relative group">
            <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition">
              <button
                onClick={() => handleToggleWidget('cashFlow')}
                title="Ocultar Widget"
                className="p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>
            </div>
            <CashFlowProjectionChart projects={filteredProjects} milestones={milestones} />
          </div>
        )}

        {/* WIDGET 2: ACTIVE LABOR COSTS & PRODUCTIVITY (High Priority) */}
        {visibleWidgets.laborCosts && (
          <div className="relative group">
            <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition">
              <button
                onClick={() => handleToggleWidget('laborCosts')}
                title="Ocultar Widget"
                className="p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>
            </div>
            <LaborProductivityChart
              employees={employees}
              attendance={attendance}
              projects={filteredProjects}
              activeProjectId={activeProjectId}
              company={company}
              currency="GTQ"
            />
          </div>
        )}

        {/* WIDGET 3: PHYSICAL PROGRESS VS FINANCIAL EXECUTION */}
        {visibleWidgets.progressComparison && (
          <div className="relative group bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  Avance Físico de Obra vs. Ejecución Financiera (%)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Comparativa porcentual por proyecto. Detecta descalces donde el gasto financiero supera al avance real de construcción.
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-bold">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Avance Físico (%)
                </span>
                <span className="flex items-center gap-1.5 text-amber-400">
                  <span className="w-3 h-3 rounded bg-amber-500 inline-block" /> Ejecución Financiera (%)
                </span>
                <button
                  onClick={() => handleToggleWidget('progressComparison')}
                  title="Ocultar Widget"
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-200"
                >
                  <EyeOff className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={progressChartData} margin={{ top: 15, right: 15, left: 0, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis stroke="#94a3b8" fontSize={11} unit="%" domain={[0, 120]} />
                  <Tooltip content={<CustomProgressTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <ReferenceLine y={100} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: '100% Límite', fill: '#f43f5e', fontSize: 10, position: 'right' }} />
                  <Bar dataKey="avanceFisico" name="Avance Físico (%)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="ejecucionFinanciera" name="Ejecución Financiera (%)" radius={[4, 4, 0, 0]} barSize={20}>
                    {progressChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.ejecucionFinanciera > 100 ? '#f43f5e' : entry.isAlert ? '#f59e0b' : '#3b82f6'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* WIDGET 4: STACKED BUDGET COMPARISON */}
        {visibleWidgets.stackedBudget && (
          <div className="relative group bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  Comparativa de Presupuesto Asignado vs. Gasto Acumulado (Barras Apiladas)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Gráfico apilado que visibiliza el saldo disponible frente al gasto real ejecutado y sobrecostos excedidos.
                </p>
              </div>

              <div className="flex items-center flex-wrap gap-3 text-xs font-bold">
                <span className="flex items-center gap-1.5 text-blue-400">
                  <span className="w-3 h-3 rounded bg-blue-600 inline-block" /> Gasto Real
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-3 h-3 rounded bg-slate-700 inline-block" /> Disponible
                </span>
                <span className="flex items-center gap-1.5 text-rose-400">
                  <span className="w-3 h-3 rounded bg-rose-600 inline-block" /> Exceso
                </span>
                <button
                  onClick={() => handleToggleWidget('stackedBudget')}
                  title="Ocultar Widget"
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-200"
                >
                  <EyeOff className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stackedChartData} margin={{ top: 15, right: 20, left: 10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} angle={-15} textAnchor="end" />
                  <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(val) => `Q${(val / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomStackedTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="gastoReal" name="Gasto Ejercido" stackId="a" fill="#2563eb" barSize={32} />
                  <Bar dataKey="saldoDisponible" name="Saldo Disponible" stackId="a" fill="#334155" barSize={32} />
                  <Bar dataKey="sobrecostoExcedido" name="Sobrecosto Excedido" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* WIDGET 5: MONTHLY EXPENSES HISTOGRAM */}
        {visibleWidgets.expensesHistogram && (
          <div className="relative group">
            <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition">
              <button
                onClick={() => handleToggleWidget('expensesHistogram')}
                title="Ocultar Widget"
                className="p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>
            </div>
            <MonthlyExpensesHistogram
              projects={filteredProjects}
              expenses={expenses}
              company={company}
              currency="GTQ"
            />
          </div>
        )}

        {/* WIDGET 6: D3 BUDGET UTILIZATION */}
        {visibleWidgets.budgetUtilization && (
          <div className="relative group">
            <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition">
              <button
                onClick={() => handleToggleWidget('budgetUtilization')}
                title="Ocultar Widget"
                className="p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>
            </div>
            <D3BudgetUtilizationChart
              projects={filteredProjects}
              activeProjectId={activeProjectId || filteredProjects[0]?.id || ''}
              onSelectProject={setActiveProjectId}
              currency="GTQ"
              company={company}
            />
          </div>
        )}

        {/* WIDGET 7: PROJECT BREAKDOWN CARDS */}
        {visibleWidgets.projectBreakdown && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-sky-400" />
                Desglose Individual de Obras Activas ({filteredProjects.length})
              </h3>
              <button
                onClick={() => handleToggleWidget('projectBreakdown')}
                title="Ocultar Widget"
                className="p-1 rounded-lg text-slate-500 hover:text-slate-200"
              >
                <EyeOff className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((p) => {
                const spent = totals.projectSpentMap.get(p.id) || p.spentTotal || 0;
                const budget = p.budgetTotal || 0;
                const isOver = spent > budget;
                const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;

                return (
                  <div
                    key={p.id}
                    className={`p-4 rounded-2xl border transition ${
                      isOver
                        ? 'bg-rose-950/20 border-rose-800/80 hover:border-rose-600'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">
                          {p.code || p.id}
                        </span>
                        <h4 className="font-extrabold text-white text-sm mt-0.5">{p.name}</h4>
                        <p className="text-[11px] text-slate-400">{p.client} • {p.municipality}, {p.department}</p>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold font-mono ${
                          isOver
                            ? 'bg-rose-900/80 text-rose-200 border border-rose-700'
                            : 'bg-emerald-900/60 text-emerald-300 border border-emerald-700'
                        }`}
                      >
                        {pct}% Ejercido
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="bg-slate-800/60 p-2 rounded-xl border border-slate-700/50">
                        <span className="text-[10px] text-slate-400 font-sans block">Presupuesto:</span>
                        <strong className="text-white text-xs">{formatGTQ(budget)}</strong>
                      </div>
                      <div className="bg-slate-800/60 p-2 rounded-xl border border-slate-700/50">
                        <span className="text-[10px] text-slate-400 font-sans block">Gasto Real:</span>
                        <strong className={isOver ? 'text-rose-400 text-xs' : 'text-sky-400 text-xs'}>
                          {formatGTQ(spent)}
                        </strong>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Avance Físico: {p.progressPercent}%</span>
                        <span>{isOver ? `Sobrecosto: +${formatGTQ(spent - budget)}` : `Disponible: ${formatGTQ(budget - spent)}`}</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            isOver ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ================= WIDGET SELECTION MODAL ================= */}
      {isWidgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-6 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <SlidersHorizontal className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-lg font-extrabold text-white">Personalizar Panel de Control & Widgets</h3>
                  <p className="text-xs text-slate-400">
                    Selecciona qué gráficos y módulos de alta prioridad deseas visualizar en tu tablero.
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsWidgetModalOpen(false)} className="p-2 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs bg-slate-800/50 p-3 rounded-2xl border border-slate-800">
              <span className="text-slate-400 font-bold">Modos Rápidos:</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleSetOnlyHighPriority} className="text-xs font-bold text-amber-300">
                  Alta Prioridad (4)
                </Button>
                <Button variant="outline" size="sm" onClick={handleResetWidgets} className="text-xs font-bold">
                  <RotateCcw className="w-3.5 h-3.5 mr-1" /> Todos Visibles
                </Button>
              </div>
            </div>

            {/* Widget List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {WIDGET_CATALOG.map((widget) => {
                const isVisible = visibleWidgets[widget.id];
                const IconComponent = widget.icon;

                return (
                  <div
                    key={widget.id}
                    onClick={() => handleToggleWidget(widget.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between gap-4 ${
                      isVisible
                        ? 'bg-slate-800/80 border-amber-500/50 shadow-md'
                        : 'bg-slate-900/40 border-slate-800/60 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`p-2.5 rounded-xl border mt-0.5 ${
                        isVisible
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}>
                        <IconComponent className="w-5 h-5" />
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{widget.title}</h4>
                          {widget.priority === 'alta' && (
                            <span className="text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              Alta Prioridad
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{widget.description}</p>
                      </div>
                    </div>

                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition shrink-0 ${
                      isVisible
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-slate-800 border-slate-700 text-transparent'
                    }`}>
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {activeWidgetCount} de {WIDGET_CATALOG.length} widgets activos
              </span>
              <Button variant="primary" size="md" onClick={() => setIsWidgetModalOpen(false)}>
                Guardar Preferencias
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Tooltips
function CustomProgressTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-950 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 font-sans">
        <p className="font-extrabold text-white">{data.fullName}</p>
        <p className="text-[10px] text-amber-400 font-mono">Código: {data.code}</p>
        <div className="border-t border-slate-800 pt-1 space-y-1">
          <div className="flex justify-between gap-4 text-emerald-400 font-semibold">
            <span>Avance Físico:</span>
            <span>{data.avanceFisico}%</span>
          </div>
          <div className="flex justify-between gap-4 text-amber-400 font-semibold">
            <span>Ejecución Financiera:</span>
            <span>{data.ejecucionFinanciera}%</span>
          </div>
          <div className="flex justify-between gap-4 text-slate-300 font-mono">
            <span>Presupuesto:</span>
            <span>{formatGTQ(data.presupuesto)}</span>
          </div>
          <div className="flex justify-between gap-4 text-sky-400 font-mono">
            <span>Gasto Ejecutado:</span>
            <span>{formatGTQ(data.gastoReal)}</span>
          </div>
          {data.isAlert && (
            <p className="text-[10px] text-rose-400 font-bold pt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Alerta: Descalce financiero mayor al 10%
            </p>
          )}
        </div>
      </div>
    );
  }
  return null;
}

function CustomStackedTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-950 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 font-sans">
        <p className="font-extrabold text-white">{data.fullName}</p>
        <div className="border-t border-slate-800 pt-1 space-y-1 font-mono">
          <div className="flex justify-between gap-4 text-slate-300">
            <span>Presupuesto Proyectado:</span>
            <span>{formatGTQ(data.presupuestoAsignado)}</span>
          </div>
          <div className="flex justify-between gap-4 text-blue-400 font-bold">
            <span>Gasto Real Acumulado:</span>
            <span>{formatGTQ(data.totalGasto)}</span>
          </div>
          {data.isOverbudget ? (
            <div className="flex justify-between gap-4 text-rose-400 font-extrabold">
              <span>Exceso / Sobrecosto:</span>
              <span>+{formatGTQ(data.sobrecostoExcedido)}</span>
            </div>
          ) : (
            <div className="flex justify-between gap-4 text-emerald-400 font-bold">
              <span>Saldo Disponible:</span>
              <span>{formatGTQ(data.saldoDisponible)}</span>
            </div>
          )}
          <p className="text-[10px] text-slate-400 font-sans pt-1">
            Porcentaje Ejercido: <strong>{data.percentExecuted}%</strong>
          </p>
        </div>
      </div>
    );
  }
  return null;
}
