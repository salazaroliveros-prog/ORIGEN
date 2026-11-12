import type { APUItem, ExpenseRecord, Project, QuoteRecord } from '@/lib/types';
import { calculateBudgetCoverage } from './budgetAnalysis';
import { calculateExecutionTimeline, type TimelineStatus } from './executionTimeline';
import { BUDGET_CRITICAL_USAGE_PERCENT } from './projectFinance';

export interface ProjectPortfolioRow {
  projectId: string;
  code: string;
  name: string;
  client: string;
  department: string;
  status: Project['status'];
  budgetTotalGTQ: number;
  apuTotalGTQ: number;
  spentTotalGTQ: number;
  remainingBudgetGTQ: number;
  budgetUsagePercent: number;
  apuCoveragePercent: number;
  progressPercent: number;
  quotePipelineGTQ: number;
  acceptedQuotesGTQ: number;
  quoteCount: number;
  timelineStatus: TimelineStatus;
  delayDays: number;
  alerts: string[];
}

export interface DepartmentAggregate {
  department: string;
  projectCount: number;
  budgetTotalGTQ: number;
  apuTotalGTQ: number;
  spentTotalGTQ: number;
  remainingBudgetGTQ: number;
}

export interface PortfolioSummary {
  projectCount: number;
  activeProjectCount: number;
  finishedProjectCount: number;
  archivedProjectCount: number;
  budgetTotalGTQ: number;
  apuTotalGTQ: number;
  spentTotalGTQ: number;
  remainingBudgetGTQ: number;
  budgetUsagePercent: number;
  apuCoveragePercent: number;
  weightedProgressPercent: number;
  quotePipelineGTQ: number;
  acceptedQuotesGTQ: number;
  quoteCount: number;
  projects: ProjectPortfolioRow[];
  byDepartment: DepartmentAggregate[];
  alerts: string[];
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

function percentOf(part: number, total: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  return round2((part / total) * 100);
}

function sumByProject<T extends { projectId?: string }>(
  records: T[],
  selector: (record: T) => number
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const record of records) {
    if (!record.projectId) continue;
    totals.set(record.projectId, (totals.get(record.projectId) ?? 0) + selector(record));
  }
  return totals;
}

/**
 * Agrega proyectos, presupuestos APU, gastos y cotizaciones a nivel de portafolio.
 * Permite lectura granular (por proyecto) y holística (empresa).
 */
