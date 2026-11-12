import type { Project } from '@/lib/types';

export const BUDGET_WARNING_USAGE_PERCENT = 60;
export const BUDGET_CRITICAL_USAGE_PERCENT = 80;

export type ProjectFinancialSummary = {
  budgetUsagePercent: number;
  projectMarginPercent: number;
  isCritical: boolean;
  isWarning: boolean;
  expectedMarginPercent: number;
};

export function summarizeProjectFinance(
  project: Pick<Project, 'budgetTotal' | 'spentTotal' | 'expectedProfitMarginPercent'>
): ProjectFinancialSummary {
  const budgetTotal = project.budgetTotal || 0;
  const spentTotal = project.spentTotal || 0;
  const expectedMarginPercent = project.expectedProfitMarginPercent ?? 15;

  const budgetUsagePercent = budgetTotal > 0 ? (spentTotal / budgetTotal) * 100 : 0;
  const projectMarginPercent =
    budgetTotal > 0 ? ((budgetTotal - spentTotal) / budgetTotal) * 100 : 100;
  const marginThreshold = 100 - expectedMarginPercent;
  const isCritical =
    budgetTotal > 0 &&
    (budgetUsagePercent >= BUDGET_CRITICAL_USAGE_PERCENT ||
      spentTotal >= (budgetTotal * marginThreshold) / 100);
  const isWarning =
    budgetTotal > 0 && !isCritical && budgetUsagePercent >= BUDGET_WARNING_USAGE_PERCENT;

  return {
    budgetUsagePercent,
    projectMarginPercent,
    isCritical,
    isWarning,
    expectedMarginPercent,
  };
}
