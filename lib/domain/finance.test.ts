import { describe, it, expect } from 'vitest';
import {
  getBudgetUsagePercent,
  calculateProjectMargin,
  isBudgetCritical,
} from './finance';
import type { Project } from '../types';

const baseProject: Pick<
  Project,
  'budgetTotal' | 'spentTotal' | 'expectedProfitMarginPercent'
> = {
  budgetTotal: 10000,
  spentTotal: 3000,
  expectedProfitMarginPercent: 15,
};

describe('getBudgetUsagePercent', () => {
  it('calculates usage percent correctly', () => {
    expect(getBudgetUsagePercent(baseProject)).toBe(30);
  });

  it('returns 0 when budget is zero or missing', () => {
    expect(getBudgetUsagePercent({ ...baseProject, budgetTotal: 0 })).toBe(0);
    expect(getBudgetUsagePercent({ ...baseProject, budgetTotal: undefined as unknown as number })).toBe(0);
  });
});

describe('calculateProjectMargin', () => {
  it('calculates margin correctly', () => {
    expect(calculateProjectMargin(baseProject)).toBe(70);
  });

  it('returns default fallback when budget is zero', () => {
    expect(calculateProjectMargin({ ...baseProject, budgetTotal: 0 }, 25)).toBe(25);
  });
});

describe('isBudgetCritical', () => {
  it('returns false when below threshold', () => {
    expect(isBudgetCritical({ ...baseProject, spentTotal: 5000 })).toBe(false);
  });

  it('returns true when usage >= 80%', () => {
    expect(isBudgetCritical({ ...baseProject, spentTotal: 8500 })).toBe(true);
  });
});
