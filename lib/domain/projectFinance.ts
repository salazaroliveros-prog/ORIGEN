import type { Project } from '@/lib/types';

export type ProjectFinancialSummary = {
  budgetUsagePercent: number;
  projectMarginPercent: number;
  isCritical: boolean;
  expectedMarginPercent: number;
};

export function summarizeProjectFinance(
  project: Pick<Project, 'budgetTotal' | 'spentTotal' | 'expectedProfitMarginPercent'>
): ProjectFinancialSummary {
  const budgetTotal = project.budgetTotal || 0;
  const spentTotal = project.spentTotal || 0;
  const expectedMarginPercent = project.expectedProfitMarginPercent ?? 15;

  const budgetUsagePercent = budgetTotal > 0 ? (spentTotal / budgetTotal) * 100 : 0;
  const projectMarginPercent = budgetTotal > 0 ? ((budgetTotal - spentTotal) / budgetTotal) * 100 : 100;
  const marginThreshold = 100 - expectedMarginPercent;
  const isCritical = budgetUsagePercent >= 80 || spentTotal >= (budgetTotal * marginThreshold) / 100;

  return {
    budgetUsagePercent,
    projectMarginPercent,
    isCritical,
    expectedMarginPercent,
  };
}
