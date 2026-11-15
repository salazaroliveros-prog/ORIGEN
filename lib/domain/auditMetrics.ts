import type { ExpenseRecord, Project } from '@/lib/types';
import { isCountableExpense, sumCountableExpenses } from '@/lib/projectCalculations';

const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * Gastos que un acta de auditoría puede certificar.
 *
 * Un gasto `Rechazado` no es gasto ejecutado: si entra al acta, el documento
 * oficial certifica erogaciones que la propia obra desconoció. Se excluye aquí,
 * en el dominio, para que todos los reportes usen el mismo criterio.
 */
export function projectExpensesForAudit(
  expenses: ExpenseRecord[],
  projectId: string
): ExpenseRecord[] {
  return expenses.filter(
    (expense) => expense.projectId === projectId && isCountableExpense(expense)
  );
}

export interface ProjectAuditMetrics {
  projectId: string;
  budgetTotal: number;
  /** Gastos ejecutados (sin rechazados). */
  countableExpenses: ExpenseRecord[];
  totalExpenses: number;
  rejectedCount: number;
  rejectedAmount: number;
  budgetBalance: number;
  physicalProgress: number;
  financialProgress: number;
  progressDeviation: number;
  isOverBudget: boolean;
}

/**
 * Métricas certificables de una obra.
 *
 * `budgetBalance` es presupuesto menos gasto ejecutado: si un gasto rechazado
 * se restara, el acta reportaría un saldo menor al real.
 */
export function buildProjectAuditMetrics(input: {
  project: Project;
  expenses: ExpenseRecord[];
}): ProjectAuditMetrics {
  const { project, expenses } = input;
  const projectExpenses = expenses.filter((expense) => expense.projectId === project.id);
  const countableExpenses = projectExpenses.filter(isCountableExpense);
  const rejectedExpenses = projectExpenses.filter((expense) => !isCountableExpense(expense));

  const budgetTotal = project.budgetTotal || 0;
  const totalExpenses = sumCountableExpenses(countableExpenses);
  const rejectedAmount = round2(
    rejectedExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)
  );
  const budgetBalance = round2(budgetTotal - totalExpenses);
  const physicalProgress = Math.min(100, Math.max(0, project.progressPercent || 0));
  const financialProgress = budgetTotal > 0 ? round2((totalExpenses / budgetTotal) * 100) : 0;

  return {
    projectId: project.id,
    budgetTotal,
    countableExpenses,
    totalExpenses,
    rejectedCount: rejectedExpenses.length,
    rejectedAmount,
    budgetBalance,
    physicalProgress,
    financialProgress,
    progressDeviation: round2(physicalProgress - financialProgress),
    isOverBudget: totalExpenses > budgetTotal,
  };
}

export interface PortfolioProjectAudit {
  project: Project;
  budgetTotal: number;
  spent: number;
  budgetUsagePercent: number;
  isOverBudget: boolean;
}

export interface PortfolioAuditMetrics {
  projects: PortfolioProjectAudit[];
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;
  spentPercent: number;
  overbudgetCount: number;
  rejectedCount: number;
  rejectedAmount: number;
}

/**
 * Consolidado de cartera para el informe ejecutivo.
 *
 * Si una obra no tiene gastos cargados se respeta el `spentTotal` ya derivado
 * por la capa de datos (proyectos sin movimientos). Nunca se suma un rechazado.
 */
export function buildPortfolioAuditMetrics(input: {
  projects: Project[];
  expenses: ExpenseRecord[];
}): PortfolioAuditMetrics {
  const { projects, expenses } = input;
  const rejectedExpenses = expenses.filter((expense) => !isCountableExpense(expense));

  const auditedProjects: PortfolioProjectAudit[] = projects.map((project) => {
    const projectExpenses = expenses.filter((expense) => expense.projectId === project.id);
    const spent =
      projectExpenses.length > 0
        ? sumCountableExpenses(projectExpenses)
        : round2(project.spentTotal || 0);
    const budgetTotal = project.budgetTotal || 0;

    return {
      project,
      budgetTotal,
      spent,
      budgetUsagePercent: budgetTotal > 0 ? Math.round((spent / budgetTotal) * 100) : 0,
      isOverBudget: spent > budgetTotal,
    };
  });

  const totalBudget = round2(auditedProjects.reduce((sum, item) => sum + item.budgetTotal, 0));
  const totalSpent = round2(auditedProjects.reduce((sum, item) => sum + item.spent, 0));

  return {
    projects: auditedProjects,
    totalBudget,
    totalSpent,
    remainingBudget: round2(totalBudget - totalSpent),
    spentPercent: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
    overbudgetCount: auditedProjects.filter((item) => item.isOverBudget).length,
    rejectedCount: rejectedExpenses.length,
    rejectedAmount: round2(
      rejectedExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)
    ),
  };
}
