'use client';

import React, { useMemo } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Package,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { formatGTQ, formatUSD } from '@/lib/data';
import {
  calculateBudgetCoverage,
  calculateConstructionCosts,
  calculateLaborRequirements,
  calculateMaterialRequirements,
} from '@/lib/domain/budgetAnalysis';
import { calculateExecutionTimeline } from '@/lib/domain/executionTimeline';
import type { TimelineStatus } from '@/lib/domain/executionTimeline';
import { BUDGET_CRITICAL_USAGE_PERCENT } from '@/lib/domain/projectFinance';
import type { APUItem, ExpenseRecord, Project, QuoteRecord } from '@/lib/types';

interface ProjectBudgetSummaryProps {
  project: Project;
  apuItems: APUItem[];
  expenses: ExpenseRecord[];
  quotes: QuoteRecord[];
  currency?: 'GTQ' | 'USD';
  exchangeRate?: number;
  className?: string;
}

const TIMELINE_LABELS: Record<TimelineStatus, string> = {
  'sin-fechas': 'Sin fechas',
  'no-iniciado': 'No iniciado',
  'en-plazo': 'En plazo',
  'en-riesgo': 'En riesgo',
  atrasado: 'Atrasado',
  finalizado: 'Finalizado',
};

const TIMELINE_TONES: Record<TimelineStatus, string> = {
  'sin-fechas': 'border-slate-500/30 bg-slate-500/20 text-slate-300',
  'no-iniciado': 'border-sky-400/30 bg-sky-400/20 text-sky-300',
  'en-plazo': 'border-emerald-400/30 bg-emerald-400/20 text-emerald-300',
  'en-riesgo': 'border-amber-400/30 bg-amber-400/20 text-amber-300',
  atrasado: 'border-rose-400/30 bg-rose-400/20 text-rose-300',
  finalizado: 'border-emerald-400/30 bg-emerald-400/20 text-emerald-300',
};

const COVERAGE_LABELS = {
  'sin-presupuesto': 'Sin presupuesto asignado',
  'bajo-presupuesto': 'APU dentro del presupuesto',
  ajustado: 'APU ajustado al presupuesto',
  'sobre-presupuesto': 'APU excede el presupuesto',
} as const;

const COVERAGE_TONES = {
  'sin-presupuesto': 'text-slate-300',
  'bajo-presupuesto': 'text-emerald-300',
  ajustado: 'text-amber-300',
  'sobre-presupuesto': 'text-rose-300',
} as const;

