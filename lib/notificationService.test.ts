import { describe, expect, it } from 'vitest';

import type { Milestone, Project, ScheduleTask, TaskReminder } from './types';
import {
  calculateOverallProjectProgress,
  checkAllProjectsBudgetAndMargin,
  checkProjectBudgetAndMargin,
  evaluateGlobalNotifications,
  evaluateRemindersAndDeadlines,
  validateTaskWorkflowFlow,
} from './notificationService';

// ---------- Factories (tipos completos para strict TS) ----------

function makeTask(overrides: Partial<ScheduleTask> & { id: string }): ScheduleTask {
  return {
    projectId: 'p1',
    name: `tarea-${overrides.id}`,
    phase: 'Estructura',
    startDate: '2025-01-01',
    endDate: '2025-01-10',
    progress: 0,
    criticalPath: false,
    predecessors: [],
    ...overrides,
  };
}

function makeMilestone(overrides: Partial<Milestone> & { id: string }): Milestone {
  return {
    projectId: 'p1',
    title: `hito-${overrides.id}`,
    phase: 'Estructura',
    targetDate: '2025-02-01',
    completed: false,
    progress: 0,
    weightPercent: 100,
    ...overrides,
  };
}

function makeReminder(overrides: Partial<TaskReminder> & { id: string }): TaskReminder {
  return {
    projectId: 'p1',
    taskName: 'tarea-1',
    title: 'Recordatorio',
    description: 'desc',
    targetDate: '2025-05-20',
    advanceOption: 'same_day',
    priority: 'Media',
    channel: 'in_app',
    enabled: true,
    createdAt: '2025-05-01',
    ...overrides,
  };
}

function makeProject(overrides: Partial<Project> & { id: string }): Project {
  return {
    code: 'PRY-01',
    name: 'Proyecto Test',
    client: 'Cliente',
    location: 'Ciudad',
    municipality: 'Mixco',
    department: 'Guatemala',
    budgetTotal: 1000,
    spentTotal: 0,
    progressPercent: 0,
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    status: 'En Ejecución',
    lat: 0,
    lng: 0,
    ...overrides,
  };
}

describe('validateTaskWorkflowFlow', () => {
  it('no bloquea tareas sin predecesoras', () => {
    const task = makeTask({ id: 't1', predecessors: [] });
    expect(validateTaskWorkflowFlow(task, [task])).toEqual({
      isBlocked: false,
      blockingTasks: [],
      message: '',
    });
  });

  it('bloquea cuando una predecesora no está completa (progreso < 100)', () => {
    const prev = makeTask({ id: 't1', progress: 50, completed: false });
    const task = makeTask({ id: 't2', predecessors: ['t1'] });
    const result = validateTaskWorkflowFlow(task, [prev, task]);
    expect(result.isBlocked).toBe(true);
    expect(result.blockingTasks).toHaveLength(1);
    expect(result.blockingTasks[0].id).toBe('t1');
    expect(result.message).toContain('tarea-t1');
    expect(result.message).toContain('50%');
  });

  it('no bloquea solo si la predecesora está completa Y con 100%', () => {
    const prev = makeTask({ id: 't1', progress: 100, completed: true });
    const task = makeTask({ id: 't2', predecessors: ['t1'] });
    expect(validateTaskWorkflowFlow(task, [prev, task]).isBlocked).toBe(false);
  });

  it('sigue bloqueando si completed=true pero progreso < 100', () => {
    const prev = makeTask({ id: 't1', progress: 80, completed: true });
    const task = makeTask({ id: 't2', predecessors: ['t1'] });
    expect(validateTaskWorkflowFlow(task, [prev, task]).isBlocked).toBe(true);
  });

  it('sigue bloqueando si progreso=100 pero completed=false', () => {
    const prev = makeTask({ id: 't1', progress: 100, completed: false });
    const task = makeTask({ id: 't2', predecessors: ['t1'] });
    expect(validateTaskWorkflowFlow(task, [prev, task]).isBlocked).toBe(true);
  });
});

