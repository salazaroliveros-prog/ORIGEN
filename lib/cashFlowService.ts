import { Project, Milestone } from './types';
import { initialMilestones } from './data';

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
  estimatedCostGTQ: number; // Costo proyectado de materiales y mano de obra
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
  totalHitosCount: number;
  maxMonthIngreso: { monthLabel: string; amount: number };
  maxMonthEgreso: { monthLabel: string; amount: number };
  lowestCashPoint: { monthLabel: string; balance: number };
  allMilestonesInPeriod: CashFlowMilestone[];
}

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MONTH_SHORT_ES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

/**
 * Standard phases and weights for Guatemalan structural and commercial construction projects.
 */
const DEFAULT_PHASES = [
  { phase: 'Preliminares & Licencias', weightPercent: 10, title: 'Hito 1: Permisos Municipales, Trazo y Movimiento', offsetFraction: 0.12 },
  { phase: 'Cimentación & Zapatas', weightPercent: 20, title: 'Hito 2: Cimentación y Muros de Contención', offsetFraction: 0.28 },
  { phase: 'Estructura & Losas', weightPercent: 30, title: 'Hito 3: Estructura Principal y Entrepisos', offsetFraction: 0.50 },
  { phase: 'Mampostería & Cierres', weightPercent: 15, title: 'Hito 4: Mampostería de Block y Divisiones', offsetFraction: 0.70 },
  { phase: 'Instalaciones ME&P', weightPercent: 15, title: 'Hito 5: Redes Hidráulicas, Drenajes y Fuerza Eléctrica', offsetFraction: 0.85 },
  { phase: 'Acabados & Recepción', weightPercent: 10, title: 'Hito 6: Acabados Finales y Entrega Llave en Mano', offsetFraction: 0.98 },
];

/**
 * Generates realistic milestones for projects that don't have explicit milestones registered in database.
 */
export function generateMilestonesForProject(project: Project): Milestone[] {
  const start = new Date(project.startDate || '2026-01-01');
  const end = new Date(project.endDate || '2027-06-30');
  const totalDurationMs = Math.max(end.getTime() - start.getTime(), 180 * 24 * 60 * 60 * 1000); // minimum 6 months

  return DEFAULT_PHASES.map((def, idx) => {
    const targetMs = start.getTime() + totalDurationMs * def.offsetFraction;
    const targetDate = new Date(targetMs).toISOString().split('T')[0];
    const isCompleted = (project.progressPercent || 0) >= (idx + 1) * 16.6;

    return {
      id: `gen-ms-${project.id}-${idx + 1}`,
      projectId: project.id,
      title: `${def.title} (${project.code || project.name.substring(0, 10)})`,
      phase: def.phase,
      targetDate,
      completed: isCompleted,
      progress: isCompleted ? 100 : Math.max(0, Math.min(95, Math.round(((project.progressPercent || 0) - idx * 16.6) * 6))),
      weightPercent: def.weightPercent,
      description: `Certificación de avance de obra para la fase de ${def.phase}.`,
      deliverable: `Estimación de obra aprobada por la supervisión para pago de avance.`,
    };
  });
}

/**
 * Consolidates milestones from database and generated defaults for all given projects.
 */
export function getAllProjectMilestones(projects: Project[], existingMilestones: Milestone[] = []): Milestone[] {
  const milestonesByProject = new Map<string, Milestone[]>();

  // Group existing
  existingMilestones.forEach((m) => {
    if (!milestonesByProject.has(m.projectId)) {
      milestonesByProject.set(m.projectId, []);
    }
    milestonesByProject.get(m.projectId)!.push(m);
  });

  // Ensure initialMilestones from data.ts are included if none registered yet
  initialMilestones.forEach((m) => {
    if (!milestonesByProject.has(m.projectId)) {
      milestonesByProject.set(m.projectId, []);
    }
    const currentList = milestonesByProject.get(m.projectId)!;
    if (!currentList.some((item) => item.id === m.id)) {
      currentList.push(m);
    }
  });

  // For any project lacking milestones, generate realistic ones
  projects.forEach((proj) => {
    const list = milestonesByProject.get(proj.id);
    if (!list || list.length === 0) {
      milestonesByProject.set(proj.id, generateMilestonesForProject(proj));
    }
  });

  const all: Milestone[] = [];
  milestonesByProject.forEach((list) => all.push(...list));
  return all;
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
  const relevantProjects = selectedProjId === 'all'
    ? projects.filter((p) => p.status !== 'Finalizado')
    : projects.filter((p) => p.id === selectedProjId);

  const allMilestones = getAllProjectMilestones(projects, existingMilestones);
  const projectMap = new Map<string, Project>(projects.map((p) => [p.id, p]));

  // Determine base 6-month window
  // Default to November 2026 (or options.startDate)
  const baseDate = options?.startDate || new Date(2026, 10, 1); // 2026-11-01
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
    const profitMargin = (proj.expectedProfitMarginPercent ?? 18) / 100;
    const costFactor = 1 - profitMargin; // typically ~82% of billing goes to execution costs

    projMilestones.forEach((m) => {
      const budget = proj.budgetTotal || 1000000;
      const weight = m.weightPercent > 0 ? m.weightPercent : 15;
      const billingVal = Math.round((budget * weight) / 100);
      const costVal = Math.round(billingVal * costFactor);

      const targetD = new Date(m.targetDate);
      const targetYear = targetD.getFullYear();
      const targetMonth = targetD.getMonth();
      const targetKey = `${targetD.getFullYear()}-${String(targetD.getMonth() + 1).padStart(2, '0')}`;

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
      const targetMonthBucket = months.find((bucket) => bucket.monthKey === targetKey);

      if (targetMonthBucket) {
        targetMonthBucket.hitos.push(cfMilestone);
        targetMonthBucket.hitosCount += 1;
        targetMonthBucket.ingresos += billingVal;
        allMilestonesInPeriod.push(cfMilestone);

        // Construction outflows: 60% spent in delivery month, 40% spent in preceding month
        targetMonthBucket.egresos += Math.round(costVal * 0.60);

        // Preceding month outflow
        const prevMonthIndex = targetMonthBucket.monthIndex - 1;
        if (prevMonthIndex >= 0) {
          months[prevMonthIndex].egresos += Math.round(costVal * 0.40);
        }
      }
    });

    // Add baseline site operational costs (campamento, supervisión fija, guardianía, IGSS mínimo)
    // ~1.5% of total budget spread per month for active projects
    const monthlyOverhead = Math.round((proj.budgetTotal * 0.015) / 12);
    months.forEach((b) => {
      b.egresos += monthlyOverhead;
    });
  });

  // If a month has no milestone inflows but the project is active, add proportional client advance or progress billing
  // to prevent artificial flat 0 lines when projects are actively running
  months.forEach((m) => {
    if (m.ingresos === 0 && relevantProjects.length > 0) {
      // Small baseline valuation for minor work items (~40% of egresos)
      m.ingresos = Math.round(m.egresos * 0.75);
    }
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
    totalHitosCount: allMilestonesInPeriod.length,
    maxMonthIngreso: maxIngreso,
    maxMonthEgreso: maxEgreso,
    lowestCashPoint,
    allMilestonesInPeriod,
  };
}
