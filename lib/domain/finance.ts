import type { Project } from '@/lib/types';
import { summarizeProjectFinance } from './projectFinance';

export function getBudgetUsagePercent(
  project: Pick<Project, 'budgetTotal' | 'spentTotal'>
): number {
  return summarizeProjectFinance(project).budgetUsagePercent;
}

export function calculateProjectMargin(
  project: Pick<Project, 'budgetTotal' | 'spentTotal'>,
  defaultFallback = 15
): number {
  if (!project.budgetTotal || project.budgetTotal <= 0) return defaultFallback;
  return summarizeProjectFinance(project).projectMarginPercent;
}

export function isBudgetCritical(
  project: Pick<Project, 'budgetTotal' | 'spentTotal' | 'expectedProfitMarginPercent'>
): boolean {
  return summarizeProjectFinance(project).isCritical;
}
