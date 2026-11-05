import { describe, expect, it } from 'vitest';
import { buildProjectAlerts } from './projectAlerts';
import type { Project } from '../types';

function p(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-test',
    code: 'T-01',
    name: 'Proyecto de prueba',
    client: 'Cliente',
    location: 'Zona 1',
    municipality: 'Guatemala',
    department: 'Guatemala',
    budgetTotal: 100_000,
    spentTotal: 0,
    progressPercent: 0,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    status: 'En Ejecución',
    lat: 14.6133,
    lng: -90.4875,
    ...overrides,
  };
}

describe('buildProjectAlerts', () => {
  it('returns empty array for healthy project (< 60%)', () => {
    expect(buildProjectAlerts([p({ spentTotal: 50_000 })])).toHaveLength(0);
  });

  it('returns warning for 65% usage', () => {
    const alerts = buildProjectAlerts([p({ spentTotal: 65_000 })]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('warning');
  });

  it('returns critical for 80%+ usage', () => {
    const alerts = buildProjectAlerts([p({ spentTotal: 80_000 })]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('critical');
  });

  it('returns critical when margin threshold crossed', () => {
    // default margin 15% → threshold 85%. 86k = 86%
    const alerts = buildProjectAlerts([p({ spentTotal: 86_000, expectedProfitMarginPercent: 15 })]);
    expect(alerts[0].severity).toBe('critical');
  });

  it('only alerts at-risk projects in a mixed list', () => {
    const alerts = buildProjectAlerts([
      p({ id: 'safe', spentTotal: 10_000 }), // 10% — safe
      p({ id: 'warning', spentTotal: 65_000 }), // 65% — warning
      p({ id: 'critical', spentTotal: 85_000 }), // 85% — critical
    ]);
    expect(alerts).toHaveLength(2);
    const ids = alerts.map((a) => a.projectId);
    expect(ids).toContain('warning');
    expect(ids).toContain('critical');
    expect(ids).not.toContain('safe');
  });

  it('alert message contains project name and percentage', () => {
    const alerts = buildProjectAlerts([p({ name: 'Torre Vista', spentTotal: 70_000 })]);
    expect(alerts[0].message).toContain('Torre Vista');
    expect(alerts[0].message).toMatch(/\d+\.?\d*%/);
  });

  it('handles empty list', () => {
    expect(buildProjectAlerts([])).toHaveLength(0);
  });

  it('handles zero budget without throwing', () => {
    expect(() => buildProjectAlerts([p({ budgetTotal: 0, spentTotal: 0 })])).not.toThrow();
  });

  it('custom high margin (30%) triggers critical at 72%', () => {
    // margin 30% → threshold 70%. 72k = 72% > 70%
    const alerts = buildProjectAlerts([p({ spentTotal: 72_000, expectedProfitMarginPercent: 30 })]);
    expect(alerts[0].severity).toBe('critical');
  });

  it('includes projectId in alert', () => {
    const alerts = buildProjectAlerts([p({ id: 'my-id', spentTotal: 80_000 })]);
    expect(alerts[0].projectId).toBe('my-id');
  });
});
