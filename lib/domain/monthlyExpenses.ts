import type { ExpenseRecord } from '../types';

export type MonthlyExpenseRange = '6m' | '12m' | 'all';

export interface MonthlyExpensePoint {
  monthKey: string;
  monthLabel: string;
  fullMonthLabel: string;
  amountGTQ: number;
}

const toMonthKey = (date: string) => {
  const match = /^(\d{4})-(\d{2})/.exec(date);
  if (!match) return null;
  const month = Number(match[2]);
  return month >= 1 && month <= 12 ? `${match[1]}-${match[2]}` : null;
};

export function buildMonthlyExpenseSeries(
  expenses: ExpenseRecord[],
  projectId: string | 'all',
  range: MonthlyExpenseRange,
  referenceDate: Date = new Date()
): MonthlyExpensePoint[] {
  const totals = new Map<string, number>();

  for (const expense of expenses) {
    if (projectId !== 'all' && expense.projectId !== projectId) continue;
    const monthKey = toMonthKey(expense.date);
    if (!monthKey) continue;
    totals.set(monthKey, (totals.get(monthKey) ?? 0) + expense.amount);
  }

  if (totals.size === 0) return [];

  const referenceMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  let startMonth: Date;
  let endMonth: Date;

  if (range === 'all') {
    const monthKeys = [...totals.keys()].sort();
    const [startYear, startNumber] = monthKeys[0].split('-').map(Number);
    const [endYear, endNumber] = monthKeys[monthKeys.length - 1].split('-').map(Number);
    startMonth = new Date(startYear, startNumber - 1, 1);
    endMonth = new Date(endYear, endNumber - 1, 1);
  } else {
    const monthsToShow = range === '6m' ? 6 : 12;
    startMonth = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth() - monthsToShow + 1, 1);
    endMonth = referenceMonth;
  }

  const result: MonthlyExpensePoint[] = [];
  for (
    const month = new Date(startMonth);
    month <= endMonth;
    month.setMonth(month.getMonth() + 1)
  ) {
    const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
    result.push({
      monthKey,
      monthLabel: new Intl.DateTimeFormat('es-GT', { month: 'short' }).format(month),
      fullMonthLabel: new Intl.DateTimeFormat('es-GT', { month: 'long', year: 'numeric' }).format(month),
      amountGTQ: totals.get(monthKey) ?? 0,
    });
  }

  return result;
}
