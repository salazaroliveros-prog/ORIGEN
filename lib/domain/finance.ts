import type { Project } from '@/lib/types';

export function getBudgetUsagePercent(
  project: Pick<Project, 'budgetTotal' | 'spentTotal'>
): number {
  if (!project.budgetTotal || project.budgetTotal <= 0) return 0;
  return (project.spentTotal / project.budgetTotal) * 100;
}

export function calculateProjectMargin(
  project: Pick<Project, 'budgetTotal' | 'spentTotal'>,
  defaultFallback = 15
): number {
  if (!project.budgetTotal || project.budgetTotal <= 0) return defaultFallback;
  const remaining = project.budgetTotal - project.spentTotal;
  return (remaining / project.budgetTotal) * 100;
}

export function isBudgetCritical(
  project: Pick<Project, 'budgetTotal' | 'spentTotal' | 'expectedProfitMarginPercent'>
): boolean {
  const usagePercent = getBudgetUsagePercent(project);
  const threshold = project.expectedProfitMarginPercent ?? 15;
  const marginThreshold = 100 - threshold;
  return usagePercent >= 80 || project.spentTotal >= (project.budgetTotal * marginThreshold) / 100;
}
