'use client';

import React from 'react';
import { Briefcase, EyeOff } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { formatGTQ } from '@/lib/data';
import type { Project, DashboardTotals } from '../types';

interface ProjectBreakdownProps {
  projects: Project[];
  totals: DashboardTotals;
  visible: boolean;
  onToggle: () => void;
}

export function ProjectBreakdown({ projects, totals, visible, onToggle }: ProjectBreakdownProps) {
  if (!visible) return null;

  return (
    <Card variant="elevated" padding="sm" className="border-slate-800 bg-slate-900/90 shadow-xl group relative space-y-3">
      <div className="absolute right-3 top-3 z-10 opacity-0 transition group-hover:opacity-100">
        <button
          onClick={onToggle}
          title="Ocultar Widget"
          className="rounded-lg p-1 text-slate-500 hover:text-slate-200"
          aria-label="Ocultar widget Desglose Individual de Obras"
        >
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="p-5 pt-10 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-white">
            <Briefcase className="h-4 w-4 text-sky-400" aria-hidden="true" />
            Desglose Individual de Obras Activas ({projects.length})
          </h3>
          <button
            onClick={onToggle}
            title="Ocultar Widget"
            className="rounded-lg p-1 text-slate-500 hover:text-slate-200"
            aria-label="Ocultar widget Desglose Individual de Obras"
          >
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const spent = totals.projectSpentMap.get(p.id) || p.spentTotal || 0;
            const budget = p.budgetTotal || 0;
            const isOver = spent > budget;
            const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;

            return (
              <div
                key={p.id}
                className={`rounded-2xl border p-4 transition ${
                  isOver
                    ? 'border-rose-800/80 bg-rose-950/20 hover:border-rose-600'
                    : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[10px] font-bold uppercase text-amber-400">{p.code || p.id}</span>
                    <h4 className="mt-0.5 text-sm font-extrabold text-white">{p.name}</h4>
                    <p className="text-[11px] text-slate-400">{p.client} • {p.municipality}, {p.department}</p>
                  </div>
                  <span
                    className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-extrabold ${
                      isOver
                        ? 'border border-rose-700 bg-rose-900/80 text-rose-200'
                        : 'border border-emerald-700 bg-emerald-900/60 text-emerald-300'
                    }`}
                  >
                    {pct}% Ejercido
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs">
                  <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-2">
                    <span className="block font-sans text-[10px] text-slate-400">Presupuesto:</span>
                    <strong className="text-xs text-white">{formatGTQ(budget)}</strong>
                  </div>
                  <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-2">
                    <span className="block font-sans text-[10px] text-slate-400">Gasto Real:</span>
                    <strong className={isOver ? 'text-xs text-rose-400' : 'text-xs text-sky-400'}>
                      {formatGTQ(spent)}
                    </strong>
                  </div>
                </div>

                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Avance Físico: {p.progressPercent}%</span>
                    <span>{isOver ? `Sobrecosto: +${formatGTQ(spent - budget)}` : `Disponible: ${formatGTQ(budget - spent)}`}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-2 rounded-full transition-opacity transition-transform duration-300 ${isOver ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Ejecución presupuestaria ${pct}%`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}