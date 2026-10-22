'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  PieChart,
  DollarSign,
  HardHat,
  Scale,
} from 'lucide-react';
import { Project, CompanySettings } from '@/lib/types';
import { formatGTQ, formatUSD } from '@/lib/data';

interface PhysicalVsFinancialChartProps {
  projects: Project[];
  currency: 'GTQ' | 'USD';
  company: CompanySettings;
  onSelectProject?: (projectId: string) => void;
}

export const PhysicalVsFinancialChart: React.FC<PhysicalVsFinancialChartProps> = ({
  projects,
  currency,
  company,
  onSelectProject,
}) => {
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
    return Math.round((chartData.reduce((acc, curr) => acc + curr.avanceFisico, 0) / chartData.length) * 10) / 10;
  }, [chartData]);

  const avgFinanciero = useMemo(() => {
    if (chartData.length === 0) return 0;
    return Math.round((chartData.reduce((acc, curr) => acc + curr.avanceFinanciero, 0) / chartData.length) * 10) / 10;
  }, [chartData]);

  const globalBrecha = Math.round((avgFisico - avgFinanciero) * 10) / 10;

  return (
    <div className="glass-panel space-y-5 border border-white/10 p-5 sm:p-6 rounded-3xl bg-slate-900/80 backdrop-blur-xl shadow-2xl">
      {/* Header & Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Scale className="w-5 h-5" />
            </span>
            <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
              Avance Físico vs. Avance Financiero por Obra
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-400/10 text-sky-300 border border-sky-400/30">
              Recharts Dual Bar Engine
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Comparativa directa entre el avance físico de ejecución en sitio (%) y la ejecución presupuestaria desembolsada (%) para detectar sobrecostos o eficiencia operativa.
          </p>
        </div>

        {/* Global Summary Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-white/[0.04] p-2 rounded-2xl border border-white/10">
          <div className="text-right text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Desfase Global Promedio
            </span>
            <span
              className={`font-extrabold font-mono text-sm flex items-center justify-end gap-1 ${
                globalBrecha >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {globalBrecha >= 0 ? (
                <>
                  <TrendingUp className="w-3.5 h-3.5" /> +{globalBrecha}% Físico Superior
                </>
              ) : (
                <>
                  <TrendingDown className="w-3.5 h-3.5" /> {globalBrecha}% Exceso Financiero
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-950/50 p-3.5 rounded-2xl border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Promedio Avance Físico
            </span>
            <span className="text-xl font-extrabold text-emerald-400">{avgFisico}%</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Avance de obra en campo</span>
          </div>
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <HardHat className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-950/50 p-3.5 rounded-2xl border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Promedio Avance Financiero
            </span>
            <span className="text-xl font-extrabold text-amber-400">{avgFinanciero}%</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Presupuesto consumido</span>
          </div>
          <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-950/50 p-3.5 rounded-2xl border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Estado de Salud Financiera
            </span>
            <span className="text-sm font-bold text-white flex items-center gap-1 mt-1">
              {globalBrecha >= 0 ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-extrabold">Operación Eficiente</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span className="text-rose-400 font-extrabold">Revisión de Sobrecostos</span>
                </>
              )}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Basado en brecha % acumulada</span>
          </div>
          <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Recharts BarChart */}
      <div className="w-full h-80 min-h-[300px] pt-2">
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
                    <div className="bg-slate-900/95 backdrop-blur-xl border border-white/20 p-4 rounded-2xl shadow-2xl text-xs space-y-2 max-w-xs text-white">
                      <div>
                        <span className="font-mono text-[10px] uppercase font-bold text-sky-400 block">
                          {data.code}
                        </span>
                        <p className="font-extrabold text-sm text-slate-100">{data.fullName}</p>
                      </div>

                      <div className="pt-2 border-t border-white/10 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                            Avance Físico:
                          </span>
                          <span className="font-mono font-bold text-emerald-400">{data.avanceFisico}%</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                            Avance Financiero:
                          </span>
                          <span className="font-mono font-bold text-amber-400">{data.avanceFinanciero}%</span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[11px]">
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
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/30">
                            <CheckCircle2 className="w-3 h-3" /> Rendimiento Eficiente
                          </span>
                        )}
                        {data.diagnostico === 'Alerta Desfase' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-400/20 text-rose-300 text-[10px] font-bold border border-rose-400/30">
                            <AlertTriangle className="w-3 h-3" /> Alerta Sobrecosto
                          </span>
                        )}
                        {data.diagnostico === 'Neutro' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-400/20 text-sky-300 text-[10px] font-bold border border-sky-400/30">
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
            <ReferenceLine y={50} stroke="#64748b" strokeDasharray="3 3" opacity={0.5} label={{ value: '50% Meta', fill: '#94a3b8', fontSize: 10, position: 'right' }} />
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
};
