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
  className?: string;
}

export function CashFlowProjectionChart({
  projects = [],
  milestones = [],
  className = '',
}: CashFlowProjectionChartProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [chartMode, setChartMode] = useState<'inflow_outflow' | 'net_cumulative'>('inflow_outflow');
  const [showMilestonesList, setShowMilestonesList] = useState<boolean>(true);
  const [startOffsetMonths, setStartOffsetMonths] = useState<number>(0); // 0 = Nov 2026, 1 = Dic 2026, etc.

  // Base date calculation: defaults to local November 2026 (local context 2026-10-23)
  const baseDate = useMemo(() => {
    const d = new Date(2026, 10 + startOffsetMonths, 1);
    return d;
  }, [startOffsetMonths]);

  // Compute 6-month cash flow summary
  const summary: CashFlowSummary = useMemo(() => {
    return calculateSixMonthCashFlow(projects, milestones, {
      startDate: baseDate,
      selectedProjectId,
    });
  }, [projects, milestones, baseDate, selectedProjectId]);

  const activeProjects = useMemo(() => {
    return projects.filter((p) => p.status !== 'Finalizado');
  }, [projects]);

  const isNetPositive = summary.totalFlujoNeto >= 0;

  return (
    <div className={`bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5 ${className}`}>
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Wallet className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                Proyección de Flujo de Caja Semestral (Basado en Hitos)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Estimación de ingresos por valuaciones de hitos de obra vs. egresos operativos para los próximos 6 meses ({summary.months[0]?.monthLabel} - {summary.months[5]?.monthLabel}).
              </p>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Project Filter */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 rounded-xl px-2.5 py-1">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-transparent text-slate-200 font-bold focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-800 text-white">
                Todos los Proyectos Activos ({activeProjects.length})
              </option>
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-800 text-white">
                  {p.code ? `${p.code} - ${p.name.substring(0, 20)}...` : p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-800 border border-slate-700 p-0.5 rounded-xl font-bold">
            <button
              onClick={() => setChartMode('inflow_outflow')}
              className={`px-2.5 py-1 rounded-lg transition ${
                chartMode === 'inflow_outflow'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Ingresos vs. Egresos
            </button>
            <button
              onClick={() => setChartMode('net_cumulative')}
              className={`px-2.5 py-1 rounded-lg transition ${
                chartMode === 'net_cumulative'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Flujo Neto & Saldo
            </button>
          </div>

          {/* Timeline Offset Navigator */}
          <div className="flex items-center gap-1 bg-slate-800/80 border border-slate-700 rounded-xl px-2 py-1">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <button
              onClick={() => setStartOffsetMonths((prev) => Math.max(-3, prev - 1))}
              disabled={startOffsetMonths <= -3}
              className="text-slate-400 hover:text-white disabled:opacity-30 px-1 font-mono font-bold"
              title="Mes anterior"
            >
              ◀
            </button>
            <span className="text-slate-300 font-mono text-[11px] px-1 font-bold">
              {summary.months[0]?.monthLabel}
            </span>
            <button
              onClick={() => setStartOffsetMonths((prev) => Math.min(12, prev + 1))}
              disabled={startOffsetMonths >= 12}
              className="text-slate-400 hover:text-white disabled:opacity-30 px-1 font-mono font-bold"
              title="Mes siguiente"
            >
              ▶
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards for the 6-Month Projection */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-800/50 border border-slate-700/60 p-3.5 rounded-xl">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Ingresos Proyectados (6M)
            </span>
            <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-lg sm:text-xl font-black text-emerald-400 mt-1 font-mono">
            {formatGTQ(summary.totalIngresos)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Por cobro de estimaciones de hitos
          </p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/60 p-3.5 rounded-xl">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Egresos Proyectados (6M)
            </span>
            <span className="p-1 rounded-lg bg-amber-500/10 text-amber-400">
              <ArrowDownRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-lg sm:text-xl font-black text-amber-400 mt-1 font-mono">
            {formatGTQ(summary.totalEgresos)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Costo de materiales, mano de obra y equipos
          </p>
        </div>

        <div
          className={`border p-3.5 rounded-xl ${
            isNetPositive
              ? 'bg-emerald-950/20 border-emerald-800/60'
              : 'bg-rose-950/20 border-rose-800/60'
          }`}
        >
          <div className="flex justify-between items-start">
            <span
              className={`text-[11px] font-bold uppercase tracking-wider ${
                isNetPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              Flujo Neto del Semestre
            </span>
            <span
              className={`p-1 rounded-lg ${
                isNetPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
            </span>
          </div>
          <p
            className={`text-lg sm:text-xl font-black mt-1 font-mono ${
              isNetPositive ? 'text-emerald-300' : 'text-rose-400'
            }`}
          >
            {isNetPositive ? '+' : ''}
            {formatGTQ(summary.totalFlujoNeto)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {isNetPositive ? 'Superávit operativo proyectado' : 'Requiere financiamiento o anticipos'}
          </p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/60 p-3.5 rounded-xl">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Hitos en el Semestre
            </span>
            <span className="p-1 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Target className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-lg sm:text-xl font-black text-cyan-400 mt-1">
            {summary.totalHitosCount} Hitos Programados
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Pico de cobro en: <strong className="text-slate-200">{summary.maxMonthIngreso.monthLabel}</strong>
          </p>
        </div>
      </div>

      {/* Main Area Chart */}
      <div className="h-80 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={summary.months}
            margin={{ top: 15, right: 25, left: 10, bottom: 15 }}
          >
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

            <XAxis
              dataKey="monthLabel"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              dy={5}
            />

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
                  name="Egresos Estimados (Costos Obra)"
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
                  name="Flujo Neto Mensual (Q)"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorFlujoNeto)"
                />
                <Area
                  type="monotone"
                  dataKey="flujoAcumulado"
                  name="Saldo de Tesorería Acumulado"
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
      <div className="bg-slate-800/40 border border-slate-700/80 rounded-xl p-3.5 flex items-start gap-3 text-xs">
        <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="text-slate-200 font-bold">
            Análisis de Tesorería por Calendario de Hitos:
          </p>
          <p className="text-slate-400">
            El mes con mayor concentración de facturación es <strong className="text-emerald-400">{summary.maxMonthIngreso.monthLabel}</strong> ({formatGTQ(summary.maxMonthIngreso.amount)}). Se recomienda coordinar con los comités de supervisión técnica con 15 días de anticipación la certificación de pruebas de laboratorio para evitar demoras en la liberación de cheques de estimación.
          </p>
        </div>
      </div>

      {/* Collapsible Milestone Breakdown Drawer */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
        <button
          onClick={() => setShowMilestonesList(!showMilestonesList)}
          className="w-full flex items-center justify-between p-3.5 bg-slate-800/50 hover:bg-slate-800 text-left transition"
        >
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Detalle de Hitos del Cronograma en el Periodo ({summary.allMilestonesInPeriod.length})
            </span>
          </div>
          <span className="text-xs text-slate-400 flex items-center gap-1 font-semibold">
            {showMilestonesList ? 'Ocultar' : 'Ver detalle'}
            {showMilestonesList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>

        {showMilestonesList && (
          <div className="p-3 overflow-x-auto">
            {summary.allMilestonesInPeriod.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">
                No hay hitos programados en los 6 meses seleccionados. Modifica el horizonte temporal con los controles superiores.
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
                    <tr key={m.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-2.5 text-slate-300 flex items-center gap-1.5 font-sans">
                        <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
                        {m.targetDate}
                      </td>
                      <td className="py-2.5 font-sans text-slate-200">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-amber-400 font-bold mr-1">
                          {m.projectCode}
                        </span>
                        {m.projectName.substring(0, 20)}
                      </td>
                      <td className="py-2.5 font-sans text-white font-medium">
                        {m.title}
                        <span className="text-[10px] text-slate-400 block font-sans">
                          Fase: {m.phase}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-slate-300">
                        {m.weightPercent}%
                      </td>
                      <td className="py-2.5 text-right font-bold text-emerald-400">
                        {formatGTQ(m.estimatedBillingGTQ)}
                      </td>
                      <td className="py-2.5 text-right text-amber-400">
                        {formatGTQ(m.estimatedCostGTQ)}
                      </td>
                      <td className="py-2.5 text-center font-sans">
                        {m.completed ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Cumplido
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                            <Clock className="w-2.5 h-2.5" /> Programado
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
      <div className="bg-slate-950 border border-slate-700 p-3.5 rounded-xl shadow-2xl text-xs space-y-2 font-sans min-w-[240px]">
        <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
          <strong className="text-white text-sm">{data.fullMonthName}</strong>
          <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
            {data.hitosCount} {data.hitosCount === 1 ? 'Hito' : 'Hitos'}
          </span>
        </div>

        <div className="space-y-1 font-mono text-[11px]">
          <div className="flex justify-between items-center text-emerald-400 font-bold">
            <span className="flex items-center gap-1 font-sans">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              Ingresos (Cobros):
            </span>
            <span>{formatGTQ(data.ingresos)}</span>
          </div>

          <div className="flex justify-between items-center text-amber-400 font-bold">
            <span className="flex items-center gap-1 font-sans">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              Egresos (Costos):
            </span>
            <span>{formatGTQ(data.egresos)}</span>
          </div>

          <div
            className={`flex justify-between items-center font-extrabold pt-1 border-t border-slate-800 ${
              isPositive ? 'text-cyan-300' : 'text-rose-400'
            }`}
          >
            <span className="font-sans">Flujo Neto Mensual:</span>
            <span>
              {isPositive ? '+' : ''}
              {formatGTQ(data.flujoNeto)}
            </span>
          </div>

          <div className="flex justify-between items-center text-indigo-300 font-bold">
            <span className="font-sans">Saldo Acumulado:</span>
            <span>{formatGTQ(data.flujoAcumulado)}</span>
          </div>
        </div>

        {data.hitos && data.hitos.length > 0 && (
          <div className="border-t border-slate-800/80 pt-1.5 space-y-1 text-[10px]">
            <p className="text-slate-400 font-bold font-sans uppercase">Hitos a entregar:</p>
            {data.hitos.map((h, i) => (
              <div key={i} className="text-slate-300 truncate">
                • <strong className="text-white">{h.projectCode}:</strong> {h.title} ({formatGTQ(h.estimatedBillingGTQ)})
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  return null;
}
