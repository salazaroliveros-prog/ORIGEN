'use client';

import React, { memo } from 'react';
import { Building2, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { formatGTQ } from '@/lib/data';
import type { Project, DashboardTotals } from '../types';

interface KPICardsProps {
  projects: Project[];
  totals: DashboardTotals;
}

const KPICard = memo(function KPICard({ title, value, subtitle, icon: Icon, iconBg, iconColor, valueColor }: {
  title: string;
  value: React.ReactNode;
  subtitle: string;
  icon: React.ComponentType<{ className?: string; [key: string]: unknown }>;
  iconBg: string;
  iconColor: string;
  valueColor: string;
}) {
  return (
    <Card variant="elevated" padding="md" className="border-slate-800 bg-slate-900/80">
      <div className="flex items-start justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</p>
        <span className={`rounded-lg ${iconBg} p-1.5 ${iconColor}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-1 font-mono text-2xl font-black" style={{ color: valueColor }}>{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-400">{subtitle}</p>
    </Card>
  );
});

const OverbudgetCard = memo(function OverbudgetCard({ totals }: { totals: DashboardTotals }) {
  return (
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
  );
});

const KPICardsComponent = memo(function KPICardsComponent({ projects, totals }: KPICardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KPICard
        title="Proyectos Activos"
        value={projects.length}
        subtitle={`${totals.overbudgetCount} con alerta de sobrecosto`}
        icon={Building2}
        iconBg="bg-blue-500/10"
        iconColor="text-blue-400"
        valueColor="#ffffff"
      />
      <KPICard
        title="Presupuesto Proyectado"
        value={formatGTQ(totals.totalBudget)}
        subtitle="Cartera global administrada"
        icon={DollarSign}
        iconBg="bg-emerald-500/10"
        iconColor="text-emerald-400"
        valueColor="#34d399"
      />
      <KPICard
        title="Gasto Real Acumulado"
        value={formatGTQ(totals.totalSpent)}
        subtitle={`${totals.spentPercentage}% del presupuesto ejercido`}
        icon={TrendingUp}
        iconBg="bg-sky-500/10"
        iconColor="text-sky-400"
        valueColor="#38bdf8"
      />
      <OverbudgetCard totals={totals} />
    </div>
  );
});

export const KPICards = memo(KPICardsComponent);
KPICards.displayName = 'KPICards';