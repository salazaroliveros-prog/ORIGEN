import type { ExpenseRecord } from '@/lib/types';
import {
  isPendingApprovalExpense,
  sumApprovedExpenses,
  sumBudgetCommitments,
  sumPendingApprovalExpenses,
} from './expenseRecognition';

export interface ProjectClosureFinancialSummary {
  approvedExpenseTotalGTQ: number;
  pendingExpenseTotalGTQ: number;
  pendingExpenseCount: number;
  committedExpenseTotalGTQ: number;
  remainingBudgetGTQ: number;
  canClose: boolean;
}

/**
 * Computes the financial gate for formal project closure.
 * Approved/legacy expenses are certified as actual spend; pending approvals
 * reduce the available budget but must be resolved before closing the project.
 */
export function calculateProjectClosureFinancialSummary(input: {
  projectId: string;
  budgetTotalGTQ: number;
  expenses: ExpenseRecord[];
}): ProjectClosureFinancialSummary {
  const projectExpenses = input.expenses.filter((expense) => expense.projectId === input.projectId);
  const budgetTotalGTQ = Number.isFinite(input.budgetTotalGTQ) ? input.budgetTotalGTQ : 0;
  const pendingExpenses = projectExpenses.filter(isPendingApprovalExpense);
  const approvedExpenseTotalGTQ = sumApprovedExpenses(projectExpenses);
  const pendingExpenseTotalGTQ = sumPendingApprovalExpenses(pendingExpenses);
  const committedExpenseTotalGTQ = sumBudgetCommitments(projectExpenses);

  return {
    approvedExpenseTotalGTQ,
    pendingExpenseTotalGTQ,
    pendingExpenseCount: pendingExpenses.length,
    committedExpenseTotalGTQ,
    remainingBudgetGTQ: Math.round((budgetTotalGTQ - committedExpenseTotalGTQ) * 100) / 100,
    canClose: pendingExpenses.length === 0,
  };
}
