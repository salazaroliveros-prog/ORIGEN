import { describe, expect, it } from 'vitest';
import type { ExpenseRecord } from '@/lib/types';
import {
  classifyExpenseApproval, isApprovedExpense, isBudgetCommitmentExpense,
  isPendingApprovalExpense, isRejectedExpense, sumApprovedExpenses,
  sumBudgetCommitments, sumPendingApprovalExpenses, sumRejectedExpenses,
} from './expenseRecognition';

const expense = (id: string, amount: number, approvalStatus?: ExpenseRecord['approvalStatus']): ExpenseRecord => ({
  id, projectId: 'project-1', date: '2026-11-16',
  category: 'Materiales (Cementos, Hierro)', description: id,
  supplier: 'Proveedor', nitSupplier: 'CF', facturaNumber: id,
  amount, currency: 'GTQ', paymentMethod: 'Pendiente',
  ...(approvalStatus ? { approvalStatus } : {}),
});

describe('expense approval classification', () => {
  it('distinguishes approved, pending, rejected and legacy records', () => {
    expect(classifyExpenseApproval(expense('a', 100, 'Aprobado'))).toBe('approved');
    expect(classifyExpenseApproval(expense('p', 100, 'Pendiente'))).toBe('pending');
    expect(classifyExpenseApproval(expense('r', 100, 'Rechazado'))).toBe('rejected');
    expect(classifyExpenseApproval(expense('l', 100))).toBe('legacy');
  });

  it('treats records without approval status as legacy-approved for compatibility', () => {
    const legacy = expense('legacy', 350);
    expect(isApprovedExpense(legacy)).toBe(true);
    expect(isBudgetCommitmentExpense(legacy)).toBe(true);
    expect(isPendingApprovalExpense(legacy)).toBe(false);
    expect(isRejectedExpense(legacy)).toBe(false);
  });
});

describe('expense recognition totals', () => {
  it('counts pending requests as commitments but not as executed spend', () => {
    const expenses = [
      expense('approved', 1200, 'Aprobado'),
      expense('pending', 300, 'Pendiente'),
      expense('rejected', 900, 'Rechazado'),
      expense('legacy', 450),
      expense('invalid', Number.NaN, 'Aprobado'),
    ];
    expect(sumApprovedExpenses(expenses)).toBe(1650);
    expect(sumPendingApprovalExpenses(expenses)).toBe(300);
    expect(sumBudgetCommitments(expenses)).toBe(1950);
    expect(sumRejectedExpenses(expenses)).toBe(900);
  });
});
