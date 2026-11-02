import { describe, it, expect } from 'vitest';
import { calculateExecutionTimeline, calculateScheduleProgress } from './executionTimeline';
import type { Milestone, Project, ScheduleTask } from '../types';

const task = (overrides: Partial<ScheduleTask>): ScheduleTask => ({
  id: 'task-1',
  projectId: 'proj-1',
  name: 'Tarea',
  phase: 'Fase 1',
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
  phase: 'Fase 1',
  targetDate: '2026-01-10',
  completed: false,
  progress: 0,
  weightPercent: 0,
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
  budgetTotal: 100000,
  spentTotal: 0,
  progressPercent: 0,
  startDate: '2026-01-01',
  endDate: '2026-03-01',
  status: 'En Ejecución',
  lat: 14.6,
  lng: -90.5,
  ...overrides,
});

describe('calculateScheduleProgress', () => {
  it('weights task progress by weightPercent', () => {
    const tasks = [
      task({ id: 'a', progress: 100, weightPercent: 70 }),
      task({ id: 'b', progress: 0, weightPercent: 30 }),
    ];
    expect(calculateScheduleProgress(tasks, [])).toBe(70);
  });

  it('falls back to a simple average when no weights exist', () => {
    const tasks = [task({ id: 'a', progress: 50 }), task({ id: 'b', progress: 100 })];
    expect(calculateScheduleProgress(tasks, [])).toBe(75);
  });

  it('uses milestones when there are no tasks', () => {
    const milestones = [
      milestone({ id: 'm1', progress: 100, weightPercent: 50 }),
      milestone({ id: 'm2', progress: 50, weightPercent: 50 }),
    ];
    expect(calculateScheduleProgress([], milestones)).toBe(75);
  });

  it('returns zero with no schedule data', () => {
    expect(calculateScheduleProgress([], [])).toBe(0);
  });
});

describe('calculateExecutionTimeline', () => {
  it('reports missing dates', () => {
    const result = calculateExecutionTimeline({
      project: project({ startDate: '', endDate: '', progressPercent: 10 }),
      now: '2026-02-01',
    });
    expect(result.status).toBe('sin-fechas');
    expect(result.startDate).toBeNull();
    expect(result.endDate).toBeNull();
    expect(result.completionPercent).toBe(10);
  });

  it('reports not started before the start date', () => {
    const result = calculateExecutionTimeline({ project: project(), now: '2025-12-15' });
    expect(result.status).toBe('no-iniciado');
    expect(result.elapsedDays).toBe(0);
    expect(result.plannedDurationDays).toBe(59);
  });

  it('reports on schedule when progress matches elapsed time', () => {
    const tasks = [task({ progress: 50, weightPercent: 100 })];
    const result = calculateExecutionTimeline({
      project: project({ scheduleTasks: tasks }),
      now: '2026-01-30',
    });
    expect(result.status).toBe('en-plazo');
    expect(result.completionPercent).toBe(50);
    expect(result.criticalTaskCount).toBe(0);
    expect(result.openTaskCount).toBe(1);
  });

  it('reports at risk when progress lags the expected curve', () => {
    const tasks = [task({ progress: 10, weightPercent: 100 })];
    const result = calculateExecutionTimeline({
      project: project({ scheduleTasks: tasks }),
      now: '2026-02-15',
    });
    expect(result.status).toBe('en-riesgo');
  });

  it('reports delays after the planned end date', () => {
    const tasks = [task({ progress: 60, weightPercent: 100 })];
    const result = calculateExecutionTimeline({
      project: project({ scheduleTasks: tasks }),
      now: '2026-03-11',
    });
    expect(result.status).toBe('atrasado');
    expect(result.delayDays).toBe(10);
    expect(result.remainingDays).toBe(-10);
  });

  it('reports finished when all tasks are complete', () => {
    const tasks = [task({ progress: 100, completed: true, weightPercent: 100 })];
    const result = calculateExecutionTimeline({
      project: project({ scheduleTasks: tasks }),
      now: '2026-04-01',
    });
    expect(result.status).toBe('finalizado');
    expect(result.delayDays).toBe(0);
    expect(result.completionPercent).toBe(100);
  });

  it('counts critical open tasks and completed milestones', () => {
    const tasks = [
      task({ id: 'a', criticalPath: true, completed: false }),
      task({ id: 'b', criticalPath: true, completed: true }),
    ];
    const milestones = [
      milestone({ id: 'm1', completed: true }),
      milestone({ id: 'm2', completed: false }),
    ];
    const result = calculateExecutionTimeline({
      project: project({ scheduleTasks: tasks, scheduleMilestones: milestones }),
      now: '2026-01-20',
    });
    expect(result.criticalTaskCount).toBe(1);
    expect(result.openTaskCount).toBe(1);
    expect(result.milestoneTotal).toBe(2);
    expect(result.milestoneCompleted).toBe(1);
  });
});

