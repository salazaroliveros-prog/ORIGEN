import { Project, Milestone } from './types';

export interface CashFlowMilestone {
  id: string;
  projectId: string;
  projectName: string;
  projectCode: string;
  title: string;
  phase: string;
  targetDate: string; // YYYY-MM-DD
  weightPercent: number;
  estimatedBillingGTQ: number; // Ingreso estimado por cobro de estimación/avance
  estimatedCostGTQ: number | null;
  completed: boolean;
  deliverable?: string;
}

export interface CashFlowMonth {
  monthIndex: number;
  monthKey: string; // '2026-11'
  monthLabel: string; // 'Nov 2026'
  fullMonthName: string; // 'Noviembre 2026'
  year: number;
  month: number;
  ingresos: number;
  egresos: number;
  flujoNeto: number;
  flujoAcumulado: number;
  hitosCount: number;
  hitos: CashFlowMilestone[];
}

export interface CashFlowSummary {
  months: CashFlowMonth[];
  totalIngresos: number;
  totalEgresos: number;
  totalFlujoNeto: number;
  costEstimatesComplete: boolean;
  totalHitosCount: number;
  maxMonthIngreso: { monthLabel: string; amount: number };
  maxMonthEgreso: { monthLabel: string; amount: number };
  lowestCashPoint: { monthLabel: string; balance: number };
  allMilestonesInPeriod: CashFlowMilestone[];
}

const MONTH_NAMES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const MONTH_SHORT_ES = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

function collectProjectMilestones(
  projects: Project[],
  existingMilestones: Milestone[]
): Milestone[] {
  const milestones = new Map<string, Milestone>();

  for (const milestone of [
    ...existingMilestones,
    ...projects.flatMap((project) => project.scheduleMilestones ?? []),
  ]) {
    milestones.set(`${milestone.projectId}:${milestone.id}`, milestone);
  }

  return [...milestones.values()];
}

/**
 * Calculates a 6-month projected cash flow based on milestone deliveries,
 * billings (inflows), and construction execution costs (outflows).
 */
export function calculateSixMonthCashFlow(
  projects: Project[],
  existingMilestones: Milestone[] = [],
  options?: {
    startDate?: Date;
    selectedProjectId?: string;
  }
): CashFlowSummary {
  const selectedProjId = options?.selectedProjectId || 'all';
  const relevantProjects =
    selectedProjId === 'all'
      ? projects.filter((p) => p.status !== 'Finalizado' && p.status !== 'Archivado')
      : projects.filter((p) => p.id === selectedProjId);

  const allMilestones = collectProjectMilestones(projects, existingMilestones);

  const now = new Date();
  const baseDate = options?.startDate || new Date(now.getFullYear(), now.getMonth(), 1);
  const startYear = baseDate.getFullYear();
  const startMonth = baseDate.getMonth();

  // Initialize 6 month buckets
  const months: CashFlowMonth[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(startYear, startMonth + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const monthKey = `${y}-${String(m + 1).padStart(2, '0')}`;
    const monthLabel = `${MONTH_SHORT_ES[m]} ${y}`;
    const fullMonthName = `${MONTH_NAMES_ES[m]} ${y}`;

    months.push({
      monthIndex: i,
      monthKey,
      monthLabel,
      fullMonthName,
      year: y,
      month: m,
      ingresos: 0,
      egresos: 0,
      flujoNeto: 0,
      flujoAcumulado: 0,
      hitosCount: 0,
      hitos: [],
    });
  }

  const allMilestonesInPeriod: CashFlowMilestone[] = [];

  // Map milestones to CashFlowMilestone format and distribute cash flows
  relevantProjects.forEach((proj) => {
    const projMilestones = allMilestones.filter((m) => m.projectId === proj.id);

    projMilestones.forEach((m) => {
      if (!Number.isFinite(m.weightPercent) || m.weightPercent <= 0) return;
      const dateMatch = /^(\d{4}-\d{2})-\d{2}$/.exec(m.targetDate);
      if (!dateMatch) return;

      const budget = Math.max(0, proj.budgetTotal || 0);
      const weight = m.weightPercent;
      const billingVal = Math.round((budget * weight) / 100);
      const margin = proj.expectedProfitMarginPercent;
      const costVal =
        typeof margin === 'number' && Number.isFinite(margin) && margin >= 0 && margin <= 100
          ? Math.round(billingVal * (1 - margin / 100))
          : null;

      const cfMilestone: CashFlowMilestone = {
        id: m.id,
        projectId: proj.id,
        projectName: proj.name,
        projectCode: proj.code || proj.id,
        title: m.title,
        phase: m.phase,
        targetDate: m.targetDate,
        weightPercent: weight,
        estimatedBillingGTQ: billingVal,
        estimatedCostGTQ: costVal,
        completed: m.completed,
        deliverable: m.deliverable,
      };

      // Check if target date falls in our 6-month window
      const targetMonthBucket = months.find((bucket) => bucket.monthKey === dateMatch[1]);

      if (targetMonthBucket) {
        targetMonthBucket.hitos.push(cfMilestone);
        targetMonthBucket.hitosCount += 1;
        targetMonthBucket.ingresos += billingVal;
        allMilestonesInPeriod.push(cfMilestone);

        if (costVal !== null) {
          targetMonthBucket.egresos += costVal;
        }
      }
    });
  });

  // Compute Net Cash Flow and Cumulative Cash Flow
  let runningCumulative = 0;
  let totalIngresos = 0;
  let totalEgresos = 0;

  let maxIngreso = { monthLabel: months[0].monthLabel, amount: 0 };
  let maxEgreso = { monthLabel: months[0].monthLabel, amount: 0 };
  let lowestCashPoint = { monthLabel: months[0].monthLabel, balance: Infinity };

  months.forEach((bucket) => {
    bucket.flujoNeto = bucket.ingresos - bucket.egresos;
    runningCumulative += bucket.flujoNeto;
    bucket.flujoAcumulado = runningCumulative;

    totalIngresos += bucket.ingresos;
    totalEgresos += bucket.egresos;

    if (bucket.ingresos > maxIngreso.amount) {
      maxIngreso = { monthLabel: bucket.monthLabel, amount: bucket.ingresos };
    }
    if (bucket.egresos > maxEgreso.amount) {
      maxEgreso = { monthLabel: bucket.monthLabel, amount: bucket.egresos };
    }
    if (bucket.flujoAcumulado < lowestCashPoint.balance) {
      lowestCashPoint = { monthLabel: bucket.monthLabel, balance: bucket.flujoAcumulado };
    }
  });

  if (lowestCashPoint.balance === Infinity) {
    lowestCashPoint = { monthLabel: months[0].monthLabel, balance: 0 };
  }

  return {
    months,
    totalIngresos,
    totalEgresos,
    totalFlujoNeto: totalIngresos - totalEgresos,
    costEstimatesComplete: allMilestonesInPeriod.every(
      (milestone) => milestone.estimatedCostGTQ !== null
    ),
    totalHitosCount: allMilestonesInPeriod.length,
    maxMonthIngreso: maxIngreso,
    maxMonthEgreso: maxEgreso,
    lowestCashPoint,
    allMilestonesInPeriod,
  };
}
