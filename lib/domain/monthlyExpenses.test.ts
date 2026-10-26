import { describe, expect, it } from 'vitest';
import { buildMonthlyExpenseSeries } from './monthlyExpenses';
import type { ExpenseRecord } from '../types';

const expense = (id: string, projectId: string, date: string, amount: number): ExpenseRecord => ({
  id,
  projectId,
  date,
  category: 'Materiales (Cementos, Hierro)',
  description: 'Compra registrada',
  supplier: 'Proveedor',
  nitSupplier: 'CF',
  facturaNumber: '1',
  amount,
  currency: 'GTQ',
  paymentMethod: 'Pendiente',
});

describe('buildMonthlyExpenseSeries', () => {
  it('returns no chart points when there are no recorded expenses', () => {
    expect(buildMonthlyExpenseSeries([], 'all', '6m', new Date(2026, 9, 1))).toEqual([]);
  });

  it('aggregates only recorded expenses for the selected project and months', () => {
    const series = buildMonthlyExpenseSeries(
      [
        expense('a', 'project-a', '2026-10-02', 12500),
        expense('b', 'project-a', '2026-10-20', 2500),
        expense('c', 'project-b', '2026-10-10', 9000),
      ],
      'project-a',
      '6m',
      new Date(2026, 9, 1)
    );

    expect(series).toHaveLength(6);
    expect(series.at(-1)).toMatchObject({
      monthKey: '2026-10',
      amountGTQ: 15000,
    });
    expect(series.reduce((total, month) => total + month.amountGTQ, 0)).toBe(15000);
  });

  it('uses the recorded month span for the all-records range', () => {
    const series = buildMonthlyExpenseSeries(
      [expense('a', 'project-a', '2025-12-15', 100), expense('b', 'project-a', '2026-02-01', 300)],
      'all',
      'all',
      new Date(2026, 9, 1)
    );

    expect(series.map((month) => month.monthKey)).toEqual(['2025-12', '2026-01', '2026-02']);
    expect(series.map((month) => month.amountGTQ)).toEqual([100, 0, 300]);
  });
});
