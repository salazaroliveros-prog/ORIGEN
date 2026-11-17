import { describe, expect, it } from 'vitest';
import type { ExpenseRecord } from '@/lib/types';
import { calculateProjectClosureFinancialSummary } from './projectClosure';

const expense = (
  id: string,
  projectId: string,
  amount: number,
  approvalStatus?: ExpenseRecord['approvalStatus']
): ExpenseRecord => ({
  id,
  projectId,
  date: '2026-11-16',
  category: 'Materiales (Cementos, Hierro)',
  description: id,
  supplier: 'Proveedor',
  nitSupplier: 'CF',
  facturaNumber: id,
  amount,
  currency: 'GTQ',
  paymentMethod: 'Pendiente',
  ...(approvalStatus ? { approvalStatus } : {}),
});

describe('calculateProjectClosureFinancialSummary', () => {
  it('separates approved spend from pending commitments and excludes rejected expenses', () => {
    const summary = calculateProjectClosureFinancialSummary({
      projectId: 'project-1',
      budgetTotalGTQ: 100000,
      expenses: [
        expense('approved', 'project-1', 30000, 'Aprobado'),
        expense('pending', 'project-1', 5000, 'Pendiente'),
        expense('rejected', 'project-1', 9000, 'Rechazado'),
        expense('other-project', 'project-2', 80000, 'Pendiente'),
      ],
    });

    expect(summary.approvedExpenseTotalGTQ).toBe(30000);
    expect(summary.pendingExpenseTotalGTQ).toBe(5000);
    expect(summary.pendingExpenseCount).toBe(1);
    expect(summary.committedExpenseTotalGTQ).toBe(35000);
    expect(summary.remainingBudgetGTQ).toBe(65000);
    expect(summary.canClose).toBe(false);
  });

  it('allows closure when no pending approvals remain and keeps legacy expenses recognized', () => {
    const summary = calculateProjectClosureFinancialSummary({
      projectId: 'project-1',
      budgetTotalGTQ: 50000,
      expenses: [
        expense('approved', 'project-1', 20000, 'Aprobado'),
        expense('legacy', 'project-1', 5000),
        expense('rejected', 'project-1', 10000, 'Rechazado'),
      ],
    });

    expect(summary.approvedExpenseTotalGTQ).toBe(25000);
    expect(summary.pendingExpenseCount).toBe(0);
    expect(summary.committedExpenseTotalGTQ).toBe(25000);
    expect(summary.remainingBudgetGTQ).toBe(25000);
    expect(summary.canClose).toBe(true);
  });

  it('does not close while a pending approval exists even when its amount is zero', () => {
    const summary = calculateProjectClosureFinancialSummary({
      projectId: 'project-1',
      budgetTotalGTQ: 0,
      expenses: [expense('pending-zero', 'project-1', 0, 'Pendiente')],
    });

    expect(summary.pendingExpenseCount).toBe(1);
    expect(summary.canClose).toBe(false);
  });
});
