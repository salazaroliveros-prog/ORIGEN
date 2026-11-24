import type { ExpenseRecord, Project } from '@/lib/types';
import {
  isApprovedExpense,
  isPendingApprovalExpense,
  isRejectedExpense,
  sumApprovedExpenses,
  sumBudgetCommitments,
  sumPendingApprovalExpenses,
  sumRejectedExpenses,
} from './expenseRecognition';

const round2 = (value: number): number => Math.round(value * 100) / 100;

/** Only approved and legacy-approved expenses can be certified as executed. */
export function projectExpensesForAudit(
  expenses: ExpenseRecord[],
  projectId: string
): ExpenseRecord[] {
  return expenses.filter(
    (expense) => expense.projectId === projectId && isApprovedExpense(expense)
  );
}

export interface ProjectAuditMetrics {
  projectId: string;
  budgetTotal: number;
  approvedExpenses: ExpenseRecord[];
  pendingExpenses: ExpenseRecord[];
  totalExpenses: number;
  pendingCount: number;
  pendingAmount: number;
  totalCommittedExpenses: number;
  rejectedCount: number;
  rejectedAmount: number;
  /** Remaining budget after approved spend and pending commitments. */
  budgetBalance: number;
  /** Remaining budget after approved spend only. */
  executedBudgetBalance: number;
  physicalProgress: number;
  financialProgress: number;
  commitmentProgress: number;
  progressDeviation: number;
  isOverBudget: boolean;
}

/**
 * Separates certified execution, pending approvals and rejected requests.
 * Budget availability subtracts approved spending plus pending commitments;
 * financial progress includes approved/legacy-approved spending only.
 */
export function buildProjectAuditMetrics(input: {
  project: Project;
  expenses: ExpenseRecord[];
}): ProjectAuditMetrics {
  const { project, expenses } = input;
  const projectExpenses = expenses.filter((expense) => expense.projectId === project.id);
  const approvedExpenses = projectExpenses.filter(isApprovedExpense);
  const pendingExpenses = projectExpenses.filter(isPendingApprovalExpense);
  const rejectedExpenses = projectExpenses.filter(isRejectedExpense);
  const budgetTotal = project.budgetTotal || 0;
  const totalExpenses = sumApprovedExpenses(approvedExpenses);
  const pendingAmount = sumPendingApprovalExpenses(pendingExpenses);
  const totalCommittedExpenses = sumBudgetCommitments(projectExpenses);
  const rejectedAmount = sumRejectedExpenses(rejectedExpenses);
  const executedBudgetBalance = round2(budgetTotal - totalExpenses);
  const budgetBalance = round2(budgetTotal - totalCommittedExpenses);
  const physicalProgress = Math.min(100, Math.max(0, project.progressPercent || 0));
  const financialProgress = budgetTotal > 0 ? round2((totalExpenses / budgetTotal) * 100) : 0;
  const commitmentProgress =
    budgetTotal > 0 ? round2((totalCommittedExpenses / budgetTotal) * 100) : 0;

  return {
    projectId: project.id,
    budgetTotal,
    approvedExpenses,
    pendingExpenses,
    totalExpenses,
    pendingCount: pendingExpenses.length,
    pendingAmount,
    totalCommittedExpenses,
    rejectedCount: rejectedExpenses.length,
    rejectedAmount,
    budgetBalance,
    executedBudgetBalance,
    physicalProgress,
    financialProgress,
    commitmentProgress,
    progressDeviation: round2(physicalProgress - financialProgress),
    isOverBudget: totalCommittedExpenses > budgetTotal,
  };
}

export interface PortfolioProjectAudit {
  project: Project;
  budgetTotal: number;
  spent: number;
  pending: number;
  committed: number;
  budgetUsagePercent: number;
  executedUsagePercent: number;
  isOverBudget: boolean;
}

export interface PortfolioAuditMetrics {
  projects: PortfolioProjectAudit[];
  totalBudget: number;
  totalSpent: number;
  totalPending: number;
  totalCommitted: number;
  remainingBudget: number;
  spentPercent: number;
  commitmentPercent: number;
  overbudgetCount: number;
  rejectedCount: number;
  rejectedAmount: number;
}

/** A missing detail ledger falls back to the persisted legacy-approved snapshot. */
export function buildPortfolioAuditMetrics(input: {
  projects: Project[];
  expenses: ExpenseRecord[];
}): PortfolioAuditMetrics {
  const { projects, expenses } = input;
  const rejectedExpenses = expenses.filter(isRejectedExpense);
  const auditedProjects: PortfolioProjectAudit[] = projects.map((project) => {
    const projectExpenses = expenses.filter((expense) => expense.projectId === project.id);
    const spent =
      projectExpenses.length > 0
        ? sumApprovedExpenses(projectExpenses)
        : round2(project.spentTotal || 0);
    const pending = sumPendingApprovalExpenses(projectExpenses);
    const committed = round2(spent + pending);
    const budgetTotal = project.budgetTotal || 0;
    return {
      project,
      budgetTotal,
      spent,
      pending,
      committed,
      budgetUsagePercent: budgetTotal > 0 ? Math.round((committed / budgetTotal) * 100) : 0,
      executedUsagePercent: budgetTotal > 0 ? Math.round((spent / budgetTotal) * 100) : 0,
      isOverBudget: committed > budgetTotal,
    };
  });

  const totalBudget = round2(auditedProjects.reduce((sum, item) => sum + item.budgetTotal, 0));
  const totalSpent = round2(auditedProjects.reduce((sum, item) => sum + item.spent, 0));
  const totalPending = round2(auditedProjects.reduce((sum, item) => sum + item.pending, 0));
  const totalCommitted = round2(totalSpent + totalPending);
  return {
    projects: auditedProjects,
    totalBudget,
    totalSpent,
    totalPending,
    totalCommitted,
    remainingBudget: round2(totalBudget - totalCommitted),
    spentPercent: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
    commitmentPercent: totalBudget > 0 ? Math.round((totalCommitted / totalBudget) * 100) : 0,
    overbudgetCount: auditedProjects.filter((item) => item.isOverBudget).length,
    rejectedCount: rejectedExpenses.length,
    rejectedAmount: sumRejectedExpenses(rejectedExpenses),
  };
}
