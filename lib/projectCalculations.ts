/**
 * Funciones para cálculos automáticos de proyectos
 * Calcula progreso, gasto total y métricas derivadas
 */

import { summarizeProjectFinance } from './domain/projectFinance';
import { calculateScheduleProgress } from './domain/executionTimeline';
import type { Project, ScheduleTask, Milestone, ExpenseRecord, APUItem, QuoteRecord, AttendanceRecord, Machinery, MachineryLog } from './types';
import { isBudgetCommitmentExpense, sumBudgetCommitments } from './domain/expenseRecognition';

export {
  classifyExpenseApproval, isApprovedExpense, isBudgetCommitmentExpense,
  isPendingApprovalExpense, isRejectedExpense, sumApprovedExpenses,
  sumBudgetCommitments, sumPendingApprovalExpenses, sumRejectedExpenses,
} from './domain/expenseRecognition';

/** @deprecated Use isBudgetCommitmentExpense; pending approvals are not executed spend. */
export const isCountableExpense = isBudgetCommitmentExpense;
/** @deprecated Use sumBudgetCommitments; pending approvals are included. */
export const sumCountableExpenses = sumBudgetCommitments;

/**
 * Calcula el progreso del proyecto.
 * Usa el mismo criterio ponderado que el cronograma (`calculateScheduleProgress`):
 * - Si las tareas tienen `weightPercent`, se pondera por peso.
 * - Si no hay pesos, promedio simple.
 * - `completed: true` cuenta como 100 aunque `progress` venga en 0 (datos legacy).
 * El resultado se redondea al entero usado en la UI.
 */
export function calculateProjectProgress(tasks?: ScheduleTask[], milestones?: Milestone[]): number {
  return Math.round(calculateScheduleProgress(tasks ?? [], milestones ?? []));
}

/**
 * Define el avance a mostrar para un proyecto.
 * Solo se recalcula desde el cronograma cuando existen tareas o hitos;
 * de lo contrario se conserva el avance manual capturado en el formulario.
 */
export function resolveProjectProgress(
  tasks: ScheduleTask[] | undefined,
  milestones: Milestone[] | undefined,
  currentProgress: number | undefined
): number {
  const hasSchedule = (tasks?.length ?? 0) > 0 || (milestones?.length ?? 0) > 0;
  if (!hasSchedule) return currentProgress ?? 0;
  return calculateProjectProgress(tasks, milestones);
}

/**
 * Aplica una edición de proyecto sin permitir que el formulario sobrescriba
 * los campos derivados (`spentTotal`, `progressPercent`).
 *
 * - `spentTotal` se conserva del registro existente: el gasto ejecutado solo
 *   cambia cuando cambian los gastos, nunca al editar datos del proyecto.
 * - `progressPercent` se recalcula desde el cronograma si existe; si no, se
 *   respeta el avance manual capturado en el formulario.
 */
export function mergeProjectUpdate(
  existing: Project,
  data: Partial<Project>,
  context: { companyId: string; ownerId: string }
): Project {
  const merged: Project = {
    ...existing,
    ...data,
    id: existing.id,
    companyId: context.companyId,
    // La propiedad original es inmutable en Firestore. Solo los registros
    // legacy sin ownerId reciben el usuario autenticado como fallback.
    ownerId: existing.ownerId ?? context.ownerId,
    spentTotal: existing.spentTotal,
  };

  return {
    ...merged,
    progressPercent: resolveProjectProgress(
      merged.scheduleTasks,
      merged.scheduleMilestones,
      merged.progressPercent
    ),
  };
}

/**
 * Calcula los gastos registrados no rechazados del proyecto.
 * Incluye solicitudes pendientes para medir el presupuesto comprometido; excluye rechazados.
 */
export function calculateProjectSpentTotal(expenses: ExpenseRecord[]): number {
  return sumBudgetCommitments(expenses);
}

/**
 * Calcula el gasto total de un proyecto específico
 */
