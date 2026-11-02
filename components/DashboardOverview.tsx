/**
 * ORIGEN ERP - Dashboard Overview Component
 * Enhanced with loading skeleton, memoization, chart improvements, and empty states
 * 
 * Features:
 * - Loading skeleton while fetching data
 * - Memoized KPI calculations
 * - Repositioned chart legends
 * - Empty state UI with CTA
 * - Real-time data updates
 * - Responsive grid layout
 */

'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useProjectData } from '@/lib/hooks/useProjectDataEnhanced';
import { calculateBudgetSummary } from '@/lib/utils/calculations';
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
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { COLORS } from '@/lib/design/constants';
import { Building2, DollarSign, TrendingUp, Users, AlertCircle, Loader } from 'lucide-react';
import { COLORS } from '@/lib/design/constants';

interface KPICard {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  color: string;
  textColor: string;
}

export function DashboardOverview() {
  const { projects, expenses, loading, error } = useProjectData();
  const [chartData, setChartData] = useState<any[]>([]);

  // FEATURE 2.1.2: KPI Memoization with proper dependencies
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
    const activeProjects = projects.filter(p => p.status !== 'Archivado').length;
    const completedProjects = projects.filter(p => p.status === 'Finalizado').length;
    const completionRate = projects.length > 0 ? 
      Math.round((completedProjects / projects.length) * 100) : 0;
    
    const utilizations = projects
      .filter(p => p.budgetTotal > 0)
      .map(p => (p.spentTotal / p.budgetTotal) * 100);
    const averageUtilization = utilizations.length > 0 
      ? Math.round(utilizations.reduce((a, b) => a + b) / utilizations.length)
      : 0;

    return {
      totalBudget,
      totalSpent,
      activeProjects,
      completionRate,
      averageUtilization,
    };
  }, [projects]); // ← CRITICAL: projects as dependency

  // Generate chart data
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

      const monthProjects = projects.filter(p => {
        const projectMonth = new Date(p.startDate);
        return projectMonth.getMonth() === date.getMonth() &&
               projectMonth.getFullYear() === date.getFullYear();
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

    setChartData(last6Months);
  }, [projects]);

  // Build KPI cards
  const kpiCards: KPICard[] = useMemo(() => {
    const budgetUtilization = budgetMetrics.totalBudget > 0
      ? Math.round((budgetMetrics.totalSpent / budgetMetrics.totalBudget) * 100)
      : 0;

    return [
      {
        title: 'Presupuesto Total',
        value: `Q${budgetMetrics.totalBudget.toLocaleString()}`,
        change: 'Este año',
        changeType: 'neutral',
        icon: <DollarSign className="h-6 w-6" />,
        color: COLORS.budget.bg,
        textColor: COLORS.budget.text,
      },
      {
        title: 'Gastos',
        value: `Q${budgetMetrics.totalSpent.toLocaleString()}`,
        change: `${budgetUtilization}% utilizado`,
        changeType: budgetUtilization > 80 ? 'negative' : 'positive',
        icon: <TrendingUp className="h-6 w-6" />,
        color: COLORS.expense.bg,
        textColor: COLORS.expense.text,
      },
      {
        title: 'Proyectos Activos',
        value: budgetMetrics.activeProjects.toString(),
        change: 'En ejecución',
        changeType: 'neutral',
        icon: <Building2 className="h-6 w-6" />,
        color: COLORS.active.bg,
        textColor: COLORS.active.text,
      },
      {
        title: 'Completados',
        value: `${budgetMetrics.completionRate}%`,
        change: 'De proyectos',
        changeType: 'positive',
        icon: <Users className="h-6 w-6" />,
        color: COLORS.completed.bg,
        textColor: COLORS.completed.text,
      },
    ];
  }, [budgetMetrics]);

  // FEATURE 2.1.1: Loading Skeleton
  if (loading) {
    return (
      <div className="space-y-6 p-6">
        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-lg" />
          <Skeleton className="h-80 rounded-lg" />
        </div>

        {/* Reports Skeleton */}
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-6 flex gap-4">
          <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-red-600">Error cargando datos</h3>
            <p className="text-sm text-red-500 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // FEATURE 2.1.4: Empty State UI - ENHANCED
  if (!projects || projects.length === 0) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center">
        <div className="rounded-lg border-2 border-dashed border-slate-300 p-12 text-center bg-slate-50 max-w-md hover:shadow-md transition-all duration-200">
          <div className="mb-4 inline-flex p-3 bg-blue-100 rounded-full">
            <Building2 className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-3">
            No hay proyectos activos
          </h3>
          <p className="text-sm text-slate-600 mb-6">
            Crea tu primer proyecto para comenzar a rastrear presupuesto, gastos y progreso de forma integral.
          </p>
          <Link
            href="/projects?create=true"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all duration-200 hover:shadow-lg"
          >
            <Plus className="h-5 w-5" />
            Crear Primer Proyecto
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-slate-50 min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-600 mt-1">
            Resumen de proyectos y presupuestos
          </p>
        </div>
      </div>

      {/* KPI Cards - FIXED: Improved spacing and color constants */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((card, idx) => (
          <div
            key={idx}
            className={`rounded-lg border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-600 mb-2">{card.title}</p>
                <p className="text-2xl font-bold text-slate-900 mb-3">
                  {card.value}
                </p>
                <p
                  className={`text-xs font-medium ${
                    card.changeType === 'positive'
                      ? 'text-green-600'
                      : card.changeType === 'negative'
                      ? 'text-red-600'
                      : 'text-slate-600'
                  }`}
                >
                  {card.change}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${card.color} flex-shrink-0`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section - FIXED: Improved spacing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart - FEATURE 2.1.3: Chart Legend Reposition */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">
            Tendencia de Gastos (6 meses)
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 0, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="month"
                  stroke="#94a3b8"
                  style={{ fontSize: '12px' }}
                />
                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#f1f5f9' }}
                  formatter={(value) => `Q${value.toLocaleString()}`}
                />
                {/* Legend repositioned with proper styling */}
                <Legend
                  wrapperStyle={{
                    paddingTop: '20px',
                    overflowX: 'auto',
                    whiteSpace: 'nowrap',
                    maxWidth: '100%',
                  }}
                  verticalAlign="bottom"
                  height={36}
                />
                <Line
                  type="monotone"
                  dataKey="budget"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Presupuesto"
                />
                <Line
                  type="monotone"
                  dataKey="spent"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ fill: '#ef4444', r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Gastado"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Project Status Distribution */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">
            Estado de Proyectos
          </h2>
          <div className="h-80 flex items-center justify-center">
            {projects.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    {
                      status: 'Planificación',
                      count: projects.filter(
                        p => p.status === 'Planificación'
                      ).length,
                    },
                    {
                      status: 'En Ejecución',
                      count: projects.filter(
                        p => p.status === 'En Ejecución'
                      ).length,
                    },
                    {
                      status: 'Finalizado',
                      count: projects.filter(
                        p => p.status === 'Finalizado'
                      ).length,
                    },
                  ]}
                  margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="status" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#f1f5f9' }}
                  />
                  <Bar
                    dataKey="count"
                    fill="#3b82f6"
                    radius={[8, 8, 0, 0]}
                    name="Proyectos"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500">Sin datos disponibles</p>
            )}
          </div>
        </div>
      </div>

      {/* Budget Utilization Report - FIXED: Improved spacing and progress bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-6">
          Proyectos con Mayor Utilización
        </h2>
        <div className="space-y-4">
          {projects
            .sort((a, b) => {
              const aUtil =
                a.budgetTotal > 0 ? (a.spentTotal / a.budgetTotal) * 100 : 0;
              const bUtil =
                b.budgetTotal > 0 ? (b.spentTotal / b.budgetTotal) * 100 : 0;
              return bUtil - aUtil;
            })
            .slice(0, 5)
            .map((project) => {
              const utilization =
                project.budgetTotal > 0
                  ? (project.spentTotal / project.budgetTotal) * 100
                  : 0;

              return (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{project.name}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Q{project.spentTotal.toLocaleString()} / Q
                      {project.budgetTotal.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    <div className="w-40 h-3 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          utilization > 80
                            ? 'bg-red-500'
                            : utilization > 50
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(utilization, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-slate-900 w-14 text-right">
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

export default DashboardOverview;
