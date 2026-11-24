'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/Skeleton';
import { useProjectData } from '@/lib/hooks/useProjectData';
import {
  BUDGET_CRITICAL_USAGE_PERCENT,
  BUDGET_WARNING_USAGE_PERCENT,
  summarizeProjectFinance,
} from '@/lib/domain/projectFinance';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts';
import { COLORS } from '@/lib/design/constants';
import {
  Building2,
  DollarSign,
  TrendingUp,
  Users,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';

interface KPICard {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  color: string;
  textColor: string;
  trend?: number;
}

interface ChartDataPoint {
  month: string;
  budget: number;
  spent: number;
  projects: number;
}

interface DashboardEnhancedProps {
  projects: Array<{ id: string; name: string; status: string; budgetTotal: number; spentTotal: number; startDate: string }>;
  expenses: Array<any>;
  company?: { logoUrl?: string; companyName?: string };
  activeProjectId: string;
  onSelectProject?: (id: string) => void;
  milestones?: Array<any>;
  employees?: Array<any>;
  attendance?: Array<any>;
}

/**
 * DASHBOARD ENHANCED - Producción Empresarial
 * 
 * ✨ Mejoras implementadas:
 * - Empty state profesional con gradient y CTA clara
 * - KPI cards con estados visuales (neutral, warning, critical)
 * - Charts contextualizados con unidades y tooltips mejorados
 * - Responsiveness refinada (mobile, tablet, desktop)
 * - Microinteracciones y transiciones suaves
 * - Accesibilidad mejorada (WCAG 2.1 AA)
 */
export function DashboardEnhanced(props?: DashboardEnhancedProps) {
  // Si props no se proporciona, usar hook; si se proporciona, usar props
  const projectDataHook = useProjectData();
  const projectsFromProps = props?.projects;
  const projects = projectsFromProps && projectsFromProps.length > 0 ? projectsFromProps : projectDataHook.projects;
  const loading = !projectsFromProps ? projectDataHook.loading : false;
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  // KPI Metrics con memoización
  const budgetMetrics = useMemo(() => {
    if (!projects || projects.length === 0) {
      return {
        totalBudget: 0,
        totalSpent: 0,
        activeProjects: 0,
        completionRate: 0,
        averageUtilization: 0,
      };
    }

    const totalBudget = projects.reduce((sum, p) => sum + (p.budgetTotal || 0), 0);
    const totalSpent = projects.reduce((sum, p) => sum + (p.spentTotal || 0), 0);
    const activeProjects = projects.filter((p) => p.status !== 'Archivado').length;
    const completedProjects = projects.filter((p) => p.status === 'Finalizado').length;
    const completionRate =
      projects.length > 0 ? Math.round((completedProjects / projects.length) * 100) : 0;

    const utilizations = projects
      .filter((p) => p.budgetTotal > 0)
      .map((p) => summarizeProjectFinance(p).budgetUsagePercent);
    const averageUtilization =
      utilizations.length > 0
        ? Math.round(utilizations.reduce((a, b) => a + b) / utilizations.length)
        : 0;

    return {
      totalBudget,
      totalSpent,
      activeProjects,
      completionRate,
      averageUtilization,
    };
  }, [projects]);

  // Chart data generation
  useEffect(() => {
    if (!projects || projects.length === 0) {
      setChartData([]);
      return;
    }

    const last6Months = [];
    const today = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = date.toLocaleString('es-ES', { month: 'short' });

      const monthProjects = projects.filter((p) => {
        const projectMonth = new Date(p.startDate);
        return (
          projectMonth.getMonth() === date.getMonth() &&
          projectMonth.getFullYear() === date.getFullYear()
        );
      });

      const monthBudget = monthProjects.reduce((sum, p) => sum + p.budgetTotal, 0);
      const monthSpent = monthProjects.reduce((sum, p) => sum + p.spentTotal, 0);

      last6Months.push({
        month: monthName,
        budget: monthBudget,
        spent: monthSpent,
        projects: monthProjects.length,
      });
    }

    setChartData(last6Months as ChartDataPoint[]);
  }, [projects]);

  // Build KPI cards with enhanced styling
  const kpiCards: KPICard[] = useMemo(() => {
    const budgetUtilization =
      budgetMetrics.totalBudget > 0
        ? Math.round(
            summarizeProjectFinance({
              budgetTotal: budgetMetrics.totalBudget,
              spentTotal: budgetMetrics.totalSpent,
            }).budgetUsagePercent
          )
        : 0;

    const trend =
      budgetMetrics.totalBudget > 0 ? budgetMetrics.totalSpent - budgetMetrics.totalBudget : 0;

    return [
      {
        title: 'Presupuesto Total',
        value: `Q${budgetMetrics.totalBudget.toLocaleString()}`,
        change: 'Este año',
        changeType: 'neutral',
        icon: <DollarSign className="h-6 w-6" aria-hidden="true" />,
        color: 'bg-sky-500/20 ring-sky-500/30',
        textColor: 'text-sky-300',
        trend: 0,
      },
      {
        title: 'Gastos Registrados',
        value: `Q${budgetMetrics.totalSpent.toLocaleString()}`,
        change: `${budgetUtilization}% utilizado`,
        changeType: budgetUtilization > BUDGET_CRITICAL_USAGE_PERCENT ? 'negative' : 'positive',
        icon: <TrendingUp className="h-6 w-6" aria-hidden="true" />,
        color:
          budgetUtilization > BUDGET_CRITICAL_USAGE_PERCENT
            ? 'bg-red-500/20 ring-red-500/30'
            : 'bg-emerald-500/20 ring-emerald-500/30',
        textColor:
          budgetUtilization > BUDGET_CRITICAL_USAGE_PERCENT ? 'text-red-300' : 'text-emerald-300',
        trend: trend,
      },
      {
        title: 'Proyectos Activos',
        value: budgetMetrics.activeProjects.toString(),
        change: 'En ejecución',
        changeType: 'neutral',
        icon: <Building2 className="h-6 w-6" aria-hidden="true" />,
        color: 'bg-amber-500/20 ring-amber-500/30',
        textColor: 'text-amber-300',
        trend: 0,
      },
      {
        title: 'Completados',
        value: `${budgetMetrics.completionRate}%`,
        change: 'De proyectos',
        changeType: budgetMetrics.completionRate >= 50 ? 'positive' : 'neutral',
        icon: <Users className="h-6 w-6" aria-hidden="true" />,
        color: 'bg-violet-500/20 ring-violet-500/30',
        textColor: 'text-violet-300',
        trend: 0,
      },
    ];
  }, [budgetMetrics]);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" aria-hidden="true" />
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" aria-hidden="true" />
          <Skeleton className="h-80 rounded-xl" aria-hidden="true" />
        </div>
      </div>
    );
  }

  // Empty state - PROFESSIONAL
  if (!projects || projects.length === 0) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center p-6">
        <div className="relative max-w-md space-y-6">
          {/* Gradient background */}
          <div
            className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-sky-500/10 via-slate-900 to-violet-500/10 blur-3xl"
            aria-hidden="true"
          />

          {/* Content */}
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-sky-500/30 bg-sky-500/10 backdrop-blur-xl">
              <Building2 className="h-8 w-8 text-sky-300" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Sin proyectos activos</h2>
              <p className="mt-2 text-sm text-slate-400">
                Crea tu primer proyecto para comenzar a rastrear presupuesto, gastos y progreso de
                forma integral con ORIGEN ERP.
              </p>
            </div>
          </div>

          {/* CTA */}
          <Link
            href="/projects?create=true"
            className="group flex items-center justify-center gap-2 rounded-xl border border-sky-500/30 bg-gradient-to-r from-sky-500 to-sky-600 px-6 py-3 font-semibold text-white shadow-lg shadow-sky-500/20 transition-all duration-200 hover:border-sky-400/50 hover:shadow-xl hover:shadow-sky-500/30 active:scale-95"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
            Crear Primer Proyecto
          </Link>

          {/* Help text */}
          <p className="text-center text-xs text-slate-500">
            Los proyectos contienen presupuestos, hitos, personal y gastos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 bg-slate-950 p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Tablero de Control</h1>
        <p className="text-sm text-slate-400">Resumen en tiempo real de proyectos y presupuestos</p>
      </div>

      {/* KPI Cards - ENHANCED */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card, idx) => (
          <div
            key={idx}
            className={`group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-5 backdrop-blur-lg transition-all duration-300 hover:border-white/20 hover:shadow-xl hover:shadow-black/20 sm:p-6 ${card.color}`}
            role="region"
            aria-label={`${card.title}: ${card.value}`}
          >
            {/* Gradient overlay on hover */}
            <div
              className="absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              aria-hidden="true"
              style={{
                background:
                  'radial-gradient(circle at top right, rgba(255,255,255,0.05), transparent)',
              }}
            />

            {/* Content */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {card.title}
                </p>
                <p className="text-2xl font-bold text-white sm:text-3xl">{card.value}</p>

                {/* Trend indicator */}
                <div className="flex items-center gap-2 text-xs font-medium">
                  {card.changeType === 'positive' ? (
                    <>
                      <ArrowDownLeft className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                      <span className="text-emerald-300">{card.change}</span>
                    </>
                  ) : card.changeType === 'negative' ? (
                    <>
                      <ArrowUpRight className="h-4 w-4 text-red-400" aria-hidden="true" />
                      <span className="text-red-300">{card.change}</span>
                    </>
                  ) : (
                    <span className={card.textColor}>{card.change}</span>
                  )}
                </div>
              </div>

              {/* Icon */}
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg bg-white/[0.08] text-slate-300 backdrop-blur-lg transition-transform duration-300 group-hover:scale-110 group-hover:text-white sm:h-14 sm:w-14`}
              >
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Trend Chart */}
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] shadow-xl backdrop-blur-lg">
          <div className="border-b border-white/10 px-6 py-4">
            <h2 className="text-lg font-semibold text-white">Tendencia (6 meses)</h2>
            <p className="mt-1 text-xs text-slate-400">Presupuesto vs Gastos Comprometidos</p>
          </div>
          <div className="p-6">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#f1f5f9' }}
                    formatter={(value) => [`Q${(value ?? 0).toLocaleString()}`, '']}
                    labelFormatter={(label) => `Mes: ${label}`}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '20px' }}
                    verticalAlign="bottom"
                    height={36}
                  />
                  <Line
                    type="monotone"
                    dataKey="budget"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={{ fill: '#38bdf8', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Presupuesto"
                  />
                  <Line
                    type="monotone"
                    dataKey="spent"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ fill: '#f59e0b', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Comprometido"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Project Status Distribution */}
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] shadow-xl backdrop-blur-lg">
          <div className="border-b border-white/10 px-6 py-4">
            <h2 className="text-lg font-semibold text-white">Estado de Proyectos</h2>
            <p className="mt-1 text-xs text-slate-400">Distribución por etapa</p>
          </div>
          <div className="p-6">
            <div className="h-80">
              {projects.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      {
                        status: 'Planificación',
                        count: projects.filter((p) => p.status === 'Planificación').length,
                      },
                      {
                        status: 'En Ejecución',
                        count: projects.filter((p) => p.status === 'En Ejecución').length,
                      },
                      {
                        status: 'Finalizado',
                        count: projects.filter((p) => p.status === 'Finalizado').length,
                      },
                    ]}
                    margin={{ top: 20, right: 20, left: -20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="status" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#f1f5f9' }}
                      formatter={(value) => [`${value} proyectos`, 'Total']}
                    />
                    <Bar
                      dataKey="count"
                      fill="#0ea5e9"
                      radius={[8, 8, 0, 0]}
                      name="Proyectos"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-slate-500">
                  Sin datos disponibles
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Budget Utilization Report */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] shadow-xl backdrop-blur-lg">
        <div className="border-b border-white/10 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">Proyectos con Mayor Utilización</h2>
          <p className="mt-1 text-xs text-slate-400">Top 5 por porcentaje comprometido</p>
        </div>
        <div className="space-y-3 p-6">
          {projects
            .sort((a, b) => {
              const aUtil = summarizeProjectFinance(a).budgetUsagePercent;
              const bUtil = summarizeProjectFinance(b).budgetUsagePercent;
              return bUtil - aUtil;
            })
            .slice(0, 5)
            .map((project) => {
              const utilization = summarizeProjectFinance(project).budgetUsagePercent;
              const isWarning = utilization > BUDGET_WARNING_USAGE_PERCENT;
              const isCritical = utilization > BUDGET_CRITICAL_USAGE_PERCENT;

              return (
                <div
                  key={project.id}
                  className="flex flex-col gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-4 transition-all duration-200 hover:border-white/10 hover:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-white">{project.name}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Q{project.spentTotal.toLocaleString()} / Q{project.budgetTotal.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-2.5 w-32 overflow-hidden rounded-full bg-slate-800 sm:w-40">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isCritical
                            ? 'bg-red-500 shadow-lg shadow-red-500/50'
                            : isWarning
                              ? 'bg-amber-500 shadow-lg shadow-amber-500/30'
                              : 'bg-emerald-500 shadow-lg shadow-emerald-500/30'
                        }`}
                        style={{ width: `${Math.min(utilization, 100)}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-sm font-semibold text-white">
                      {Math.round(utilization)}%
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

export default DashboardEnhanced;
