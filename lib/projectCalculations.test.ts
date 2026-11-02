import { describe, it, expect } from 'vitest';
import {
  calculateBudgetUtilizationPercent,
  calculateProjectMetrics,
  calculateProjectProgress,
  calculateProjectSpentById,
  calculateProjectSpentTotal,
  isProjectOverBudget,
  updateProjectWithCalculatedMetrics,
} from './projectCalculations';
import type { ExpenseRecord, Milestone, Project, ScheduleTask } from './types';

const task = (overrides: Partial<ScheduleTask>): ScheduleTask => ({
  id: 'task-1',
  projectId: 'proj-1',
  name: 'Tarea',
  phase: 'Fase',
  startDate: '2026-01-01',
  endDate: '2026-01-10',
  progress: 0,
  criticalPath: false,
  predecessors: [],
  ...overrides,
});

const milestone = (overrides: Partial<Milestone>): Milestone => ({
  id: 'ms-1',
  projectId: 'proj-1',
  title: 'Hito',
  phase: 'Fase',
  targetDate: '2026-01-10',
  completed: false,
  progress: 0,
  weightPercent: 0,
  ...overrides,
});

const expense = (overrides: Partial<ExpenseRecord>): ExpenseRecord => ({
  id: 'exp-1',
  projectId: 'proj-1',
  date: '2026-01-05',
  category: 'Materiales (Cementos, Hierro)',
  description: 'Compra',
  supplier: 'Proveedor',
  nitSupplier: 'CF',
  facturaNumber: '1',
  amount: 1000,
  currency: 'GTQ',
  paymentMethod: 'Efectivo',
  ...overrides,
});

const project = (overrides: Partial<Project> = {}): Project => ({
  id: 'proj-1',
  code: 'P-1',
  name: 'Proyecto',
  client: 'Cliente',
  location: 'Guatemala',
  municipality: 'Guatemala',
  department: 'Guatemala',
  budgetTotal: 10000,
  spentTotal: 0,
  progressPercent: 0,
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  status: 'En Ejecución',
  lat: 14.6,
  lng: -90.5,
  ...overrides,
});

describe('calculateProjectProgress', () => {
  it('prioritizes completed tasks over milestones', () => {
    const tasks = [
      task({ id: 'a', completed: true }),
      task({ id: 'b', completed: false }),
      task({ id: 'c', completed: false }),
      task({ id: 'd', completed: false }),
    ];
    const milestones = [milestone({ completed: true })];
    expect(calculateProjectProgress(tasks, milestones)).toBe(25);
  });

  it('uses milestones when tasks are absent', () => {
    const milestones = [
      milestone({ id: 'm1', completed: true }),
      milestone({ id: 'm2', completed: false }),
    ];
    expect(calculateProjectProgress([], milestones)).toBe(50);
  });

  it('returns zero without tasks or milestones', () => {
    expect(calculateProjectProgress(undefined, undefined)).toBe(0);
    expect(calculateProjectProgress([], [])).toBe(0);
  });
});

describe('project spending helpers', () => {
  const expenses = [
    expense({ id: 'e1', projectId: 'proj-1', amount: 1500 }),
    expense({ id: 'e2', projectId: 'proj-1', amount: 2500 }),
    expense({ id: 'e3', projectId: 'proj-2', amount: 9000 }),
  ];

  it('sums all expenses', () => {
    expect(calculateProjectSpentTotal(expenses)).toBe(13000);
  });

  it('sums expenses for a single project', () => {
    expect(calculateProjectSpentById(expenses, 'proj-1')).toBe(4000);
    expect(calculateProjectSpentById(expenses, 'unknown')).toBe(0);
  });

  it('detects over-budget projects strictly above the limit', () => {
    const base = project({ budgetTotal: 4000 });
    expect(isProjectOverBudget(base, 4000)).toBe(false);
    expect(isProjectOverBudget(base, 4000.01)).toBe(true);
  });

  it('computes rounded budget utilization', () => {
    expect(calculateBudgetUtilizationPercent(project({ budgetTotal: 3000 }), 1000)).toBe(33);
    expect(calculateBudgetUtilizationPercent(project({ budgetTotal: 0 }), 1000)).toBe(0);
  });
});

describe('calculateProjectMetrics', () => {
  it('combines spending, progress and remaining budget', () => {
    const tasks = [task({ id: 'a', completed: true }), task({ id: 'b', completed: false })];
    const metrics = calculateProjectMetrics(project({ budgetTotal: 10000, scheduleTasks: tasks }), [
      expense({ amount: 6000 }),
    ]);

    expect(metrics.spentTotal).toBe(6000);
    expect(metrics.progressPercent).toBe(50);
    expect(metrics.budgetUtilizationPercent).toBe(60);
    expect(metrics.isOverBudget).toBe(false);
    expect(metrics.remainingBudget).toBe(4000);
  });

  it('flags over-budget with negative remaining', () => {
    const metrics = calculateProjectMetrics(project({ budgetTotal: 1000 }), [
      expense({ amount: 1500 }),
    ]);
    expect(metrics.isOverBudget).toBe(true);
    expect(metrics.remainingBudget).toBe(-500);
    expect(metrics.budgetUtilizationPercent).toBe(150);
  });
});

describe('updateProjectWithCalculatedMetrics', () => {
  it('returns a new project with recalculated fields', () => {
    const original = project({
      budgetTotal: 10000,
      spentTotal: 0,
      progressPercent: 0,
      scheduleMilestones: [
        milestone({ id: 'm1', completed: true }),
        milestone({ id: 'm2', completed: false }),
      ],
    });
    const updated = updateProjectWithCalculatedMetrics(original, [expense({ amount: 2500 })]);

    expect(updated).not.toBe(original);
    expect(updated.spentTotal).toBe(2500);
    expect(updated.progressPercent).toBe(50);
    expect(original.spentTotal).toBe(0);
  });
});
