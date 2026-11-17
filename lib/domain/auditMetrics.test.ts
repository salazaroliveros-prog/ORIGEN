import { describe, expect, it } from 'vitest';
import type { ExpenseRecord, Project } from '@/lib/types';
import { buildPortfolioAuditMetrics, buildProjectAuditMetrics, projectExpensesForAudit } from './auditMetrics';

const project: Project = {
  id: 'proj-1', code: 'OBRA-2026-01', name: 'Torre de prueba', client: 'Cliente',
  location: 'Guatemala', municipality: 'Guatemala', department: 'Guatemala',
  budgetTotal: 100000, spentTotal: 0, progressPercent: 40, status: 'En Ejecución',
  startDate: '2026-01-01', endDate: '2026-12-31', lat: 14.6349, lng: -90.5069,
};

function expense(overrides: Partial<ExpenseRecord> & Pick<ExpenseRecord, 'id' | 'amount'>) {
  return {
    projectId: 'proj-1', date: '2026-11-01', category: 'Materiales (Cementos, Hierro)',
    description: 'Material', supplier: 'Proveedor', nitSupplier: 'CF',
    facturaNumber: 'FAC-1', currency: 'GTQ', paymentMethod: 'Efectivo', ...overrides,
  } as ExpenseRecord;
}

describe('projectExpensesForAudit', () => {
  it('includes approved and legacy records, but excludes pending, rejected and other projects', () => {
    const result = projectExpensesForAudit([
      expense({ id: 'approved', amount: 1000, approvalStatus: 'Aprobado' }),
      expense({ id: 'legacy', amount: 200 }),
      expense({ id: 'pending', amount: 500, approvalStatus: 'Pendiente' }),
      expense({ id: 'rejected', amount: 9999, approvalStatus: 'Rechazado' }),
      expense({ id: 'other-project', amount: 700, projectId: 'proj-2' }),
    ], 'proj-1');
    expect(result.map((item) => item.id)).toEqual(['approved', 'legacy']);
  });
});

describe('buildProjectAuditMetrics', () => {
  it('certifies approved spend only and exposes pending commitments separately', () => {
    const metrics = buildProjectAuditMetrics({
      project,
      expenses: [
        expense({ id: 'approved', amount: 25000, approvalStatus: 'Aprobado' }),
        expense({ id: 'pending', amount: 5000, approvalStatus: 'Pendiente' }),
        expense({ id: 'rejected', amount: 80000, approvalStatus: 'Rechazado' }),
      ],
    });
    expect(metrics.totalExpenses).toBe(25000);
    expect(metrics.approvedExpenses.map((item) => item.id)).toEqual(['approved']);
    expect(metrics.pendingCount).toBe(1);
    expect(metrics.pendingAmount).toBe(5000);
    expect(metrics.totalCommittedExpenses).toBe(30000);
    expect(metrics.rejectedCount).toBe(1);
    expect(metrics.rejectedAmount).toBe(80000);
    expect(metrics.budgetBalance).toBe(70000);
    expect(metrics.executedBudgetBalance).toBe(75000);
  });

  it('compares certified execution and total budget commitment independently', () => {
    const metrics = buildProjectAuditMetrics({
      project,
      expenses: [
        expense({ id: 'approved', amount: 25000, approvalStatus: 'Aprobado' }),
        expense({ id: 'pending', amount: 15000, approvalStatus: 'Pendiente' }),
      ],
    });
    expect(metrics.financialProgress).toBe(25);
    expect(metrics.commitmentProgress).toBe(40);
    expect(metrics.totalExpenses).toBe(25000);
    expect(metrics.pendingAmount).toBe(15000);
    expect(metrics.physicalProgress).toBe(40);
    expect(metrics.progressDeviation).toBe(15);
  });

  it('flags a budget overrun caused by approved spend plus pending approvals', () => {
    const metrics = buildProjectAuditMetrics({
      project,
      expenses: [
        expense({ id: 'approved', amount: 20000, approvalStatus: 'Aprobado' }),
        expense({ id: 'pending', amount: 90000, approvalStatus: 'Pendiente' }),
      ],
    });
    expect(metrics.totalExpenses).toBe(20000);
    expect(metrics.totalCommittedExpenses).toBe(110000);
    expect(metrics.isOverBudget).toBe(true);
    expect(metrics.budgetBalance).toBe(-10000);
  });

  it('handles a project without expenses', () => {
    const metrics = buildProjectAuditMetrics({ project, expenses: [] });
    expect(metrics.totalExpenses).toBe(0);
    expect(metrics.budgetBalance).toBe(100000);
    expect(metrics.financialProgress).toBe(0);
  });
});

describe('buildPortfolioAuditMetrics', () => {
  it('separates approved spend, pending commitments and rejected expenses', () => {
    const metrics = buildPortfolioAuditMetrics({
      projects: [project],
      expenses: [
        expense({ id: 'approved', amount: 30000, approvalStatus: 'Aprobado' }),
        expense({ id: 'pending', amount: 5000, approvalStatus: 'Pendiente' }),
        expense({ id: 'rejected', amount: 10000, approvalStatus: 'Rechazado' }),
      ],
    });
    expect(metrics.totalBudget).toBe(100000);
    expect(metrics.totalSpent).toBe(30000);
    expect(metrics.totalPending).toBe(5000);
    expect(metrics.totalCommitted).toBe(35000);
    expect(metrics.remainingBudget).toBe(65000);
    expect(metrics.spentPercent).toBe(30);
    expect(metrics.commitmentPercent).toBe(35);
    expect(metrics.rejectedCount).toBe(1);
    expect(metrics.rejectedAmount).toBe(10000);
  });

  it('retains a persisted legacy snapshot when detailed expenses are absent', () => {
    const metrics = buildPortfolioAuditMetrics({
      projects: [{ ...project, id: 'proj-2', spentTotal: 42000 }],
      expenses: [],
    });
    expect(metrics.projects[0].spent).toBe(42000);
    expect(metrics.projects[0].committed).toBe(42000);
    expect(metrics.totalSpent).toBe(42000);
    expect(metrics.totalCommitted).toBe(42000);
  });

  it('does not fall back when all the project expenses were rejected', () => {
    const metrics = buildPortfolioAuditMetrics({
      projects: [{ ...project, spentTotal: 999999 }],
      expenses: [expense({ id: 'x', amount: 5000, approvalStatus: 'Rechazado' })],
    });
    expect(metrics.projects[0].spent).toBe(0);
    expect(metrics.totalSpent).toBe(0);
  });

  it('flags projects when approved spend plus pending requests exceed their budget', () => {
    const metrics = buildPortfolioAuditMetrics({
      projects: [project],
      expenses: [
        expense({ id: 'approved', amount: 20000, approvalStatus: 'Aprobado' }),
        expense({ id: 'pending', amount: 90000, approvalStatus: 'Pendiente' }),
      ],
    });
    expect(metrics.totalSpent).toBe(20000);
    expect(metrics.totalPending).toBe(90000);
    expect(metrics.projects[0].isOverBudget).toBe(true);
    expect(metrics.overbudgetCount).toBe(1);
    expect(metrics.remainingBudget).toBe(-10000);
  });
});
