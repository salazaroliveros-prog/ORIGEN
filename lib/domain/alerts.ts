import type { Project } from '@/lib/types';

export type BudgetAlert = {
  projectId: string;
  projectName: string;
  budgetUsagePercent: number;
  projectMarginPercent: number;
  severity: 'warning' | 'critical';
  message: string;
};

export const BUDGET_WARNING_THRESHOLD = 60;
export const BUDGET_CRITICAL_THRESHOLD = 80;

export function evaluateBudgetAlert(
  project: Pick<Project, 'id' | 'name' | 'budgetTotal' | 'spentTotal' | 'expectedProfitMarginPercent'>
): BudgetAlert | null {
  const budgetTotal = project.budgetTotal || 0;
  const spentTotal = project.spentTotal || 0;
  const expectedMarginPercent = project.expectedProfitMarginPercent ?? 15;

  if (!budgetTotal || budgetTotal <= 0) return null;

  const budgetUsagePercent = (spentTotal / budgetTotal) * 100;
  const projectMarginPercent = ((budgetTotal - spentTotal) / budgetTotal) * 100;
  const marginThreshold = 100 - expectedMarginPercent;
  const isCritical = budgetUsagePercent >= BUDGET_CRITICAL_THRESHOLD || spentTotal >= (budgetTotal * marginThreshold) / 100;

  if (!isCritical && budgetUsagePercent < BUDGET_WARNING_THRESHOLD) return null;

  const severity = isCritical ? 'critical' : 'warning';
  const message = isCritical
    ? `El proyecto "${project.name}" ha superado el umbral crítico de gasto: ${budgetUsagePercent.toFixed(1)}% del presupuesto y margen restante ${projectMarginPercent.toFixed(1)}%.`
    : `El proyecto "${project.name}" está en nivel de advertencia: ${budgetUsagePercent.toFixed(1)}% del presupuesto ejecutado.`;

  return {
    projectId: project.id,
    projectName: project.name,
    budgetUsagePercent,
    projectMarginPercent,
    severity,
    message,
  };
}

export function buildBudgetAlerts(projects: Pick<Project, 'id' | 'name' | 'budgetTotal' | 'spentTotal' | 'expectedProfitMarginPercent'>[]): BudgetAlert[] {
  return projects
    .map((project) => evaluateBudgetAlert(project))
    .filter((alert): alert is BudgetAlert => Boolean(alert));
}