describe('calculateOverallProjectProgress', () => {
  it('devuelve ceros sin tareas', () => {
    const r = calculateOverallProjectProgress([], []);
    expect(r).toEqual({
      tasksProgressPercent: 0,
      milestonesProgressPercent: 0,
      overallGoalPercent: 0,
      completedTasksCount: 0,
      totalTasksCount: 0,
      completedMilestonesCount: 0,
      totalMilestonesCount: 0,
      criticalTasksCount: 0,
    });
  });

  it('calcula progreso ponderado solo con tareas (sin hitos)', () => {
    const tasks = [
      makeTask({ id: 't1', progress: 100, weightPercent: 50, completed: true, criticalPath: true }),
      makeTask({ id: 't2', progress: 50, weightPercent: 50 }),
    ];
    const r = calculateOverallProjectProgress(tasks, []);
    expect(r.tasksProgressPercent).toBe(75);
    expect(r.milestonesProgressPercent).toBe(75); // sin hitos, copia el ponderado de tareas
    expect(r.overallGoalPercent).toBe(75);
    expect(r.completedTasksCount).toBe(1);
    expect(r.totalTasksCount).toBe(2);
    expect(r.criticalTasksCount).toBe(1);
  });

  it('combina 60% tareas + 40% hitos', () => {
    const tasks = [
      makeTask({ id: 't1', progress: 100, weightPercent: 50 }),
      makeTask({ id: 't2', progress: 0, weightPercent: 50 }),
    ];
    const milestones = [makeMilestone({ id: 'm1', completed: true, weightPercent: 100 })];
    const r = calculateOverallProjectProgress(tasks, milestones);
    expect(r.tasksProgressPercent).toBe(50);
    expect(r.milestonesProgressPercent).toBe(100);
    expect(r.overallGoalPercent).toBe(70); // 50*0.6 + 100*0.4
    expect(r.completedMilestonesCount).toBe(1);
  });

  it('limita el objetivo global a 100', () => {
    const tasks = [makeTask({ id: 't1', progress: 100, weightPercent: 100 })];
    const milestones = [
      makeMilestone({ id: 'm1', completed: true, progress: 100, weightPercent: 100 }),
    ];
    const r = calculateOverallProjectProgress(tasks, milestones);
    expect(r.overallGoalPercent).toBe(100);
  });
});

describe('evaluateRemindersAndDeadlines', () => {
  it('no dispara recordatorios inhabilitados', () => {
    const reminders = [makeReminder({ id: 'r1', enabled: false, targetDate: '2025-05-15' })];
    expect(evaluateRemindersAndDeadlines(reminders, [], [], '2025-05-15')).toHaveLength(0);
  });

  it('respeta la antelación configurada (3_days_before dispara justo en el umbral)', () => {
    const reminders = [
      makeReminder({ id: 'r1', targetDate: '2025-05-20', advanceOption: '3_days_before' }),
    ];
    // umbral = 2025-05-17
    expect(evaluateRemindersAndDeadlines(reminders, [], [], '2025-05-16')).toHaveLength(0);
    const alerts = evaluateRemindersAndDeadlines(reminders, [], [], '2025-05-17');
    expect(alerts).toHaveLength(1);
    expect(alerts[0].id).toBe('alert-rem-r1');
    expect(alerts[0].message).toContain('Faltan 3 días');
  });

  it('marca "Vence hoy" y prioridad Alta como urgente', () => {
    const reminders = [
      makeReminder({
        id: 'r1',
        targetDate: '2025-05-20',
        advanceOption: '1_week_before',
        priority: 'Alta',
        title: 'Colado',
      }),
    ];
    const alerts = evaluateRemindersAndDeadlines(reminders, [], [], '2025-05-20');
    const a = alerts.find((x) => x.id === 'alert-rem-r1');
    expect(a?.message).toContain('¡Vence hoy!');
    expect(a?.type).toBe('urgent');
    expect(a?.title).toContain('🔔 [Alta Prioridad]');
  });

  it('marca vencidos con "(Venció hace N días)"', () => {
    const reminders = [
      makeReminder({ id: 'r1', targetDate: '2025-05-20', advanceOption: 'same_day' }),
    ];
    const alert = evaluateRemindersAndDeadlines(reminders, [], [], '2025-05-25').find(
      (x) => x.id === 'alert-rem-r1'
    );
    expect(alert?.message).toContain('Venció hace 5 días');
  });

  it('emite alerta de desvío de flujo cuando una tarea con progreso viola sus predecesoras', () => {
    const t1 = makeTask({ id: 't1', progress: 0, completed: false });
    const t2 = makeTask({ id: 't2', progress: 50, completed: false, predecessors: ['t1'] });
    const alerts = evaluateRemindersAndDeadlines([], [t1, t2], [], '2025-05-15');
    const flow = alerts.find((x) => x.id === 'flow-block-t2');
    expect(flow).toBeDefined();
    expect(flow?.type).toBe('warning');
    expect(flow?.priority).toBe('Alta');
    expect(flow?.isFlowNotice).toBe(true);
  });
});

