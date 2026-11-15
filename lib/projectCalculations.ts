/**
 * Funciones para cálculos automáticos de proyectos
 * Calcula progreso, gasto total y métricas derivadas
 */

import { summarizeProjectFinance } from './domain/projectFinance';
import { calculateScheduleProgress } from './domain/executionTimeline';
import type { Project, ScheduleTask, Milestone, ExpenseRecord } from './types';

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
    ownerId: context.ownerId,
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
 * Calcula el gasto total del proyecto sumando solo gastos ejecutados
 * (excluye rechazados, que no consumen presupuesto).
 */
export function calculateProjectSpentTotal(expenses: ExpenseRecord[]): number {
  return sumCountableExpenses(expenses);
}

/**
 * Calcula el gasto total de un proyecto específico
 */
export function calculateProjectSpentById(expenses: ExpenseRecord[], projectId: string): number {
  return expenses
    .filter((expense) => expense.projectId === projectId)
    .reduce((total, expense) => total + expense.amount, 0);
}

/**
 * Determina si un gasto cuenta como ejecutado.
 * Un gasto rechazado en el flujo de aprobación no consume presupuesto.
 */
export function isCountableExpense(expense: ExpenseRecord): boolean {
  return expense.approvalStatus !== 'Rechazado';
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * Suma de gastos ejecutados (excluye los rechazados), redondeada a centavos.
 */
export function sumCountableExpenses(expenses: ExpenseRecord[]): number {
  return round2(
    expenses.reduce(
      (total, expense) => (isCountableExpense(expense) ? total + expense.amount : total),
      0
    )
  );
}

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
    if (!isCountableExpense(expense)) continue;
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
