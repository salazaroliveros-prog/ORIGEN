'use client';

import { useMemo } from 'react';
import { AlertTriangle, Building2, FileText } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/Card';
import { BudgetAndAPU } from '@/components/BudgetAndAPU';
import { ProjectBudgetSummary } from '@/components/ProjectBudgetSummary';
import { formatGTQ } from '@/lib/data';
import { aggregatePortfolio } from '@/lib/domain/portfolio';
import type { APUItem, CompanySettings, ExpenseRecord, Project, QuoteRecord } from '@/lib/types';

interface BudgetViewProps {
  projects: Project[];
  expenses: ExpenseRecord[];
  budgetItems: APUItem[];
  quotes: QuoteRecord[];
  activeProjectId: string;
  canWrite: boolean;
  company: CompanySettings;
  onSaveItems: (items: APUItem[], projectId: string) => Promise<boolean>;
  onDeleteItem: (itemId: string) => Promise<boolean>;
}

function KpiCard({
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
    <Card variant="elevated" padding="lg">
      <h3 className="mb-2 text-sm font-semibold text-slate-300">{label}</h3>
      <p className={`text-3xl font-bold ${tone}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </Card>
  );
}

export function BudgetView({
  projects,
  expenses,
  budgetItems,
  quotes,
  activeProjectId,
  canWrite,
  company,
  onSaveItems,
  onDeleteItem,
}: BudgetViewProps) {
  const project = projects.find((item) => item.id === activeProjectId) ?? projects[0];
  const projectItems = useMemo(
    () => budgetItems.filter((item) => item.projectId === project?.id),
    [budgetItems, project?.id]
  );
  const portfolio = useMemo(
    () => aggregatePortfolio(projects, expenses, budgetItems, quotes),
    [projects, expenses, budgetItems, quotes]
  );

  return (
    <div className="responsive-container safe-area-top safe-area-bottom min-h-full">
      <PageHeader
        title="Presupuestos APU y Gastos"
        subtitle="Control financiero con desglose por renglón y departamento"
        logoUrl={company?.logoUrl}
        companyName={company?.companyName}
      />

      <div className="responsive-grid">
        <KpiCard
          label="Presupuesto del portafolio"
          value={formatGTQ(portfolio.budgetTotalGTQ)}
          hint={`${portfolio.activeProjectCount} proyecto(s) activo(s)`}
        />
        <KpiCard
          label="APU estimado registrado"
          value={formatGTQ(portfolio.apuTotalGTQ)}
          hint={`Cobertura ${portfolio.apuCoveragePercent}%`}
          tone="text-sky-400"
        />
        <KpiCard
          label="Gastos Ejecutados"
          value={formatGTQ(portfolio.spentTotalGTQ)}
          hint={`${portfolio.budgetUsagePercent}% del presupuesto`}
          tone={portfolio.budgetUsagePercent >= 80 ? 'text-amber-400' : 'text-white'}
        />
        <KpiCard
          label="Saldo Disponible"
          value={formatGTQ(portfolio.remainingBudgetGTQ)}
          hint={`Avance ponderado ${portfolio.weightedProgressPercent}%`}
          tone={portfolio.remainingBudgetGTQ < 0 ? 'text-rose-400' : 'text-emerald-400'}
        />
      </div>

      {portfolio.alerts.length > 0 ? (
        <Card variant="elevated" padding="md" className="mt-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-white">Alertas del portafolio</h3>
              <ul className="list-inside list-disc text-xs text-slate-300">
                {portfolio.alerts.map((alert) => (
                  <li key={alert}>{alert}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      ) : null}

      {project ? (
        <>
          <ProjectBudgetSummary
            project={project}
            apuItems={projectItems}
            expenses={expenses}
            quotes={quotes}
            currency="GTQ"
            exchangeRate={company?.exchangeRate}
            className="mt-4"
          />

          <BudgetAndAPU
            budgetItems={projectItems}
            activeProjectId={project.id}
            projects={projects}
            canWrite={canWrite}
            onAddBudgetItem={(item) => onSaveItems([...projectItems, item], project.id)}
            onUpdateBudgetItems={(items) => onSaveItems(items, project.id)}
            onDeleteBudgetItem={onDeleteItem}
            currency="GTQ"
            company={company}
            expenses={expenses}
            quotes={quotes}
            tasks={project.scheduleTasks ?? []}
          />
        </>
      ) : (
        <Card variant="elevated" padding="lg" className="mt-4">
          <p className="font-semibold text-white">Aún no hay proyectos para presupuestar.</p>
          <p className="mt-1 text-sm text-slate-300">
            Crea un proyecto y vuelve aquí para registrar sus partidas APU.
          </p>
        </Card>
      )}

      {portfolio.projects.length > 0 ? (
        <Card variant="elevated" padding="md" className="mt-4">
          <div className="mb-3 flex items-center gap-2">
            <Building2 className="text-brand-secondary h-4 w-4" />
            <h3 className="text-sm font-semibold text-white">Consolidado por proyecto</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[10px] tracking-wider text-slate-400 uppercase">
                  <th className="py-2 pr-3 font-bold">Proyecto</th>
                  <th className="py-2 pr-3 font-bold">Presupuesto</th>
                  <th className="py-2 pr-3 font-bold">APU</th>
                  <th className="py-2 pr-3 font-bold">Gastado</th>
                  <th className="py-2 pr-3 font-bold">Saldo</th>
                  <th className="py-2 pr-3 font-bold">Avance</th>
                  <th className="py-2 font-bold">Cotizaciones</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.projects.map((row) => (
                  <tr key={row.projectId} className="border-b border-white/5 last:border-0">
                    <td className="py-2 pr-3">
                      <span className="block font-semibold text-white">{row.code}</span>
                      <span className="block text-[11px] text-slate-400">{row.name}</span>
                    </td>
                    <td className="py-2 pr-3 font-mono text-slate-200">
                      {formatGTQ(row.budgetTotalGTQ)}
                    </td>
                    <td className="py-2 pr-3 font-mono text-sky-300">
                      {formatGTQ(row.apuTotalGTQ)}
                    </td>
                    <td
                      className={`py-2 pr-3 font-mono ${row.budgetUsagePercent >= 100 ? 'text-rose-300' : 'text-slate-200'}`}
                    >
                      {formatGTQ(row.spentTotalGTQ)}
                    </td>
                    <td
                      className={`py-2 pr-3 font-mono ${row.remainingBudgetGTQ < 0 ? 'text-rose-300' : 'text-emerald-300'}`}
                    >
                      {formatGTQ(row.remainingBudgetGTQ)}
                    </td>
                    <td className="py-2 pr-3 font-mono text-slate-200">{row.progressPercent}%</td>
                    <td className="py-2 font-mono text-slate-200">
                      <span className="inline-flex items-center gap-1">
                        <FileText className="h-3 w-3 text-slate-400" />
                        {row.quoteCount} · {formatGTQ(row.quotePipelineGTQ)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