export function aggregatePortfolio(
  projects: Project[],
  expenses: ExpenseRecord[],
  apuItems: APUItem[],
  quotes: QuoteRecord[],
  now?: string | Date
): PortfolioSummary {
  const spentByProject = sumByProject(expenses, (expense) => Number(expense.amount) || 0);
  const apuByProject = sumByProject(apuItems, (item) => Number(item.totalPriceGTQ) || 0);

  const apuItemsByProject = new Map<string, APUItem[]>();
  for (const item of apuItems) {
    if (!item.projectId) continue;
    const bucket = apuItemsByProject.get(item.projectId);
    if (bucket) bucket.push(item);
    else apuItemsByProject.set(item.projectId, [item]);
  }

  const quotesByProject = new Map<string, QuoteRecord[]>();
  for (const quote of quotes) {
    if (!quote.projectId) continue;
    const bucket = quotesByProject.get(quote.projectId);
    if (bucket) bucket.push(quote);
    else quotesByProject.set(quote.projectId, [quote]);
  }

  const rows: ProjectPortfolioRow[] = projects.map((project) => {
    const projectApuItems = apuItemsByProject.get(project.id) ?? [];
    const apuTotalGTQ = round2(apuByProject.get(project.id) ?? 0);
    const spentTotalGTQ = round2(spentByProject.get(project.id) ?? 0);
    const projectQuotes = quotesByProject.get(project.id) ?? [];
    const quotePipelineGTQ = round2(
      projectQuotes
        .filter((quote) => quote.status !== 'Rechazada')
        .reduce((total, quote) => total + (Number(quote.totalGTQ) || 0), 0)
    );
    const acceptedQuotesGTQ = round2(
      projectQuotes
        .filter((quote) => quote.status === 'Aceptada')
        .reduce((total, quote) => total + (Number(quote.totalGTQ) || 0), 0)
    );

    const coverage = calculateBudgetCoverage(
      { budgetTotal: project.budgetTotal, spentTotal: spentTotalGTQ },
      projectApuItems
    );

    const timeline = calculateExecutionTimeline({ project, now });

    const alerts: string[] = [];
    if (project.status !== 'Archivado') {
      if (coverage.status === 'sobre-presupuesto') {
        alerts.push('Presupuesto APU superior al presupuesto del proyecto');
      }
      if (coverage.budgetUsagePercent >= 100) {
        alerts.push('Gasto ejecutado supera el presupuesto');
      } else if (coverage.budgetUsagePercent >= BUDGET_CRITICAL_USAGE_PERCENT) {
        alerts.push(`Consumo de presupuesto mayor al ${BUDGET_CRITICAL_USAGE_PERCENT}%`);
      }
      if (apuTotalGTQ <= 0) {
        alerts.push('Proyecto sin partidas APU registradas');
      }
      if (timeline.status === 'atrasado') {
        alerts.push(`Cronograma con ${timeline.delayDays} día(s) de atraso`);
      } else if (timeline.status === 'en-riesgo') {
        alerts.push('Avance por debajo del cronograma esperado');
      }
    }

    return {
      projectId: project.id,
      code: project.code,
      name: project.name,
      client: project.client,
      department: project.department || 'Sin departamento',
      status: project.status,
      budgetTotalGTQ: round2(Number(project.budgetTotal) || 0),
      apuTotalGTQ,
      spentTotalGTQ,
      remainingBudgetGTQ: round2((Number(project.budgetTotal) || 0) - spentTotalGTQ),
      budgetUsagePercent: coverage.budgetUsagePercent,
      apuCoveragePercent: coverage.apuCoveragePercent,
      progressPercent: timeline.completionPercent,
      quotePipelineGTQ,
      acceptedQuotesGTQ,
      quoteCount: projectQuotes.length,
      timelineStatus: timeline.status,
      delayDays: timeline.delayDays,
      alerts,
    };
  });

  const budgetTotalGTQ = round2(rows.reduce((total, row) => total + row.budgetTotalGTQ, 0));
  const apuTotalGTQ = round2(rows.reduce((total, row) => total + row.apuTotalGTQ, 0));
  const spentTotalGTQ = round2(rows.reduce((total, row) => total + row.spentTotalGTQ, 0));
  const remainingBudgetGTQ = round2(budgetTotalGTQ - spentTotalGTQ);

  const weightedProgressPercent =
    budgetTotalGTQ > 0
      ? round2(
          rows.reduce((total, row) => total + row.progressPercent * row.budgetTotalGTQ, 0) /
            budgetTotalGTQ
        )
      : rows.length > 0
        ? round2(rows.reduce((total, row) => total + row.progressPercent, 0) / rows.length)
        : 0;

  const departmentRegistry = new Map<string, DepartmentAggregate>();
  for (const row of rows) {
    const current = departmentRegistry.get(row.department);
    if (current) {
      current.projectCount += 1;
      current.budgetTotalGTQ = round2(current.budgetTotalGTQ + row.budgetTotalGTQ);
      current.apuTotalGTQ = round2(current.apuTotalGTQ + row.apuTotalGTQ);
      current.spentTotalGTQ = round2(current.spentTotalGTQ + row.spentTotalGTQ);
      current.remainingBudgetGTQ = round2(current.budgetTotalGTQ - current.spentTotalGTQ);
    } else {
      departmentRegistry.set(row.department, {
        department: row.department,
        projectCount: 1,
        budgetTotalGTQ: row.budgetTotalGTQ,
        apuTotalGTQ: row.apuTotalGTQ,
        spentTotalGTQ: row.spentTotalGTQ,
        remainingBudgetGTQ: row.remainingBudgetGTQ,
      });
    }
  }

  const byDepartment = Array.from(departmentRegistry.values()).sort(
    (a, b) => b.budgetTotalGTQ - a.budgetTotalGTQ
  );

  const alerts: string[] = [];
  const overBudget = rows.filter(
    (row) => row.status !== 'Archivado' && row.budgetUsagePercent >= 100
  );
  if (overBudget.length > 0) {
    alerts.push(
      `${overBudget.length} proyecto(s) con gasto por encima del presupuesto: ${overBudget
        .map((row) => row.code || row.name)
        .join(', ')}`
    );
  }

  const atRisk = rows.filter(
    (row) => row.status !== 'Archivado' && row.timelineStatus === 'atrasado'
  );
  if (atRisk.length > 0) {
    alerts.push(`${atRisk.length} proyecto(s) con atraso en cronograma`);
  }

  const withoutApu = rows.filter((row) => row.status !== 'Archivado' && row.apuTotalGTQ <= 0);
  if (withoutApu.length > 0) {
    alerts.push(`${withoutApu.length} proyecto(s) sin presupuesto APU`);
  }

  return {
    projectCount: rows.length,
    activeProjectCount: rows.filter((row) => row.status !== 'Archivado').length,
    finishedProjectCount: rows.filter((row) => row.status === 'Finalizado').length,
    archivedProjectCount: rows.filter((row) => row.status === 'Archivado').length,
    budgetTotalGTQ,
    apuTotalGTQ,
    spentTotalGTQ,
    remainingBudgetGTQ,
    budgetUsagePercent: percentOf(spentTotalGTQ, budgetTotalGTQ),
    apuCoveragePercent: percentOf(apuTotalGTQ, budgetTotalGTQ),
    weightedProgressPercent,
    quotePipelineGTQ: round2(rows.reduce((total, row) => total + row.quotePipelineGTQ, 0)),
    acceptedQuotesGTQ: round2(rows.reduce((total, row) => total + row.acceptedQuotesGTQ, 0)),
    quoteCount: rows.reduce((total, row) => total + row.quoteCount, 0),
    projects: rows,
    byDepartment,
    alerts,
  };
}
