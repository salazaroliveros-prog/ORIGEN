import { describe, expect, it } from 'vitest';
import type { ExpenseRecord, Project } from '@/lib/types';
import {
  buildPortfolioAuditMetrics,
  buildProjectAuditMetrics,
  projectExpensesForAudit,
} from './auditMetrics';

const project: Project = {
  id: 'proj-1',
  code: 'OBRA-2026-01',
  name: 'Torre de prueba',
  client: 'Cliente',
  location: 'Guatemala',
  municipality: 'Guatemala',
  department: 'Guatemala',
  budgetTotal: 100000,
  spentTotal: 0,
  progressPercent: 40,
  status: 'En Ejecución',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  lat: 14.6349,
  lng: -90.5069,
};

function expense(overrides: Partial<ExpenseRecord> & Pick<ExpenseRecord, 'id' | 'amount'>) {
  return {
    projectId: 'proj-1',
    date: '2026-11-01',
    category: 'Materiales (Cementos, Hierro)',
    description: 'Material',
    supplier: 'Proveedor',
    nitSupplier: 'CF',
    facturaNumber: 'FAC-1',
    currency: 'GTQ',
    paymentMethod: 'Efectivo',
    ...overrides,
  } as ExpenseRecord;
}

describe('projectExpensesForAudit', () => {
  it('drops rejected expenses and keeps the other projects untouched', () => {
    const expenses = [
      expense({ id: 'ok', amount: 1000 }),
      expense({ id: 'pending', amount: 500, approvalStatus: 'Pendiente' }),
      expense({ id: 'rejected', amount: 9999, approvalStatus: 'Rechazado' }),
      expense({ id: 'other-project', amount: 700, projectId: 'proj-2' }),
    ];

    const result = projectExpensesForAudit(expenses, 'proj-1');

    expect(result.map((item) => item.id)).toEqual(['ok', 'pending']);
  });
});

describe('buildProjectAuditMetrics', () => {
  it('never certifies a rejected expense as executed spending', () => {
    const metrics = buildProjectAuditMetrics({
      project,
      expenses: [
        expense({ id: 'ok', amount: 25000 }),
        expense({ id: 'rejected', amount: 80000, approvalStatus: 'Rechazado' }),
      ],
    });

    expect(metrics.totalExpenses).toBe(25000);
    expect(metrics.countableExpenses.map((item) => item.id)).toEqual(['ok']);
    expect(metrics.rejectedCount).toBe(1);
    expect(metrics.rejectedAmount).toBe(80000);
  });

  it('keeps the balance at budget minus executed spending', () => {
    const metrics = buildProjectAuditMetrics({
      project,
      expenses: [
        expense({ id: 'ok', amount: 25000 }),
        expense({ id: 'rejected', amount: 80000, approvalStatus: 'Rechazado' }),
      ],
    });

    expect(metrics.budgetBalance).toBe(75000);
    expect(metrics.isOverBudget).toBe(false);
  });

  it('derives financial progress from executed spending only', () => {
    const metrics = buildProjectAuditMetrics({
      project,
      expenses: [expense({ id: 'ok', amount: 25000 })],
    });

    expect(metrics.financialProgress).toBe(25);
    expect(metrics.physicalProgress).toBe(40);
    expect(metrics.progressDeviation).toBe(15);
  });

  it('flags an overrun when executed spending exceeds the budget', () => {
    const metrics = buildProjectAuditMetrics({
      project,
      expenses: [expense({ id: 'ok', amount: 120000 })],
    });

    expect(metrics.isOverBudget).toBe(true);
    expect(metrics.budgetBalance).toBe(-20000);
  });

  it('handles a project without expenses', () => {
    const metrics = buildProjectAuditMetrics({ project, expenses: [] });

    expect(metrics.totalExpenses).toBe(0);
    expect(metrics.budgetBalance).toBe(100000);
    expect(metrics.financialProgress).toBe(0);
  });
});

describe('buildPortfolioAuditMetrics', () => {
  it('consolidates executed spending per project excluding rejected expenses', () => {
    const metrics = buildPortfolioAuditMetrics({
      projects: [project],
      expenses: [
        expense({ id: 'a', amount: 30000 }),
        expense({ id: 'b', amount: 10000, approvalStatus: 'Rechazado' }),
      ],
    });

    expect(metrics.totalBudget).toBe(100000);
    expect(metrics.totalSpent).toBe(30000);
    expect(metrics.remainingBudget).toBe(70000);
    expect(metrics.spentPercent).toBe(30);
    expect(metrics.rejectedCount).toBe(1);
    expect(metrics.rejectedAmount).toBe(10000);
  });

  it('falls back to the derived spentTotal when a project has no expense records', () => {
    const metrics = buildPortfolioAuditMetrics({
      projects: [{ ...project, id: 'proj-2', spentTotal: 42000 }],
      expenses: [],
    });

    expect(metrics.projects[0].spent).toBe(42000);
    expect(metrics.totalSpent).toBe(42000);
  });

  it('does not fall back when all the project expenses were rejected', () => {
    const metrics = buildPortfolioAuditMetrics({
      projects: [{ ...project, spentTotal: 999999 }],
      expenses: [expense({ id: 'x', amount: 5000, approvalStatus: 'Rechazado' })],
    });

    expect(metrics.projects[0].spent).toBe(0);
    expect(metrics.totalSpent).toBe(0);
  });

  it('counts over-budget projects', () => {
    const metrics = buildPortfolioAuditMetrics({
      projects: [project, { ...project, id: 'proj-3', code: 'OBRA-3', budgetTotal: 1000 }],
      expenses: [
        expense({ id: 'a', amount: 30000 }),
        expense({ id: 'b', amount: 5000, projectId: 'proj-3' }),
      ],
    });

    expect(metrics.overbudgetCount).toBe(1);
    expect(metrics.projects[1].isOverBudget).toBe(true);
  });
});
