'use client';

import React from 'react';
import { Layers, EyeOff } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { formatGTQ } from '@/lib/data';
import type { StackedChartDataPoint } from '../types';

interface StackedBudgetProps {
  data: StackedChartDataPoint[];
  visible: boolean;
  onToggle: () => void;
}

function CustomStackedTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: StackedChartDataPoint }> }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="space-y-1.5 rounded-xl border border-slate-700 bg-slate-950 p-3 font-sans text-xs shadow-2xl">
        <p className="font-extrabold text-white">{data.fullName}</p>
        <div className="space-y-1 border-t border-slate-800 pt-1 font-mono">
          <div className="flex justify-between gap-4 text-slate-300">
            <span>Presupuesto Proyectado:</span>
            <span>{formatGTQ(data.presupuestoAsignado)}</span>
          </div>
          <div className="flex justify-between gap-4 font-bold text-blue-400">
            <span>Gasto Real Acumulado:</span>
            <span>{formatGTQ(data.totalGasto)}</span>
          </div>
          {data.isOverbudget ? (
            <div className="flex justify-between gap-4 font-extrabold text-rose-400">
              <span>Exceso / Sobrecosto:</span>
              <span>+{formatGTQ(data.sobrecostoExcedido)}</span>
            </div>
          ) : (
            <div className="flex justify-between gap-4 font-bold text-emerald-400">
              <span>Saldo Disponible:</span>
              <span>{formatGTQ(data.saldoDisponible)}</span>
            </div>
          )}
          <p className="pt-1 font-sans text-[10px] text-slate-400">
            Porcentaje Ejercido: <strong>{data.percentExecuted}%</strong>
          </p>
        </div>
      </div>
    );
  }
  return null;
}

export function StackedBudget({ data, visible, onToggle }: StackedBudgetProps) {
  if (!visible) return null;

  return (
    <Card variant="elevated" padding="sm" className="border-slate-800 bg-slate-900/90 shadow-xl group relative">
      <div className="absolute right-3 top-3 z-10 opacity-0 transition group-hover:opacity-100">
        <button
          onClick={onToggle}
          title="Ocultar Widget"
          className="rounded-lg border border-slate-700 bg-slate-800/80 p-1.5 text-slate-400 hover:text-white"
          aria-label="Ocultar widget Presupuesto Asignado vs Gasto Real"
        >
          <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      <div className="p-5 space-y-4">
        <div className="flex flex-col items-start justify-between gap-2 border-b border-slate-800 pb-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-white">
              <Layers className="h-4 w-4 text-amber-400" aria-hidden="true" />
              Comparativa de Presupuesto Asignado vs. Gasto Acumulado (Barras Apiladas)
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Gráfico apilado que visibiliza el saldo disponible frente al gasto real ejecutado y sobrecostos excedidos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-blue-400">
              <span className="inline-block h-3 w-3 rounded bg-blue-600" aria-hidden="true" /> Gasto Real
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="inline-block h-3 w-3 rounded bg-slate-700" aria-hidden="true" /> Disponible
            </span>
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="inline-block h-3 w-3 rounded bg-rose-600" aria-hidden="true" /> Exceso
            </span>
            <button
              onClick={onToggle}
              title="Ocultar Widget"
              className="rounded-lg p-1 text-slate-500 hover:text-slate-200"
              aria-label="Ocultar widget Presupuesto Asignado vs Gasto Real"
            >
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 15, right: 20, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis
                dataKey="name"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                angle={-15}
                textAnchor="end"
              />
              <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(val) => `Q${(val / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomStackedTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="gastoReal" name="Gasto Ejercido" stackId="a" fill="#2563eb" barSize={32} />
              <Bar dataKey="saldoDisponible" name="Saldo Disponible" stackId="a" fill="#334155" barSize={32} />
              <Bar
                dataKey="sobrecostoExcedido"
                name="Sobrecosto Excedido"
                stackId="a"
                fill="#f43f5e"
                radius={[4, 4, 0, 0]}
                barSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}