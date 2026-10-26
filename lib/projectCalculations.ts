/**
 * Funciones para cálculos automáticos de proyectos
 * Calcula progreso, gasto total y métricas derivadas
 */

import type { Project, ScheduleTask, Milestone, ExpenseRecord } from './types';

/**
 * Calcula el progreso del proyecto basado en tareas completadas
 * Si no hay tareas, usa milestones. Si no hay milestones, retorna 0.
 */
export function calculateProjectProgress(tasks?: ScheduleTask[], milestones?: Milestone[]): number {
  // Prioridad 1: Usar tareas del cronograma
  if (tasks && tasks.length > 0) {
    const completedTasks = tasks.filter((task) => task.completed === true).length;
    const totalTasks = tasks.length;
    return Math.round((completedTasks / totalTasks) * 100);
  }

  // Prioridad 2: Usar milestones
  if (milestones && milestones.length > 0) {
    const completedMilestones = milestones.filter((m) => m.completed === true).length;
    const totalMilestones = milestones.length;
    return Math.round((completedMilestones / totalMilestones) * 100);
  }

  // Si no hay tareas ni milestones, retornar 0
  return 0;
}

/**
 * Calcula el gasto total del proyecto sumando todos los gastos
 */
export function calculateProjectSpentTotal(expenses: ExpenseRecord[]): number {
  return expenses.reduce((total, expense) => total + expense.amount, 0);
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
 * Determina si un proyecto está sobre presupuesto
 */
export function isProjectOverBudget(project: Project, spentTotal: number): boolean {
  return spentTotal > project.budgetTotal;
}

/**
 * Calcula el porcentaje de presupuesto ejercido
 */
export function calculateBudgetUtilizationPercent(project: Project, spentTotal: number): number {
  if (project.budgetTotal <= 0) return 0;
  return Math.round((spentTotal / project.budgetTotal) * 100);
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