describe('timeline edge cases', () => {
  it('ignores invalid dates', () => {
    const result = calculateExecutionTimeline({
      project: project({ startDate: 'fecha-invalida', endDate: '2026-12-31' }),
      now: '2026-02-01',
    });
    expect(result.startDate).toBeNull();
    expect(result.status).toBe('sin-fechas');
  });

  it('averages milestones when they carry no weights', () => {
    const milestones = [
      milestone({ id: 'm1', progress: 20, weightPercent: 0 }),
      milestone({ id: 'm2', progress: 60, weightPercent: 0 }),
    ];
    expect(calculateScheduleProgress([], milestones)).toBe(40);
  });

  it('averages milestone weights when some have weight', () => {
    const milestones = [
      milestone({ id: 'm1', progress: 50, weightPercent: 0 }),
      milestone({ id: 'm2', progress: 100, weightPercent: 100 }),
    ];
    expect(calculateScheduleProgress([], milestones)).toBe(100);
  });

  it('defaults to the current date when now is omitted', () => {
    const result = calculateExecutionTimeline({ project: project() });
    expect(['no-iniciado', 'en-plazo', 'en-riesgo', 'atrasado', 'finalizado']).toContain(
      result.status
    );
  });

  it('projects a new end date when progress is zero but the deadline passed', () => {
    const result = calculateExecutionTimeline({
      project: project({ startDate: '2026-01-01', endDate: '2026-01-31' }),
      now: '2026-03-01',
    });
    expect(result.status).toBe('atrasado');
    expect(result.projectedEndDate).not.toBeNull();
    expect(result.projectedEndDate).not.toBe(result.endDate);
  });
});

describe('remaining branch coverage', () => {
  it('accepts Date instances for now', () => {
    const result = calculateExecutionTimeline({ project: project(), now: new Date('2026-02-01') });
    expect(result.status).not.toBe('sin-fechas');
  });

  it('handles tasks without weights or progress values', () => {
    const tasks = [
      task({ id: 'a', weightPercent: undefined as unknown as number }),
      task({ id: 'b', progress: undefined as unknown as number }),
    ];
    expect(calculateScheduleProgress(tasks, [])).toBe(0);
  });

  it('handles milestones without weights or progress values', () => {
    const milestones = [
      milestone({ id: 'm1', weightPercent: undefined as unknown as number }),
      milestone({ id: 'm2', progress: undefined as unknown as number }),
    ];
    expect(calculateScheduleProgress([], milestones)).toBe(0);
  });

  it('reports finished work when dates are missing but progress is complete', () => {
    const result = calculateExecutionTimeline({
      project: project({
        startDate: '',
        endDate: '',
        progressPercent: 100,
      }),
      now: '2026-02-01',
    });
    expect(result.status).toBe('finalizado');
    expect(result.completionPercent).toBe(100);
  });

  it('avoids zero-day durations when start and end match', () => {
    const result = calculateExecutionTimeline({
      project: project({ startDate: '2026-02-01', endDate: '2026-02-01' }),
      now: '2026-02-01',
    });
    expect(result.plannedDurationDays).toBe(0);
    expect(result.status).not.toBe('sin-fechas');
  });
});
