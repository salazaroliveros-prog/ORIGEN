import type { Project } from '@/lib/types';
import {
  BUDGET_CRITICAL_USAGE_PERCENT,
  BUDGET_WARNING_USAGE_PERCENT,
  summarizeProjectFinance,
} from './projectFinance';

export type BudgetAlert = {
  projectId: string;
  projectName: string;
  budgetUsagePercent: number;
  projectMarginPercent: number;
  severity: 'warning' | 'critical';
  message: string;
};

export const BUDGET_WARNING_THRESHOLD = BUDGET_WARNING_USAGE_PERCENT;
export const BUDGET_CRITICAL_THRESHOLD = BUDGET_CRITICAL_USAGE_PERCENT;

export function evaluateBudgetAlert(
  project: Pick<
    Project,
    'id' | 'name' | 'budgetTotal' | 'spentTotal' | 'expectedProfitMarginPercent'
  >
): BudgetAlert | null {
  const summary = summarizeProjectFinance(project);
  if (!summary.isCritical && !summary.isWarning) return null;

  const severity = summary.isCritical ? 'critical' : 'warning';
  const message = summary.isCritical
    ? `El proyecto "${project.name}" ha superado el umbral crítico de gasto: ${summary.budgetUsagePercent.toFixed(1)}% del presupuesto y margen restante ${summary.projectMarginPercent.toFixed(1)}%.`
    : `El proyecto "${project.name}" está en nivel de advertencia: ${summary.budgetUsagePercent.toFixed(1)}% del presupuesto ejecutado.`;

  return {
    projectId: project.id,
    projectName: project.name,
    budgetUsagePercent: summary.budgetUsagePercent,
    projectMarginPercent: summary.projectMarginPercent,
    severity,
    message,
  };
}

export function buildBudgetAlerts(
  projects: Pick<
    Project,
    'id' | 'name' | 'budgetTotal' | 'spentTotal' | 'expectedProfitMarginPercent'
  >[]
): BudgetAlert[] {
  return projects
    .map((project) => evaluateBudgetAlert(project))
    .filter((alert): alert is BudgetAlert => Boolean(alert));
}
