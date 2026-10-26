import { describe, expect, it } from 'vitest';
import { calculateSixMonthCashFlow } from './cashFlowService';
import type { Milestone, Project } from './types';

const project = (id: string, overrides: Partial<Project> = {}): Project => ({
  id,
  code: id,
  name: `Proyecto ${id}`,
  client: 'Cliente',
  location: 'Ubicación',
  municipality: 'Municipio',
  department: 'Departamento',
  budgetTotal: 200000,
  spentTotal: 0,
  progressPercent: 0,
  startDate: '2026-11-01',
  endDate: '2027-05-01',
  status: 'En Ejecución',
  lat: 0,
  lng: 0,
  ...overrides,
});

const milestone = (projectId: string, overrides: Partial<Milestone> = {}): Milestone => ({
  id: 'milestone-1',
  projectId,
  title: 'Cimentación',
  phase: 'Cimentación',
  targetDate: '2026-11-15',
  completed: false,
  progress: 0,
  weightPercent: 25,
  ...overrides,
});

describe('calculateSixMonthCashFlow', () => {
  const startDate = new Date(2026, 10, 1);

  it('does not generate cash flow when a project has no saved milestones', () => {
    const summary = calculateSixMonthCashFlow([project('a')], [], {
      startDate,
      selectedProjectId: 'a',
    });

    expect(summary.totalHitosCount).toBe(0);
    expect(summary.totalIngresos).toBe(0);
    expect(summary.totalEgresos).toBe(0);
    expect(summary.months.every((month) => month.ingresos === 0 && month.egresos === 0)).toBe(true);
  });

  it('projects a saved milestone using its project budget and configured margin', () => {
    const summary = calculateSixMonthCashFlow(
      [project('a', { expectedProfitMarginPercent: 20 })],
      [milestone('a')],
      { startDate, selectedProjectId: 'a' }
    );

    expect(summary.months[0]).toMatchObject({
      monthKey: '2026-11',
      ingresos: 50000,
      egresos: 40000,
      hitosCount: 1,
    });
    expect(summary.costEstimatesComplete).toBe(true);
  });

  it('keeps costs unknown when the project has no configured margin', () => {
    const summary = calculateSixMonthCashFlow(
      [project('a')],
      [milestone('a')],
      { startDate, selectedProjectId: 'a' }
    );

    expect(summary.months[0].ingresos).toBe(50000);
    expect(summary.months[0].egresos).toBe(0);
    expect(summary.allMilestonesInPeriod[0].estimatedCostGTQ).toBeNull();
    expect(summary.costEstimatesComplete).toBe(false);
  });

  it('does not include milestones from other projects in the selected project projection', () => {
    const summary = calculateSixMonthCashFlow(
      [project('a', { expectedProfitMarginPercent: 20 }), project('b', { expectedProfitMarginPercent: 10 })],
      [milestone('a'), milestone('b', { id: 'milestone-2' })],
      { startDate, selectedProjectId: 'a' }
    );

    expect(summary.totalHitosCount).toBe(1);
    expect(summary.totalIngresos).toBe(50000);
    expect(summary.allMilestonesInPeriod.map((item) => item.projectId)).toEqual(['a']);
  });
});
