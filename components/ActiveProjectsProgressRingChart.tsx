'use client';

import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Project, CompanySettings } from '@/lib/types';
import { formatGTQ, formatUSD } from '@/lib/data';
import {
  Activity,
  CheckCircle2,
  PieChart as PieChartIcon,
} from 'lucide-react';

interface ActiveProjectsProgressRingChartProps {
  projects: Project[];
  activeProjectId?: string;
  onSelectProject?: (id: string) => void;
  currency?: 'GTQ' | 'USD';
  company?: CompanySettings;
}

const COLOR_PALETTE = [
  '#38bdf8', // sky-400
  '#818cf8', // indigo-400
  '#f59e0b', // amber-500
  '#34d399', // emerald-400
  '#f43f5e', // rose-500
  '#a855f7', // purple-500
  '#06b6d4', // cyan-500
  '#ec4899', // pink-500
];

export function ActiveProjectsProgressRingChart({
  projects,
  activeProjectId,
  onSelectProject,
  currency = 'GTQ',
  company,
}: ActiveProjectsProgressRingChartProps) {
  const [calculationMode, setCalculationMode] = useState<'weighted' | 'average'>('weighted');

  const formatMoney = (amount: number) => {
    if (currency === 'USD' && company?.exchangeRate) {
      return formatUSD(amount, company.exchangeRate);
    }
    return formatGTQ(amount);
  };

  // Filter non-archived / active projects
  const activeProjects = useMemo(() => {
    return projects.filter((p) => p.status !== 'Archivado');
  }, [projects]);

  // Compute Cumulative Progress metrics
  const totalBudget = useMemo(() => {
    return activeProjects.reduce((sum, p) => sum + p.budgetTotal, 0);
  }, [activeProjects]);

  const totalSpent = useMemo(() => {
    return activeProjects.reduce((sum, p) => sum + p.spentTotal, 0);
  }, [activeProjects]);

  // Weighted progress (by budget weight) vs Simple average
  const cumulativeProgressPercent = useMemo(() => {
    if (activeProjects.length === 0) return 0;
    if (calculationMode === 'weighted' && totalBudget > 0) {
      const weightedSum = activeProjects.reduce(
        (sum, p) => sum + (p.budgetTotal * p.progressPercent) / 100,
        0
      );
      return Math.round((weightedSum / totalBudget) * 1000) / 10;
    }
    const simpleSum = activeProjects.reduce((sum, p) => sum + p.progressPercent, 0);
    return Math.round((simpleSum / activeProjects.length) * 10) / 10;
  }, [activeProjects, calculationMode, totalBudget]);

  // Data for Outer Ring (Individual Active Projects progress weighting)
  const outerRingData = useMemo(() => {
    return activeProjects.map((p, index) => {
      // Contribution weight to total
      const weight =
        totalBudget > 0
          ? Math.round((p.budgetTotal / totalBudget) * 100)
          : Math.round(100 / (activeProjects.length || 1));

      return {
        id: p.id,
        name: `${p.code} - ${p.name}`,
        code: p.code,
        shortName: p.name,
        value: calculationMode === 'weighted' ? Math.max(1, p.budgetTotal) : 1,
        progressPercent: p.progressPercent,
        spentTotal: p.spentTotal,
        budgetTotal: p.budgetTotal,
        status: p.status,
        weightPercent: weight,
        color: COLOR_PALETTE[index % COLOR_PALETTE.length],
      };
    });
  }, [activeProjects, totalBudget, calculationMode]);

  // Data for Inner Ring (Cumulative Total Progress vs Remaining)
  const innerRingData = useMemo(() => {
    const progressVal = Math.min(100, Math.max(0, cumulativeProgressPercent));
    const remainingVal = Math.max(0, 100 - progressVal);
    return [
      { name: 'Avance Acumulado Realizado', value: progressVal, color: '#38bdf8' },
      {
        name: 'Pendiente para Finalización',
        value: remainingVal,
        color: 'rgba(255, 255, 255, 0.08)',
      },
    ];
  }, [cumulativeProgressPercent]);

  return (
    <div className="glass-panel relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl backdrop-blur-xl">
      {/* Background Subtle Accent Glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-sky-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-indigo-500/10 blur-3xl" />

      {/* Widget Header */}
      <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-sky-400/30 bg-sky-500/20 text-sky-400">
              <PieChartIcon className="h-4 w-4" />
            </span>
            <h2 className="text-base font-bold text-white">Avance Porcentual Acumulado de Obras</h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Visualización gráfica en anillo del rendimiento físico consolidado de proyectos activos
            en Guatemala
          </p>
        </div>

        {/* Mode Selector Toggle */}
        <div className="inline-flex rounded-xl border border-white/10 bg-slate-950/80 p-1">
          <button
            type="button"
            onClick={() => setCalculationMode('weighted')}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
              calculationMode === 'weighted'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-950/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Ponderado (Presupuesto)
          </button>
          <button
            type="button"
            onClick={() => setCalculationMode('average')}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
              calculationMode === 'average'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-950/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Promedio Simple
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mt-5 grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
        {/* Recharts Donut / Ring Chart */}
        <div className="relative flex flex-col items-center justify-center lg:col-span-6">
          <div className="relative h-64 w-full max-w-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      if ('progressPercent' in data) {
                        return (
                          <div className="rounded-xl border border-slate-700 bg-slate-950/95 p-3 text-xs shadow-2xl backdrop-blur-md">
                            <p className="font-bold text-amber-400">{data.code}</p>
                            <p className="font-semibold text-white">{data.shortName}</p>
                            <div className="mt-2 space-y-1 text-slate-300">
                              <p className="flex justify-between gap-3">
                                <span>Avance Físico:</span>
                                <strong className="text-sky-400">{data.progressPercent}%</strong>
                              </p>
                              <p className="flex justify-between gap-3">
                                <span>Presupuesto:</span>
                                <strong className="text-white">
                                  {formatMoney(data.budgetTotal)}
                                </strong>
                              </p>
                              <p className="flex justify-between gap-3">
                                <span>Ejecutado:</span>
                                <strong className="text-emerald-400">
                                  {formatMoney(data.spentTotal)}
                                </strong>
                              </p>
                              <p className="flex justify-between gap-3">
                                <span>Peso en Cartera:</span>
                                <strong className="text-indigo-300">{data.weightPercent}%</strong>
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div className="rounded-xl border border-slate-700 bg-slate-950/95 p-2.5 text-xs text-white">
                          <p className="font-bold">{data.name}</p>
                          <p className="font-semibold text-sky-400">
                            {data.value}% de la meta global
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                {/* Outer Ring: Individual Active Projects */}
                <Pie
                  data={outerRingData}
                  cx="50%"
                  cy="50%"
                  innerRadius={72}
                  outerRadius={96}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="#0f172a"
                  strokeWidth={2}
                >
                  {outerRingData.map((entry) => (
                    <Cell
                      key={`outer-cell-${entry.id}`}
                      fill={entry.color}
                      className="cursor-pointer transition-opacity hover:opacity-80"
                      onClick={() => onSelectProject?.(entry.id)}
                    />
                  ))}
                </Pie>

                {/* Inner Ring: Global Cumulative Progress Indicator */}
                <Pie
                  data={innerRingData}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={66}
                  paddingAngle={1}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  stroke="none"
                >
                  {innerRingData.map((entry, idx) => (
                    <Cell key={`inner-cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Center Stat Badge overlay inside Donut Hole */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Avance Global
              </span>
              <span className="text-3xl font-black tracking-tight text-white drop-shadow-md">
                {cumulativeProgressPercent}%
              </span>
              <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                <Activity className="h-3 w-3" />
                {activeProjects.length} Proyectos
              </span>
            </div>
          </div>
        </div>

        {/* Breakdown List & Metrics Table */}
        <div className="space-y-3 lg:col-span-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Desglose de Avance Físico por Obra
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              Total Inversión: <strong className="text-white">{formatMoney(totalBudget)}</strong>
            </span>
          </div>

          <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
            {outerRingData.map((p) => {
              const isSelected = p.id === activeProjectId;
              return (
                <div
                  key={p.id}
                  onClick={() => onSelectProject?.(p.id)}
                  className={`group flex cursor-pointer items-center justify-between rounded-xl border p-2.5 transition ${
                    isSelected
                      ? 'border-sky-400/50 bg-sky-500/10 shadow-lg shadow-sky-950/40'
                      : 'border-white/5 bg-slate-950/50 hover:border-white/20 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-3.5 w-3.5 shrink-0 rounded-full shadow-sm"
                      style={{ backgroundColor: p.color }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-sky-400">
                          {p.code}
                        </span>
                        <span className="text-xs font-bold text-white transition-colors group-hover:text-sky-300">
                          {p.shortName}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Presupuesto: {formatMoney(p.budgetTotal)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Mini Progress Bar */}
                    <div className="hidden w-20 sm:block">
                      <div className="mb-0.5 flex justify-between text-[10px] text-slate-400">
                        <span>Físico</span>
                        <span className="font-bold text-slate-200">{p.progressPercent}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full transition duration-500"
                          style={{
                            width: `${p.progressPercent}%`,
                            backgroundColor: p.color,
                          }}
                        />
                      </div>
                    </div>

                    <span className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-xs font-black text-white">
                      {p.progressPercent}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Summary Strip */}
          <div className="mt-3 flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/80 p-3 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span className="text-slate-300">
                Ejecutado: <strong className="text-emerald-400">{formatMoney(totalSpent)}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span>Restante:</span>
              <strong className="text-amber-400">
                {formatMoney(Math.max(0, totalBudget - totalSpent))}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