describe('checkProjectBudgetAndMargin (margen CGC 15%)', () => {
  it('no alerta con gasto bajo', () => {
    const p = makeProject({ id: 'p1', budgetTotal: 1000, spentTotal: 100 });
    expect(checkProjectBudgetAndMargin(p, 15)).toHaveLength(0);
  });

  it('no alerta si no hay presupuesto', () => {
    expect(checkProjectBudgetAndMargin(makeProject({ id: 'p1', budgetTotal: 0 }), 15)).toHaveLength(
      0
    );
  });

  it('alerta 80% y margen comprometido al alcanzar el umbral (85%)', () => {
    const p = makeProject({ id: 'p1', code: 'PRY-X', budgetTotal: 1000, spentTotal: 850 });
    const types = checkProjectBudgetAndMargin(p, 15).map((a) => a.type);
    expect(types).toContain('budget_80');
    expect(types).toContain('profit_margin_exceeded');
    expect(types).not.toContain('budget_100');
  });

  it('alerta solo 80% antes del umbral de margen', () => {
    const p = makeProject({ id: 'p1', budgetTotal: 1000, spentTotal: 820 });
    const alerts = checkProjectBudgetAndMargin(p, 15);
    expect(alerts.map((a) => a.type)).toEqual(['budget_80']);
  });

  it('alerta de presupuesto excedido (100%) más margen comprometido', () => {
    const p = makeProject({ id: 'p1', budgetTotal: 1000, spentTotal: 1000 });
    const types = checkProjectBudgetAndMargin(p, 15).map((a) => a.type);
    expect(types).toContain('budget_100');
    expect(types).toContain('profit_margin_exceeded');
  });

  it('dispara margen comprometido por debajo del 80% con margen objetivo alto', () => {
    const p = makeProject({ id: 'p1', budgetTotal: 1000, spentTotal: 700 });
    const alerts = checkProjectBudgetAndMargin(p, 30); // umbral = 70%
    expect(alerts.map((a) => a.type)).toEqual(['profit_margin_exceeded']);
    expect(alerts[0].currentMarginPercent).toBeCloseTo(30);
  });
});

describe('checkAllProjectsBudgetAndMargin', () => {
  it('usa el margen esperado por proyecto o 15% por defecto', () => {
    const withMargin = makeProject({ id: 'p1', budgetTotal: 1000, spentTotal: 780 });
    withMargin.expectedProfitMarginPercent = 25; // umbral = 75% -> 780 >= 750
    const defaultProject = makeProject({ id: 'p2', budgetTotal: 1000, spentTotal: 780 }); // margen 15% -> umbral 850

    const alerts = checkAllProjectsBudgetAndMargin([withMargin, defaultProject]);
    const marginIds = alerts
      .filter((a) => a.type === 'profit_margin_exceeded')
      .map((a) => a.projectId);
    expect(marginIds).toEqual(['p1']); // solo el de margen 25 compromete a 780

    // p2 al 78% sigue generando alerta de presupuesto (80% threshold) pero no de margen
    const typesP2 = alerts.filter((a) => a.projectId === 'p2').map((a) => a.type);
    expect(typesP2).not.toContain('profit_margin_exceeded');
  });
});

describe('evaluateGlobalNotifications', () => {
  it('agrega alertas de presupuesto/margen de todos los proyectos', () => {
    const projects = [makeProject({ id: 'p1', code: 'PRY-A', budgetTotal: 1000, spentTotal: 900 })];
    const res = evaluateGlobalNotifications(projects, [], [], 'GTQ', 7.85);
    expect(res.totalAlertsCount).toBe(res.alerts.length);
    expect(res.alerts.length).toBe(2); // budget_80 (90%) + margin
    expect(res.alerts.map((a) => a.type)).toEqual(['warning', 'warning']);
    expect(new Set(res.alerts.map((a) => a.category))).toEqual(
      new Set(['Presupuesto', 'Margen de Utilidad'])
    );
  });

  it('incluye recordatorios solo si se proveen reminders, tasks y milestones', () => {
    const reminders = [
      makeReminder({
        id: 'r1',
        targetDate: '2025-05-15',
        advanceOption: 'same_day',
        priority: 'Media',
      }),
    ];
    const withReminders = evaluateGlobalNotifications([], [], [], 'GTQ', 7.85, reminders, [], []);
    expect(withReminders.alerts).toHaveLength(1);
    expect(withReminders.alerts[0].type).toBe('info');
    expect(withReminders.alerts[0].category).toBe('Recordatorio Hito');

    const without = evaluateGlobalNotifications([], [], [], 'GTQ', 7.85);
    expect(without.alerts).toHaveLength(0);
  });
});