function Bar({
  value,
  max,
  tone,
  label,
}: {
  value: number;
  max: number;
  tone: string;
  label: string;
}) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span className="font-mono text-slate-300">{percent}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  tone = 'text-white',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-bold ${tone}`}>{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-slate-400">{hint}</p> : null}
    </div>
  );
}

export function ProjectBudgetSummary({
  project,
  apuItems,
  expenses,
  quotes,
  currency = 'GTQ',
  exchangeRate,
  className = '',
}: ProjectBudgetSummaryProps) {
  const formatMoney = (amount: number) =>
    currency === 'GTQ' ? formatGTQ(amount) : formatUSD(amount, exchangeRate);

  const projectExpenses = useMemo(
    () => expenses.filter((expense) => expense.projectId === project.id),
    [expenses, project.id]
  );

  const projectQuotes = useMemo(
    () => quotes.filter((quote) => quote.projectId === project.id),
    [quotes, project.id]
  );

  const costs = useMemo(() => calculateConstructionCosts(apuItems), [apuItems]);
  const materials = useMemo(() => calculateMaterialRequirements(apuItems), [apuItems]);
  const labor = useMemo(() => calculateLaborRequirements(apuItems), [apuItems]);
  const timeline = useMemo(() => calculateExecutionTimeline({ project }), [project]);

  const coverage = useMemo(
    () =>
      calculateBudgetCoverage(
        {
          budgetTotal: project.budgetTotal,
          spentTotal: projectExpenses.reduce((total, expense) => total + expense.amount, 0),
        },
        apuItems
      ),
    [apuItems, project.budgetTotal, projectExpenses]
  );

  const quotePipeline = useMemo(
    () =>
      projectQuotes
        .filter((quote) => quote.status !== 'Rechazada')
        .reduce((total, quote) => total + quote.totalGTQ, 0),
    [projectQuotes]
  );
  const acceptedQuotes = useMemo(
    () =>
      projectQuotes
        .filter((quote) => quote.status === 'Aceptada')
        .reduce((total, quote) => total + quote.totalGTQ, 0),
    [projectQuotes]
  );

  const costBreakdown = [
    { label: 'Materiales', value: costs.materialCost, tone: 'bg-sky-500' },
    { label: 'Mano de obra', value: costs.laborCost, tone: 'bg-amber-500' },
    { label: 'Equipo y maquinaria', value: costs.equipmentCost, tone: 'bg-indigo-500' },
  ];
  const costMax = Math.max(costs.materialCost, costs.laborCost, costs.equipmentCost, 1);

  return (
    <div className={`space-y-4 ${className}`}>
      <Card variant="elevated" padding="md">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Resumen financiero del proyecto
            </p>
            <h3 className="truncate text-lg font-bold text-white">
              {project.name || 'Proyecto sin nombre'}
            </h3>
            <p className="text-xs text-slate-400">
              {project.code || 'SIN-CÓDIGO'} · {project.client || 'Sin cliente'} ·{' '}
              {project.department || 'Sin departamento'}
            </p>
          </div>
          <span
            className={`inline-flex w-fit items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-bold ${TIMELINE_TONES[timeline.status]}`}
          >
            <Clock className="h-3 w-3" /> {TIMELINE_LABELS[timeline.status]}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi
            label="Presupuesto planificado"
            value={formatMoney(coverage.plannedBudgetGTQ)}
            hint={`APU ${formatMoney(coverage.apuTotalGTQ)}`}
          />
          <Kpi
            label="Costo directo APU"
            value={formatMoney(costs.directCost)}
            hint={`${costs.itemCount} partida(s)`}
            tone="text-sky-300"
          />
          <Kpi
            label="Gasto ejecutado"
            value={formatMoney(coverage.spentTotalGTQ)}
            hint={`${coverage.budgetUsagePercent}% del presupuesto`}
            tone={
              coverage.budgetUsagePercent >= 100
                ? 'text-rose-300'
                : coverage.budgetUsagePercent >= BUDGET_CRITICAL_USAGE_PERCENT
                  ? 'text-amber-300'
                  : 'text-emerald-300'
            }
          />
          <Kpi
            label="Saldo disponible"
            value={formatMoney(coverage.remainingBudgetGTQ)}
            hint={`Margen APU ${costs.marginPercent}%`}
            tone={coverage.remainingBudgetGTQ < 0 ? 'text-rose-300' : 'text-emerald-300'}
          />
        </div>

        <p className={`mt-3 text-xs font-semibold ${COVERAGE_TONES[coverage.status]}`}>
          {COVERAGE_LABELS[coverage.status]}
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card variant="elevated" padding="md">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-brand-secondary" aria-hidden="true" />
            <h4 className="text-sm font-semibold text-white">Costos de construcción</h4>
          </div>
          <div className="space-y-3">
            {costBreakdown.map((item) => (
              <Bar
                key={item.label}
                label={`${item.label} · ${formatMoney(item.value)}`}
                value={item.value}
                max={costMax}
                tone={item.tone}
              />
            ))}
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-3 text-xs">
            <div>
              <dt className="text-slate-400">Costo directo</dt>
              <dd className="font-mono font-bold text-white">{formatMoney(costs.directCost)}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Venta APU</dt>
              <dd className="font-mono font-bold text-white">{formatMoney(costs.saleTotal)}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Margen</dt>
              <dd
                className={`font-mono font-bold ${costs.marginGTQ < 0 ? 'text-rose-300' : 'text-emerald-300'}`}
              >
                {formatMoney(costs.marginGTQ)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Cobertura APU</dt>
              <dd className="font-mono font-bold text-white">{coverage.apuCoveragePercent}%</dd>
            </div>
          </dl>
        </Card>

        <Card variant="elevated" padding="md">
          <div className="mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-brand-secondary" aria-hidden="true" />
            <h4 className="text-sm font-semibold text-white">Cronograma de ejecución</h4>
          </div>
          <Bar
            label={`Avance ${timeline.completionPercent}%`}
            value={timeline.completionPercent}
            max={100}
            tone={
              timeline.status === 'atrasado'
                ? 'bg-rose-500'
                : timeline.status === 'en-riesgo'
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
            }
          />
          <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div>
              <dt className="text-slate-400">Inicio</dt>
              <dd className="font-mono text-white">{timeline.startDate ?? 'Sin definir'}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Fin planificado</dt>
              <dd className="font-mono text-white">{timeline.endDate ?? 'Sin definir'}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Duración</dt>
              <dd className="font-mono text-white">{timeline.plannedDurationDays} días</dd>
            </div>
            <div>
              <dt className="text-slate-400">Transcurrido</dt>
              <dd className="font-mono text-white">{timeline.elapsedDays} días</dd>
            </div>
            <div>
              <dt className="text-slate-400">Restante</dt>
              <dd
                className={`font-mono ${timeline.remainingDays < 0 ? 'text-rose-300' : 'text-white'}`}
              >
                {timeline.remainingDays} días
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Proyección de cierre</dt>
              <dd className="font-mono text-white">{timeline.projectedEndDate ?? 'Sin definir'}</dd>
            </div>
          </dl>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-400">
            <span className="rounded border border-white/10 bg-white/[0.05] px-2 py-1">
              Tareas abiertas: {timeline.openTaskCount}
            </span>
            <span className="rounded border border-white/10 bg-white/[0.05] px-2 py-1">
              Ruta crítica: {timeline.criticalTaskCount}
            </span>
            <span className="rounded border border-white/10 bg-white/[0.05] px-2 py-1">
              Hitos: {timeline.milestoneCompleted}/{timeline.milestoneTotal}
            </span>
            {timeline.delayDays > 0 ? (
              <span className="inline-flex items-center gap-1 rounded border border-rose-400/30 bg-rose-400/20 px-2 py-1 text-rose-300">
                <AlertTriangle className="h-3 w-3" /> {timeline.delayDays} día(s) de atraso
              </span>
            ) : null}
          </div>
        </Card>

        <Card variant="elevated" padding="md">
          <div className="mb-3 flex items-center gap-2">
            <Package className="h-4 w-4 text-brand-secondary" aria-hidden="true" />
            <h4 className="text-sm font-semibold text-white">Materiales requeridos</h4>
            <span className="ml-auto text-[11px] text-slate-400">
              {formatMoney(materials.reduce((total, material) => total + material.subtotalGTQ, 0))}
            </span>
          </div>
          {materials.length === 0 ? (
            <p className="text-xs text-slate-400">
              Registra partidas APU para calcular cantidades y costos de materiales.
            </p>
          ) : (
            <ul className="space-y-2">
              {materials.slice(0, 6).map((material) => (
                <li
                  key={`${material.name}-${material.unit}`}
                  className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 text-xs last:border-0"
                >
                  <span className="min-w-0 truncate text-slate-200">{material.name}</span>
                  <span className="shrink-0 font-mono text-slate-400">
                    {material.quantity} {material.unit}
                  </span>
                  <span className="shrink-0 font-mono font-semibold text-white">
                    {formatMoney(material.subtotalGTQ)}
                  </span>
                </li>
              ))}
              {materials.length > 6 ? (
                <li className="text-[11px] text-slate-400">
                  y {materials.length - 6} material(es) más
                </li>
              ) : null}
            </ul>
          )}
        </Card>

        <Card variant="elevated" padding="md">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-brand-secondary" aria-hidden="true" />
            <h4 className="text-sm font-semibold text-white">Mano de obra requerida</h4>
            <span className="ml-auto text-[11px] text-slate-400">
              {formatMoney(labor.totalCostGTQ)}
            </span>
          </div>
          {labor.requirements.length === 0 ? (
            <p className="text-xs text-slate-400">
              Registra partidas APU para estimar cuadrillas y horas de trabajo.
            </p>
          ) : (
            <ul className="space-y-2">
              {labor.requirements.slice(0, 6).map((requirement) => (
                <li
                  key={requirement.role}
                  className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 text-xs last:border-0"
                >
                  <span className="min-w-0 truncate text-slate-200">{requirement.role}</span>
                  <span className="shrink-0 font-mono text-slate-400">
                    {requirement.estimatedHours > 0
                      ? `${requirement.estimatedHours} h`
                      : 'horas N/D'}
                  </span>
                  <span className="shrink-0 font-mono font-semibold text-white">
                    {formatMoney(requirement.subtotalGTQ)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {labor.totalHours > 0 ? (
            <p className="mt-3 text-[11px] text-slate-400">
              Total estimado: {labor.totalHours} horas · {labor.crewDays} jornada(s) de cuadrilla
            </p>
          ) : null}
        </Card>
      </div>

      <Card variant="elevated" padding="md">
        <div className="mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-brand-secondary" aria-hidden="true" />
          <h4 className="text-sm font-semibold text-white">Cotizaciones vinculadas</h4>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Kpi label="Cotizaciones" value={String(projectQuotes.length)} />
          <Kpi
            label="Pipeline activo"
            value={formatMoney(quotePipeline)}
            tone="text-sky-300"
            hint="Excluye rechazadas"
          />
          <Kpi
            label="Aceptadas"
            value={formatMoney(acceptedQuotes)}
            tone="text-emerald-300"
            hint={
              quotePipeline > 0
                ? `${Math.round((acceptedQuotes / quotePipeline) * 100)}% del pipeline`
                : undefined
            }
          />
        </div>
        {coverage.apuTotalGTQ > 0 && acceptedQuotes > 0 ? (
          <p className="mt-3 flex items-center gap-1 text-[11px] text-slate-400">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            Las cotizaciones aceptadas cubren{' '}
            {Math.round((acceptedQuotes / coverage.apuTotalGTQ) * 100)}% del APU registrado.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
