'use client';

import { formatGTQ, formatUSD } from '@/lib/data';
import { CompanySettings, Project } from '@/lib/types';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  HardHat,
  Scale,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface PhysicalVsFinancialChartProps {
  projects: Project[];
  currency: 'GTQ' | 'USD';
  company: CompanySettings;
  onSelectProject?: (projectId: string) => void;
}

export function PhysicalVsFinancialChart({
  projects,
  currency,
  company,
  onSelectProject,
}: PhysicalVsFinancialChartProps) {
  const formatMoney = (amount: number) => {
    return currency === 'GTQ' ? formatGTQ(amount) : formatUSD(amount, company.exchangeRate);
  };

  const chartData = useMemo(() => {
    return projects.map((p) => {
      const avanceFisico = p.progressPercent || 0;
      const avanceFinanciero = Math.min(
        100,
        Math.round(((p.spentTotal || 0) / (p.budgetTotal || 1)) * 100 * 10) / 10
      );
      const brecha = Math.round((avanceFisico - avanceFinanciero) * 10) / 10;

      let diagnostico: 'Saludable' | 'Neutro' | 'Alerta Desfase' = 'Neutro';
      if (brecha >= 2) {
        diagnostico = 'Saludable'; // Physical progress is higher than financial spend
      } else if (brecha < -2) {
        diagnostico = 'Alerta Desfase'; // Financial spend is higher than physical progress
      }

      return {
        id: p.id,
        code: p.code,
        fullName: p.name,
        avanceFisico,
        avanceFinanciero,
        brecha,
        spentTotal: p.spentTotal,
        budgetTotal: p.budgetTotal,
        diagnostico,
        status: p.status,
      };
    });
  }, [projects]);

  // Aggregate Averages
  const avgFisico = useMemo(() => {
    if (chartData.length === 0) return 0;
    return (
      Math.round(
        (chartData.reduce((acc, curr) => acc + curr.avanceFisico, 0) / chartData.length) * 10
      ) / 10
    );
  }, [chartData]);

  const avgFinanciero = useMemo(() => {
    if (chartData.length === 0) return 0;
    return (
      Math.round(
        (chartData.reduce((acc, curr) => acc + curr.avanceFinanciero, 0) / chartData.length) * 10
      ) / 10
    );
  }, [chartData]);

  const globalBrecha = Math.round((avgFisico - avgFinanciero) * 10) / 10;

  return (
    <div className="glass-panel space-y-5 rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl backdrop-blur-xl sm:p-6">
      {/* Header & Badges */}
      <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-3 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/20 p-2 text-emerald-400">
              <Scale className="h-5 w-5" />
            </span>
            <h2 className="text-base font-extrabold tracking-tight text-white sm:text-lg">
              Avance Físico vs. Avance Financiero por Obra
            </h2>
            <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-sky-300">
              Recharts Dual Bar Engine
            </span>
          </div>
          <p className="max-w-2xl text-xs leading-relaxed text-slate-400">
            Comparativa directa entre el avance físico de ejecución en sitio (%) y la ejecución
            presupuestaria desembolsada (%) para detectar sobrecostos o eficiencia operativa.
          </p>
        </div>

        {/* Global Summary Badge */}
        <div className="flex items-center gap-2 self-start rounded-2xl border border-white/10 bg-white/[0.04] p-2 sm:self-auto">
          <div className="text-right text-xs">
            <span className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Desfase Global Promedio
            </span>
            <span
              className={`flex items-center justify-end gap-1 font-mono text-sm font-extrabold ${
                globalBrecha >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {globalBrecha >= 0 ? (
                <>
                  <TrendingUp className="h-3.5 w-3.5" /> +{globalBrecha}% Físico Superior
                </>
              ) : (
                <>
                  <TrendingDown className="h-3.5 w-3.5" /> {globalBrecha}% Exceso Financiero
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-950/50 p-3.5">
          <div>
            <span className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Promedio Avance Físico
            </span>
            <span className="text-xl font-extrabold text-emerald-400">{avgFisico}%</span>
            <span className="mt-0.5 block text-[10px] text-slate-400">Avance de obra en campo</span>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-emerald-400">
            <HardHat className="h-5 w-5" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-950/50 p-3.5">
          <div>
            <span className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Promedio Avance Financiero
            </span>
            <span className="text-xl font-extrabold text-amber-400">{avgFinanciero}%</span>
            <span className="mt-0.5 block text-[10px] text-slate-400">Presupuesto consumido</span>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5 text-amber-400">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-950/50 p-3.5">
          <div>
            <span className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Estado de Salud Financiera
            </span>
            <span className="mt-1 flex items-center gap-1 text-sm font-bold text-white">
              {globalBrecha >= 0 ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="font-extrabold text-emerald-400">Operación Eficiente</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-rose-400" />
                  <span className="font-extrabold text-rose-400">Revisión de Sobrecostos</span>
                </>
              )}
            </span>
            <span className="mt-0.5 block text-[10px] text-slate-400">
              Basado en brecha % acumulada
            </span>
          </div>
          <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-2.5 text-sky-400">
            <Activity className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Recharts BarChart */}
      <div className="h-80 min-h-[300px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 25, left: 0, bottom: 25 }}
            onClick={(state: any) => {
              if (state && state.activePayload && state.activePayload.length && onSelectProject) {
                const projId = state.activePayload[0].payload.id;
                onSelectProject(projId);
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
            <XAxis
              dataKey="code"
              stroke="#94a3b8"
              fontSize={11}
              fontWeight={600}
              tickLine={false}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              domain={[0, 100]}
              tickFormatter={(val) => `${val}%`}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length >= 2) {
                  const data = payload[0].payload;
                  return (
                    <div className="max-w-xs space-y-2 rounded-2xl border border-white/20 bg-slate-900/95 p-4 text-xs text-white shadow-2xl backdrop-blur-xl">
                      <div>
                        <span className="block font-mono text-[10px] font-bold text-sky-400 uppercase">
                          {data.code}
                        </span>
                        <p className="text-sm font-extrabold text-slate-100">{data.fullName}</p>
                      </div>

                      <div className="space-y-1.5 border-t border-white/10 pt-2">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
                            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />
                            Avance Físico:
                          </span>
                          <span className="font-mono font-bold text-emerald-400">
                            {data.avanceFisico}%
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-semibold text-amber-400">
                            <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
                            Avance Financiero:
                          </span>
                          <span className="font-mono font-bold text-amber-400">
                            {data.avanceFinanciero}%
                          </span>
                        </div>

                        <div className="flex items-center justify-between border-t border-white/10 pt-1 text-[11px]">
                          <span className="text-slate-400">Gastado:</span>
                          <span className="font-mono font-semibold text-slate-200">
                            {formatMoney(data.spentTotal)} / {formatMoney(data.budgetTotal)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-slate-400">Desfase Físico-Financiero:</span>
                          <span
                            className={`font-mono font-bold ${
                              data.brecha >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {data.brecha >= 0 ? `+${data.brecha}%` : `${data.brecha}%`}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2">
                        {data.diagnostico === 'Saludable' && (
                          <span className="inline-flex items-center gap-1 rounded border border-emerald-400/30 bg-emerald-400/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" /> Rendimiento Eficiente
                          </span>
                        )}
                        {data.diagnostico === 'Alerta Desfase' && (
                          <span className="inline-flex items-center gap-1 rounded border border-rose-400/30 bg-rose-400/20 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                            <AlertTriangle className="h-3 w-3" /> Alerta Sobrecosto
                          </span>
                        )}
                        {data.diagnostico === 'Neutro' && (
                          <span className="inline-flex items-center gap-1 rounded border border-sky-400/30 bg-sky-400/20 px-2 py-0.5 text-[10px] font-bold text-sky-300">
                            Equilibrado
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ fontSize: 11, paddingBottom: 12, color: '#cbd5e1' }}
            />
            <ReferenceLine
              y={50}
              stroke="#64748b"
              strokeDasharray="3 3"
              opacity={0.5}
              label={{ value: '50% Meta', fill: '#94a3b8', fontSize: 10, position: 'right' }}
            />
            <Bar
              dataKey="avanceFisico"
              name="Avance Físico (% Obra)"
              fill="#10b981"
              radius={[6, 6, 0, 0]}
              barSize={22}
            />
            <Bar
              dataKey="avanceFinanciero"
              name="Avance Financiero (% Presupuesto)"
              fill="#f59e0b"
              radius={[6, 6, 0, 0]}
              barSize={22}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
