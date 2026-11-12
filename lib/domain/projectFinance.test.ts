import { describe, it, expect } from 'vitest';
import { summarizeProjectFinance } from './projectFinance';

describe('summarizeProjectFinance', () => {
  it('summarizes usage, margin and expected threshold', () => {
    const summary = summarizeProjectFinance({
      budgetTotal: 10000,
      spentTotal: 4000,
      expectedProfitMarginPercent: 20,
    });

    expect(summary.budgetUsagePercent).toBe(40);
    expect(summary.projectMarginPercent).toBe(60);
    expect(summary.expectedMarginPercent).toBe(20);
    expect(summary.isCritical).toBe(false);
    expect(summary.isWarning).toBe(false);
  });

  it('treats a healthy project as non-critical', () => {
    const summary = summarizeProjectFinance({
      budgetTotal: 10000,
      spentTotal: 6000,
      expectedProfitMarginPercent: 15,
    });

    expect(summary.budgetUsagePercent).toBe(60);
    expect(summary.isCritical).toBe(false);
    expect(summary.isWarning).toBe(true);
  });

  it('defaults the expected margin to 15%', () => {
    const summary = summarizeProjectFinance({
      budgetTotal: 20000,
      spentTotal: 1000,
      expectedProfitMarginPercent: null,
    });
    expect(summary.expectedMarginPercent).toBe(15);
    expect(summary.isWarning).toBe(false);
  });

  it('handles a zero budget without dividing by zero', () => {
    const summary = summarizeProjectFinance({
      budgetTotal: 0,
      spentTotal: 0,
      expectedProfitMarginPercent: 15,
    });

    expect(summary.budgetUsagePercent).toBe(0);
    expect(summary.projectMarginPercent).toBe(100);
    expect(summary.isCritical).toBe(false);
    expect(summary.isWarning).toBe(false);
  });

  it('is critical when spending reaches the margin threshold', () => {
    const summary = summarizeProjectFinance({
      budgetTotal: 10000,
      spentTotal: 8600,
      expectedProfitMarginPercent: 15,
    });
    expect(summary.isCritical).toBe(true);
    expect(summary.isWarning).toBe(false);
  });
});
