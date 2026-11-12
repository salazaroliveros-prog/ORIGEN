'use client';

import React from 'react';
import { Building2, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { formatGTQ } from '@/lib/data';
import type { Project, DashboardTotals } from '../types';

interface KPICardsProps {
  projects: Project[];
  totals: DashboardTotals;
}

export function KPICards({ projects, totals }: KPICardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card variant="elevated" padding="md" className="border-slate-800 bg-slate-900/80">
        <div className="flex items-start justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Proyectos Activos</p>
          <span className="rounded-lg bg-blue-500/10 p-1.5 text-blue-400">
            <Building2 className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
        <p className="mt-1 text-2xl font-black text-white">{projects.length}</p>
        <p className="mt-0.5 text-[11px] text-slate-400">{totals.overbudgetCount} con alerta de sobrecosto</p>
      </Card>

      <Card variant="elevated" padding="md" className="border-slate-800 bg-slate-900/80">
        <div className="flex items-start justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Presupuesto Proyectado</p>
          <span className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-400">
            <DollarSign className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
        <p className="mt-1 font-mono text-2xl font-black text-emerald-400">{formatGTQ(totals.totalBudget)}</p>
        <p className="mt-0.5 text-[11px] text-slate-400">Cartera global administrada</p>
      </Card>

      <Card variant="elevated" padding="md" className="border-slate-800 bg-slate-900/80">
        <div className="flex items-start justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Gasto Real Acumulado</p>
          <span className="rounded-lg bg-sky-500/10 p-1.5 text-sky-400">
            <TrendingUp className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
        <p className="mt-1 font-mono text-2xl font-black text-sky-400">{formatGTQ(totals.totalSpent)}</p>
        <p className="mt-0.5 text-[11px] text-slate-400">{totals.spentPercentage}% del presupuesto ejercido</p>
      </Card>

      <Card
        variant="elevated"
        padding="md"
        className={`border ${
          totals.overbudgetCount > 0
            ? 'border-rose-800/80 bg-rose-950/30'
            : 'border-slate-800 bg-slate-900/80'
        }`}
      >
        <div className="flex items-start justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-rose-400">Alertas de Sobrecosto</p>
          <span className="rounded-lg bg-rose-500/20 p-1.5 text-rose-400">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
        <p className="mt-1 text-2xl font-black text-rose-400">{totals.overbudgetCount} Obras</p>
        <p className="mt-0.5 text-[11px] text-rose-300/80">
          {totals.overbudgetCount > 0 ? 'Superan el 100% del presupuesto' : 'Sin desviaciones críticas'}
        </p>
      </Card>
    </div>
  );
}