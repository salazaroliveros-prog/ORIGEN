'use client';

/**
 * Hook de cálculo de resumen de presupuesto.
 * Encapsula la lógica de presupuesto APU vs gasto ejecutado.
 */
import { useMemo } from 'react';
import type { APUItem, ExpenseRecord } from '@/lib/types';
import { createLogger } from '@/lib/utils/logger';
import { calculateBudgetSummary } from '@/lib/utils/calculations';

const log = createLogger('useBudgetSummary');

export interface BudgetSummaryResult {
  budgetTotal: number;
  spentTotal: number;
  remaining: number;
  utilization: number; // 0-100%
  variance: number; // spentTotal - budgetAPU
}

export function useBudgetSummary(
  apuItems: APUItem[],
  expenses: ExpenseRecord[]
): BudgetSummaryResult {
  return useMemo(() => {
    if (apuItems.length === 0 && expenses.length === 0) {
      return {
        budgetTotal: 0,
        spentTotal: 0,
        remaining: 0,
        utilization: 0,
        variance: 0,
      };
    }

    try {
      return calculateBudgetSummary(
        apuItems,
        expenses.reduce((sum, exp) => sum + exp.amount, 0)
      );
    } catch (error) {
      log.error('Budget summary calculation failed', error as Error, {
        apuItemsCount: apuItems.length,
        expensesCount: expenses.length,
      });
      return {
        budgetTotal: 0,
        spentTotal: 0,
        remaining: 0,
        utilization: 0,
        variance: 0,
      };
    }
  }, [apuItems, expenses]);
}
