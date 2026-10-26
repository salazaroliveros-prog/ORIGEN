'use client';

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Building2,
  ChevronDown,
  ChevronUp,
  Sliders,
  Wallet,
  CalendarDays,
  Target,
  Sparkles,
} from 'lucide-react';
import { Project, Milestone } from '@/lib/types';
import { formatGTQ } from '@/lib/data';
import {
  calculateSixMonthCashFlow,
  CashFlowMonth,
  CashFlowMilestone,
  CashFlowSummary,
} from '@/lib/cashFlowService';

interface CashFlowProjectionChartProps {
  projects: Project[];
  milestones?: Milestone[];
  activeProjectId: string;
  onSelectProject: (projectId: string) => void;
  className?: string;
}

export function CashFlowProjectionChart({
  projects = [],
  milestones = [],
  activeProjectId,
  onSelectProject,
  className = '',
}: CashFlowProjectionChartProps) {
  const [showAllProjects, setShowAllProjects] = useState(false);
  const selectedProjectId = showAllProjects
    ? 'all'
    : projects.some(
          (project) =>
            project.id === activeProjectId &&
            project.status !== 'Finalizado' &&
            project.status !== 'Archivado'
        )
      ? activeProjectId
      : (projects.find(
          (project) => project.status !== 'Finalizado' && project.status !== 'Archivado'
        )?.id ?? 'all');
  const [chartMode, setChartMode] = useState<'inflow_outflow' | 'net_cumulative'>('inflow_outflow');
  const [showMilestonesList, setShowMilestonesList] = useState<boolean>(true);
  const [startOffsetMonths, setStartOffsetMonths] = useState<number>(0);

  const baseDate = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + startOffsetMonths, 1);
  }, [startOffsetMonths]);

  // Compute 6-month cash flow summary
  const summary: CashFlowSummary = useMemo(() => {
    return calculateSixMonthCashFlow(projects, milestones, {
      startDate: baseDate,
      selectedProjectId,
    });
  }, [projects, milestones, baseDate, selectedProjectId]);

  const activeProjects = useMemo(() => {
    return projects.filter((p) => p.status !== 'Finalizado' && p.status !== 'Archivado');
  }, [projects]);

  const isNetPositive = summary.costEstimatesComplete && summary.totalFlujoNeto >= 0;
  const netColor = !summary.costEstimatesComplete
    ? 'text-slate-300'
    : isNetPositive
      ? 'text-emerald-400'
      : 'text-rose-400';

  return (
    <div
      className={`space-y-5 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl sm:p-6 ${className}`}
    >
      {/* Header and Controls */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-800 pb-4 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-2 text-cyan-400">
              <Wallet className="h-5 w-5" />
            </span>
            <div>
              <h2 className="flex items-center gap-2 text-base font-extrabold text-white">
                Proyección de Flujo de Caja Semestral (Basado en Hitos)
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Ingresos por hitos guardados y costos estimados con margen configurado (
                {summary.months[0]?.monthLabel} - {summary.months[5]?.monthLabel}).
              </p>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Project Filter */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-2.5 py-1">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            <select
              aria-label="Filtrar flujo de caja por proyecto"
              value={selectedProjectId}
              onChange={(e) => {
                const projectId = e.target.value;
                setShowAllProjects(projectId === 'all');
                if (projectId !== 'all') onSelectProject(projectId);
              }}
              className="cursor-pointer bg-transparent font-bold text-slate-200 focus:outline-none"
            >
              <option value="all" className="bg-slate-800 text-white">
                Todos los Proyectos Activos ({activeProjects.length})
              </option>
              {activeProjects.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-800 text-white">
                  {p.code ? `${p.code} - ${p.name.substring(0, 20)}...` : p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center rounded-xl border border-slate-700 bg-slate-800 p-0.5 font-bold">
            <button
              onClick={() => setChartMode('inflow_outflow')}
              className={`rounded-lg px-2.5 py-1 transition ${
                chartMode === 'inflow_outflow'
                  ? 'bg-cyan-700 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Ingresos vs. Egresos
            </button>
            <button
              onClick={() => setChartMode('net_cumulative')}
              className={`rounded-lg px-2.5 py-1 transition ${
                chartMode === 'net_cumulative'
                  ? 'bg-cyan-700 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Flujo Neto & Saldo
            </button>
          </div>

          {/* Timeline Offset Navigator */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800/80 px-2 py-1">
            <Calendar className="h-3.5 w-3.5 text-amber-400" />
            <button
              onClick={() => setStartOffsetMonths((prev) => Math.max(-3, prev - 1))}
              disabled={startOffsetMonths <= -3}
              className="px-1 font-mono font-bold text-slate-400 hover:text-white disabled:opacity-30"
              title="Mes anterior"
            >
              ◀
            </button>
            <span className="px-1 font-mono text-[11px] font-bold text-slate-300">
              {summary.months[0]?.monthLabel}
            </span>
            <button
              onClick={() => setStartOffsetMonths((prev) => Math.min(12, prev + 1))}
              disabled={startOffsetMonths >= 12}
              className="px-1 font-mono font-bold text-slate-400 hover:text-white disabled:opacity-30"
              title="Mes siguiente"
            >
              ▶
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards for the 6-Month Projection */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-700/60 bg-slate-800/50 p-3.5">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Ingresos Proyectados (6M)
            </span>
            <span className="rounded-lg bg-emerald-500/10 p-1 text-emerald-400">
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-1 font-mono text-lg font-black text-emerald-400 sm:text-xl">
            {formatGTQ(summary.totalIngresos)}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400">Por cobro de estimaciones de hitos</p>
        </div>

        <div className="rounded-xl border border-slate-700/60 bg-slate-800/50 p-3.5">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Egresos Proyectados (6M)
            </span>
            <span className="rounded-lg bg-amber-500/10 p-1 text-amber-400">
              <ArrowDownRight className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-1 font-mono text-lg font-black text-amber-400 sm:text-xl">
            {formatGTQ(summary.totalEgresos)}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400">
            Solo incluye hitos con margen configurado
          </p>
        </div>

        <div
          className={`rounded-xl border p-3.5 ${
            !summary.costEstimatesComplete
              ? 'border-slate-700/60 bg-slate-800/50'
              : isNetPositive
                ? 'border-emerald-800/60 bg-emerald-950/20'
                : 'border-rose-800/60 bg-rose-950/20'
          }`}
        >
          <div className="flex items-start justify-between">
            <span className={`text-[11px] font-bold tracking-wider uppercase ${netColor}`}>
              {summary.costEstimatesComplete ? 'Flujo Neto del Semestre' : 'Flujo Neto Parcial'}
            </span>
            <span
              className={`rounded-lg p-1 ${
                summary.costEstimatesComplete
                  ? isNetPositive
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/20 text-rose-400'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              <DollarSign className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className={`mt-1 font-mono text-lg font-black sm:text-xl ${netColor}`}>
            {isNetPositive ? '+' : ''}
            {formatGTQ(summary.totalFlujoNeto)}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400">
            {!summary.costEstimatesComplete
              ? 'Parcial: hay hitos sin margen para estimar costos'
              : isNetPositive
                ? 'Saldo proyectado según hitos'
                : 'Saldo negativo según hitos'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-700/60 bg-slate-800/50 p-3.5">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Hitos en el Semestre
            </span>
            <span className="rounded-lg bg-cyan-500/10 p-1 text-cyan-400">
              <Target className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-1 text-lg font-black text-cyan-400 sm:text-xl">
            {summary.totalHitosCount} Hitos Programados
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400">
            {summary.totalHitosCount > 0 ? (
              <>
                Pico de cobro en:{' '}
                <strong className="text-slate-200">{summary.maxMonthIngreso.monthLabel}</strong>
              </>
            ) : (
              'Basado únicamente en hitos guardados'
            )}
          </p>
        </div>
      </div>

      {/* Main Area Chart */}
      <div className="h-80 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={summary.months} margin={{ top: 15, right: 25, left: 10, bottom: 15 }}>
            <defs>
              {/* Gradient for Ingresos (Emerald) */}
              <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.65} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>

              {/* Gradient for Egresos (Amber) */}
              <linearGradient id="colorEgresos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
              </linearGradient>

              {/* Gradient for Flujo Neto (Cyan) */}
              <linearGradient id="colorFlujoNeto" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
              </linearGradient>

              {/* Gradient for Saldo Acumulado (Indigo/Violet) */}
              <linearGradient id="colorAcumulado" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.55} />
                <stop offset="95%" stopColor="#818cf8" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />

            <XAxis dataKey="monthLabel" stroke="#94a3b8" fontSize={11} tickLine={false} dy={5} />

            <YAxis
              stroke="#94a3b8"
              fontSize={10}
              tickFormatter={(val) => `Q${(val / 1000).toFixed(0)}k`}
            />

            <Tooltip content={<CustomCashFlowTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
            <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />

            {chartMode === 'inflow_outflow' ? (
              <>
                <Area
                  type="monotone"
                  dataKey="ingresos"
                  name="Ingresos Estimados (Cobro Hitos)"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorIngresos)"
                />
                <Area
                  type="monotone"
                  dataKey="egresos"
                  name="Costos Estimados (Hitos con Margen)"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorEgresos)"
                />
              </>
            ) : (
              <>
                <Area
                  type="monotone"
                  dataKey="flujoNeto"
                  name={
                    summary.costEstimatesComplete
                      ? 'Flujo Neto Mensual (Q)'
                      : 'Flujo Neto Parcial (faltan márgenes)'
                  }
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorFlujoNeto)"
                />
                <Area
                  type="monotone"
                  dataKey="flujoAcumulado"
                  name={
                    summary.costEstimatesComplete
                      ? 'Saldo de Tesorería Acumulado'
                      : 'Saldo Acumulado Parcial'
                  }
                  stroke="#818cf8"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorAcumulado)"
                />
              </>
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Strategic Insight Alert */}
      <div className="flex items-start gap-3 rounded-xl border border-slate-700/80 bg-slate-800/40 p-3.5 text-xs">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <div className="space-y-0.5">
          <p className="font-bold text-slate-200">Análisis de Tesorería por Calendario de Hitos:</p>
          <p className="text-slate-400">
            {summary.totalHitosCount > 0 ? (
              <>
                El mes con mayor concentración de facturación proyectada es{' '}
                <strong className="text-emerald-400">{summary.maxMonthIngreso.monthLabel}</strong> (
                {formatGTQ(summary.maxMonthIngreso.amount)}). Los ingresos estimados usan hitos
                guardados y el presupuesto de cada proyecto; los costos requieren un margen
                configurado.
              </>
            ) : (
              'No hay hitos guardados dentro del periodo seleccionado. Registra el cronograma del proyecto para calcular una proyección; no se generan hitos automáticamente.'
            )}
          </p>
          {!summary.costEstimatesComplete && summary.totalHitosCount > 0 && (
            <p className="text-amber-300">
              El flujo neto es parcial: configura el margen de utilidad de cada proyecto para
              estimar el costo de todos sus hitos.
            </p>
          )}
        </div>
      </div>

      {/* Collapsible Milestone Breakdown Drawer */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40">
        <button
          onClick={() => setShowMilestonesList(!showMilestonesList)}
          className="flex w-full items-center justify-between bg-slate-800/50 p-3.5 text-left transition hover:bg-slate-800"
        >
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-bold tracking-wider text-white uppercase">
              Detalle de Hitos del Cronograma en el Periodo ({summary.allMilestonesInPeriod.length})
            </span>
          </div>
          <span className="flex items-center gap-1 text-xs font-semibold text-slate-400">
            {showMilestonesList ? 'Ocultar' : 'Ver detalle'}
            {showMilestonesList ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </span>
        </button>

        {showMilestonesList && (
          <div className="overflow-x-auto p-3">
            {summary.allMilestonesInPeriod.length === 0 ? (
              <p className="py-3 text-center text-xs text-slate-400">
                No hay hitos registrados en los 6 meses seleccionados. La proyección utiliza
                únicamente datos guardados en el cronograma.
              </p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase">
                    <th className="pb-2">Fecha Objetivo</th>
                    <th className="pb-2">Proyecto</th>
                    <th className="pb-2">Hito / Fase</th>
                    <th className="pb-2 text-right">Peso</th>
                    <th className="pb-2 text-right">Facturación Estimada</th>
                    <th className="pb-2 text-right">Costo Estimado</th>
                    <th className="pb-2 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {summary.allMilestonesInPeriod.map((m) => (
                    <tr key={`${m.projectId}:${m.id}`} className="transition hover:bg-slate-800/30">
                      <td className="flex items-center gap-1.5 py-2.5 font-sans text-slate-300">
                        <Clock className="h-3 w-3 shrink-0 text-cyan-400" />
                        {m.targetDate}
                      </td>
                      <td className="py-2.5 font-sans text-slate-200">
                        <span className="mr-1 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                          {m.projectCode}
                        </span>
                        {m.projectName.substring(0, 20)}
                      </td>
                      <td className="py-2.5 font-sans font-medium text-white">
                        {m.title}
                        <span className="block font-sans text-[10px] text-slate-400">
                          Fase: {m.phase}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-slate-300">{m.weightPercent}%</td>
                      <td className="py-2.5 text-right font-bold text-emerald-400">
                        {formatGTQ(m.estimatedBillingGTQ)}
                      </td>
                      <td className="py-2.5 text-right text-amber-400">
                        {m.estimatedCostGTQ === null
                          ? 'Sin margen configurado'
                          : formatGTQ(m.estimatedCostGTQ)}
                      </td>
                      <td className="py-2.5 text-center font-sans">
                        {m.completed ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-800 bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Cumplido
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-cyan-800 bg-cyan-950 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                            <Clock className="h-2.5 w-2.5" /> Programado
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Custom Rich Tooltip for Cash Flow Area Chart
 */
function CustomCashFlowTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const data: CashFlowMonth = payload[0].payload;
    const isPositive = data.flujoNeto >= 0;

    return (
      <div className="min-w-[240px] space-y-2 rounded-xl border border-slate-700 bg-slate-950 p-3.5 font-sans text-xs shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <strong className="text-sm text-white">{data.fullMonthName}</strong>
          <span className="rounded border border-cyan-800 bg-cyan-950/60 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-400">
            {data.hitosCount} {data.hitosCount === 1 ? 'Hito' : 'Hitos'}
          </span>
        </div>

        <div className="space-y-1 font-mono text-[11px]">
          <div className="flex items-center justify-between font-bold text-emerald-400">
            <span className="flex items-center gap-1 font-sans">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Ingresos (Cobros):
            </span>
            <span>{formatGTQ(data.ingresos)}</span>
          </div>

          <div className="flex items-center justify-between font-bold text-amber-400">
            <span className="flex items-center gap-1 font-sans">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
              Egresos (Costos):
            </span>
            <span>{formatGTQ(data.egresos)}</span>
          </div>

          <div
            className={`flex items-center justify-between border-t border-slate-800 pt-1 font-extrabold ${
              isPositive ? 'text-cyan-300' : 'text-rose-400'
            }`}
          >
            <span className="font-sans">Flujo Neto Mensual:</span>
            <span>
              {isPositive ? '+' : ''}
              {formatGTQ(data.flujoNeto)}
            </span>
          </div>

          <div className="flex items-center justify-between font-bold text-indigo-300">
            <span className="font-sans">Saldo Acumulado:</span>
            <span>{formatGTQ(data.flujoAcumulado)}</span>
          </div>
        </div>

        {data.hitos && data.hitos.length > 0 && (
          <div className="space-y-1 border-t border-slate-800/80 pt-1.5 text-[10px]">
            <p className="font-sans font-bold text-slate-400 uppercase">Hitos a entregar:</p>
            {data.hitos.map((h, i) => (
              <div key={i} className="truncate text-slate-300">
                • <strong className="text-white">{h.projectCode}:</strong> {h.title} (
                {formatGTQ(h.estimatedBillingGTQ)})
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  return null;
}
