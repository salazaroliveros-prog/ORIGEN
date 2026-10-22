import { describe, it, expect } from 'vitest';
import { evaluateBudgetAlert, buildBudgetAlerts } from './alerts';
import type { Project } from '../types';

const project: Pick<
  Project,
  'id' | 'name' | 'budgetTotal' | 'spentTotal' | 'expectedProfitMarginPercent'
> = {
  id: 'p-1',
  name: 'Proyecto A',
  budgetTotal: 10000,
  spentTotal: 8500,
  expectedProfitMarginPercent: 15,
};

describe('evaluateBudgetAlert', () => {
  it('returns null when healthy', () => {
    expect(evaluateBudgetAlert({ ...project, spentTotal: 4000 })).toBeNull();
  });

  it('returns warning alert when near threshold', () => {
    const alert = evaluateBudgetAlert({ ...project, spentTotal: 6500 });
    expect(alert).not.toBeNull();
    expect(alert!.severity).toBe('warning');
  });

  it('returns critical alert when over critical threshold', () => {
    const alert = evaluateBudgetAlert({ ...project, spentTotal: 8500 });
    expect(alert).not.toBeNull();
    expect(alert!.severity).toBe('critical');
  });
});

describe('buildBudgetAlerts', () => {
  it('filters out healthy projects', () => {
    const alerts = buildBudgetAlerts([
      { ...project, spentTotal: 4000 },
      { ...project, spentTotal: 8500 },
    ]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('critical');
  });
});