export function calculateProjectSpentById(expenses: ExpenseRecord[], projectId: string): number {
  return sumBudgetCommitments(expenses.filter((expense) => expense.projectId === projectId));
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * Deriva los campos de proyecto que NUNCA deben persistirse desde el formulario:
 * - `spentTotal`: suma de gastos registrados para el proyecto (fuente única de verdad).
 * - `progressPercent`: avance real del cronograma (ponderado por peso de tarea/hito).
 *
 * Se aplica en la capa de datos (`useProjectData`) para que tableros, reportes y
 * gráficas consuman siempre el mismo valor.
 */
export function deriveProjectsFinancials(
  projects: Project[],
  expenses: ExpenseRecord[]
): Project[] {
  const spentByProject = new Map<string, number>();
  for (const expense of expenses) {
    if (!isBudgetCommitmentExpense(expense)) continue;
    spentByProject.set(
      expense.projectId,
      (spentByProject.get(expense.projectId) ?? 0) + expense.amount
    );
  }

  return projects.map((project) => ({
    ...project,
    spentTotal: round2(spentByProject.get(project.id) ?? 0),
    progressPercent: resolveProjectProgress(
      project.scheduleTasks,
      project.scheduleMilestones,
      project.progressPercent
    ),
  }));
}

/**
 * Determina si un proyecto está sobre presupuesto
 */
export function isProjectOverBudget(project: Project, spentTotal: number): boolean {
  return spentTotal > (project.budgetTotal || 0);
}

/**
 * Calcula el porcentaje de presupuesto ejercido
 */
export function calculateBudgetUtilizationPercent(project: Project, spentTotal: number): number {
  if ((project.budgetTotal || 0) <= 0) return 0;
  return Math.round(
    summarizeProjectFinance({ budgetTotal: project.budgetTotal, spentTotal }).budgetUsagePercent
  );
}

/**
 * Calcula métricas agregadas de un proyecto
 */
export function calculateProjectMetrics(
  project: Project,
  expenses: ExpenseRecord[]
): {
  spentTotal: number;
  progressPercent: number;
  budgetUtilizationPercent: number;
  isOverBudget: boolean;
  remainingBudget: number;
} {
  const spentTotal = calculateProjectSpentById(expenses, project.id);
  const progressPercent = calculateProjectProgress(
    project.scheduleTasks,
    project.scheduleMilestones
  );
  const budgetUtilizationPercent = calculateBudgetUtilizationPercent(project, spentTotal);
  const isOverBudget = isProjectOverBudget(project, spentTotal);
  const remainingBudget = project.budgetTotal - spentTotal;

  return {
    spentTotal,
    progressPercent,
    budgetUtilizationPercent,
    isOverBudget,
    remainingBudget,
  };
}

/**
 * Actualiza un proyecto con métricas calculadas automáticamente
 */
export function updateProjectWithCalculatedMetrics(
  project: Project,
  expenses: ExpenseRecord[]
): Project {
  const metrics = calculateProjectMetrics(project, expenses);

  return {
    ...project,
    spentTotal: metrics.spentTotal,
    progressPercent: metrics.progressPercent,
  };
}

/**
 * Verifica si un proyecto tiene dependencias que impedirían su eliminación segura.
 *
 * Retorna un objeto con:
 *  - hasDependencies: true si hay al menos una dependencia
 *  - dependencies: lista de módulos con conteo de elementos vinculados
 *  - canDelete: true si no hay dependencias (seguro para borrar)
 *
 * Se usa antes de permitir deleteProject para evitar huérfanos en:
 *  - expenses (gastos registrados)
 *  - apuItems (partidas de presupuesto APU)
 *  - quotes (cotizaciones)
 *  - attendance (registros de asistencia)
 *  - machineryLogs (bitácoras de maquinaria vinculadas al proyecto)
 */
export interface ProjectDependencies {
  hasDependencies: boolean;
  canDelete: boolean;
  dependencies: Record<string, number>;
}

export function hasProjectDependencies(params: {
  projectId: string;
  expenses?: ExpenseRecord[];
  apuItems?: APUItem[];
  quotes?: QuoteRecord[];
  attendance?: AttendanceRecord[];
  machineryLogs?: MachineryLog[];
}): ProjectDependencies {
  const { projectId, expenses = [], apuItems = [], quotes = [], attendance = [], machineryLogs = [] } = params;

  const dependencies: Record<string, number> = {};

  const expenseCount = expenses.filter((e) => e.projectId === projectId).length;
  if (expenseCount > 0) dependencies.expenses = expenseCount;

  const apuCount = apuItems.filter((a) => a.projectId === projectId).length;
  if (apuCount > 0) dependencies.apuItems = apuCount;

  const quoteCount = quotes.filter((q) => q.projectId === projectId).length;
  if (quoteCount > 0) dependencies.quotes = quoteCount;

  const attendanceCount = attendance.filter((a) => a.projectId === projectId).length;
  if (attendanceCount > 0) dependencies.attendance = attendanceCount;

  const machineryLogCount = machineryLogs.filter((m) => m.projectId === projectId).length;
  if (machineryLogCount > 0) dependencies.machineryLogs = machineryLogCount;

  const hasDependencies = Object.keys(dependencies).length > 0;

  return {
    hasDependencies,
    canDelete: !hasDependencies,
    dependencies,
  };
}
