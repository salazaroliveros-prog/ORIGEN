import type { ExpenseRecord } from '@/lib/types';

export type ExpenseApprovalClassification = 'approved' | 'pending' | 'rejected' | 'legacy';

/**
 * Centralizes approval interpretation for dashboards and financial reports.
 * Records created before the approval workflow have no status and remain
 * recognized as legacy-approved for backward compatibility.
 */
export function classifyExpenseApproval(
  expense: Pick<ExpenseRecord, 'approvalStatus'>
): ExpenseApprovalClassification {
  switch (expense.approvalStatus) {
    case 'Aprobado':
      return 'approved';
    case 'Pendiente':
      return 'pending';
    case 'Rechazado':
      return 'rejected';
    default:
      return 'legacy';
  }
}

export function isBudgetCommitmentExpense(expense: ExpenseRecord): boolean {
  return classifyExpenseApproval(expense) !== 'rejected';
}

export function isApprovedExpense(expense: ExpenseRecord): boolean {
  const status = classifyExpenseApproval(expense);
  return status === 'approved' || status === 'legacy';
}

export function isPendingApprovalExpense(expense: ExpenseRecord): boolean {
  return classifyExpenseApproval(expense) === 'pending';
}

export function isRejectedExpense(expense: ExpenseRecord): boolean {
  return classifyExpenseApproval(expense) === 'rejected';
}

function sumMatchingExpenses(
  expenses: ExpenseRecord[],
  predicate: (expense: ExpenseRecord) => boolean
): number {
  const total = expenses.reduce((sum, expense) => {
    if (!predicate(expense) || !Number.isFinite(expense.amount)) return sum;
    return sum + expense.amount;
  }, 0);
  return Math.round(total * 100) / 100;
}

/** Budget commitment = approved + pending + legacy, excluding rejected. */
export function sumBudgetCommitments(expenses: ExpenseRecord[]): number {
  return sumMatchingExpenses(expenses, isBudgetCommitmentExpense);
}

/** Executed/auditable spend = approved + legacy; pending and rejected are excluded. */
export function sumApprovedExpenses(expenses: ExpenseRecord[]): number {
  return sumMatchingExpenses(expenses, isApprovedExpense);
}

export function sumPendingApprovalExpenses(expenses: ExpenseRecord[]): number {
  return sumMatchingExpenses(expenses, isPendingApprovalExpense);
}

export function sumRejectedExpenses(expenses: ExpenseRecord[]): number {
  return sumMatchingExpenses(expenses, isRejectedExpense);
}
