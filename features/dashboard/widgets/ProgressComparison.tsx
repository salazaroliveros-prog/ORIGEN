'use client';

import React from 'react';
import { BarChart3, EyeOff } from 'lucide-react';
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
import { Card } from '@/components/ui/Card';
import { formatGTQ } from '@/lib/data';
import type { ProgressChartDataPoint } from '../types';

interface ProgressComparisonProps {
  data: ProgressChartDataPoint[];
  visible: boolean;
  onToggle: () => void;
}

function CustomProgressTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ProgressChartDataPoint }> }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="space-y-1.5 rounded-xl border border-slate-700 bg-slate-950 p-3 font-sans text-xs shadow-2xl">
        <p className="font-extrabold text-white">{data.fullName}</p>
        <p className="font-mono text-[10px] text-amber-400">Código: {data.code}</p>
        <div className="space-y-1 border-t border-slate-800 pt-1">
          <div className="flex justify-between gap-4 font-semibold text-emerald-400">
            <span>Avance Físico:</span>
            <span>{data.avanceFisico}%</span>
          </div>
          <div className="flex justify-between gap-4 font-semibold text-amber-400">
            <span>Ejecución Financiera:</span>
            <span>{data.ejecucionFinanciera}%</span>
          </div>
          <div className="flex justify-between gap-4 font-mono text-slate-300">
            <span>Presupuesto:</span>
            <span>{formatGTQ(data.presupuesto)}</span>
          </div>
          <div className="flex justify-between gap-4 font-mono text-sky-400">
            <span>Gasto Ejecutado:</span>
            <span>{formatGTQ(data.gastoReal)}</span>
          </div>
          {data.isAlert && (
            <p className="flex items-center gap-1 pt-1 text-[10px] font-bold text-rose-400">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Alerta: Descalce financiero mayor al 10%
            </p>
          )}
        </div>
      </div>
    );
  }
  return null;
}

export function ProgressComparison({ data, visible, onToggle }: ProgressComparisonProps) {
  if (!visible) return null;

  return (
    <Card variant="elevated" padding="sm" className="border-slate-800 bg-slate-900/90 shadow-xl group relative">
      <div className="absolute right-3 top-3 z-10 opacity-0 transition group-hover:opacity-100">
        <button
          onClick={onToggle}
          title="Ocultar Widget"
          className="rounded-lg border border-slate-700 bg-slate-800/80 p-1.5 text-slate-400 hover:text-white"
          aria-label="Ocultar widget Avance Físico vs Ejecución Financiera"
        >
          <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      <div className="p-5 space-y-4">
        <div className="flex flex-col items-start justify-between gap-2 border-b border-slate-800 pb-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-white">
              <BarChart3 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              Avance Físico de Obra vs. Ejecución Financiera (%)
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Comparativa porcentual por proyecto. Detecta descalces donde el gasto financiero supera al avance real de construcción.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="inline-block h-3 w-3 rounded bg-emerald-500" aria-hidden="true" /> Avance Físico (%)
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="inline-block h-3 w-3 rounded bg-amber-500" aria-hidden="true" /> Ejecución Financiera (%)
            </span>
            <button
              onClick={onToggle}
              title="Ocultar Widget"
              className="rounded-lg p-1 text-slate-500 hover:text-slate-200"
              aria-label="Ocultar widget Avance Físico vs Ejecución Financiera"
            >
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 15, right: 15, left: 0, bottom: 25 }}>
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
              <ReferenceLine
                y={100}
                stroke="#f43f5e"
                strokeDasharray="4 4"
                label={{
                  value: '100% Límite',
                  fill: '#f43f5e',
                  fontSize: 10,
                  position: 'right',
                }}
              />
              <Bar dataKey="avanceFisico" name="Avance Físico (%)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
              <Bar
                dataKey="ejecucionFinanciera"
                name="Ejecución Financiera (%)"
                radius={[4, 4, 0, 0]}
                barSize={20}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.ejecucionFinanciera > 100 ? '#f43f5e' : entry.isAlert ? '#f59e0b' : '#3b82f6'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}