import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ExpenseRecord } from '@/lib/types';
import { useBudgetSummary } from './useBudgetSummary';

function makeExpense(
  id: string,
  amount: number,
  approvalStatus: ExpenseRecord['approvalStatus']
): ExpenseRecord {
  return {
    id,
    projectId: 'project-1',
    date: '2026-11-16',
    category: 'Imprevistos',
    description: `Gasto ${id}`,
    supplier: 'Proveedor de prueba',
    nitSupplier: 'CF',
    facturaNumber: id,
    amount,
    currency: 'GTQ',
    paymentMethod: approvalStatus === 'Aprobado' ? 'Efectivo' : 'Pendiente',
    approvalStatus,
  };
}

describe('useBudgetSummary', () => {
  it('includes approved and pending expenses but excludes rejected expenses', () => {
    const expenses = [
      makeExpense('approved', 1200, 'Aprobado'),
      makeExpense('pending', 300, 'Pendiente'),
      makeExpense('rejected', 900, 'Rechazado'),
    ];

    const { result } = renderHook(() => useBudgetSummary([], expenses));

    expect(result.current.spentTotal).toBe(1500);
  });

  it('treats legacy expenses without an approval status as countable', () => {
    const expenses = [makeExpense('legacy', 450, undefined)];

    const { result } = renderHook(() => useBudgetSummary([], expenses));

    expect(result.current.spentTotal).toBe(450);
  });
});
