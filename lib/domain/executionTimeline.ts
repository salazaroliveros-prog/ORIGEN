import type { Milestone, Project, ScheduleTask } from '@/lib/types';

export type TimelineStatus =
  'sin-fechas' | 'no-iniciado' | 'en-plazo' | 'en-riesgo' | 'atrasado' | 'finalizado';

export interface ExecutionTimeline {
  startDate: string | null;
  endDate: string | null;
  plannedDurationDays: number;
  elapsedDays: number;
  remainingDays: number;
  projectedEndDate: string | null;
  delayDays: number;
  completionPercent: number;
  scheduleProgressPercent: number;
  criticalTaskCount: number;
  openTaskCount: number;
  milestoneTotal: number;
  milestoneCompleted: number;
  status: TimelineStatus;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const round2 = (value: number): number => Math.round(value * 100) / 100;
const clampPercent = (value: number): number => Math.min(100, Math.max(0, round2(value)));

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function diffInDays(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

/**
 * Progreso ponderado por peso de tarea. Si no hay pesos, promedio simple.
 */
export function calculateScheduleProgress(tasks: ScheduleTask[], milestones: Milestone[]): number {
  if (tasks.length > 0) {
    const weighted = tasks.filter((task) => Number(task.weightPercent) > 0);
    if (weighted.length > 0) {
      const totalWeight = weighted.reduce(
        (total, task) => total + Number(task.weightPercent ?? 0),
        0
      );
      if (totalWeight > 0) {
        const weightedProgress = weighted.reduce(
          (total, task) => total + Number(task.progress ?? 0) * Number(task.weightPercent ?? 0),
          0
        );
        return clampPercent(weightedProgress / totalWeight);
      }
    }
    const average =
      tasks.reduce((total, task) => total + Number(task.progress ?? 0), 0) / tasks.length;
    return clampPercent(average);
  }

  if (milestones.length > 0) {
    const weighted = milestones.filter((milestone) => Number(milestone.weightPercent) > 0);
    if (weighted.length > 0) {
      const totalWeight = weighted.reduce(
        (total, milestone) => total + Number(milestone.weightPercent ?? 0),
        0
      );
      if (totalWeight > 0) {
        const weightedProgress = weighted.reduce(
          (total, milestone) =>
            total + Number(milestone.progress ?? 0) * Number(milestone.weightPercent ?? 0),
          0
        );
        return clampPercent(weightedProgress / totalWeight);
      }
    }
    const average =
      milestones.reduce((total, milestone) => total + Number(milestone.progress ?? 0), 0) /
      milestones.length;
    return clampPercent(average);
  }

  return 0;
}

export interface ExecutionTimelineInput {
  project: Pick<
    Project,
    'startDate' | 'endDate' | 'progressPercent' | 'status' | 'scheduleTasks' | 'scheduleMilestones'
  >;
  tasks?: ScheduleTask[];
  milestones?: Milestone[];
  now?: string | Date;
}

/**
 * Calcula el cronograma de ejecución, retrasos y proyección de cierre.
 */
export function calculateExecutionTimeline({
  project,
  tasks = project.scheduleTasks ?? [],
  milestones = project.scheduleMilestones ?? [],
  now,
}: ExecutionTimelineInput): ExecutionTimeline {
  const start = toDate(project.startDate);
  const end = toDate(project.endDate);
  const today = toDate(now) ?? new Date();
  const scheduleProgressPercent = calculateScheduleProgress(tasks, milestones);
  const completionPercent = clampPercent(
    tasks.length > 0 || milestones.length > 0
      ? scheduleProgressPercent
      : Number(project.progressPercent ?? 0)
  );

  const openTaskCount = tasks.filter((task) => !task.completed).length;
  const criticalTaskCount = tasks.filter((task) => task.criticalPath && !task.completed).length;
  const milestoneCompleted = milestones.filter((milestone) => milestone.completed).length;

  if (!start || !end) {
    return {
      startDate: start ? start.toISOString().slice(0, 10) : null,
      endDate: end ? end.toISOString().slice(0, 10) : null,
      plannedDurationDays: 0,
      elapsedDays: 0,
      remainingDays: 0,
      projectedEndDate: null,
      delayDays: 0,
      completionPercent,
      scheduleProgressPercent,
      criticalTaskCount,
      openTaskCount,
      milestoneTotal: milestones.length,
      milestoneCompleted,
      status: completionPercent >= 100 ? 'finalizado' : 'sin-fechas',
    };
  }

  const plannedDurationDays = Math.max(0, diffInDays(start, end));
  const elapsedDays = Math.max(0, diffInDays(start, today));
  const remainingDays = diffInDays(today, end);
  const isFinished = completionPercent >= 100 || project.status === 'Finalizado';

  const delayDays = !isFinished && remainingDays < 0 ? Math.abs(remainingDays) : 0;

  const expectedProgressPercent =
    plannedDurationDays > 0
      ? clampPercent((Math.min(elapsedDays, plannedDurationDays) / plannedDurationDays) * 100)
      : 0;

  let projectedEndDate: string | null = end.toISOString().slice(0, 10);
  if (!isFinished && elapsedDays > 0 && completionPercent > 0 && completionPercent < 100) {
    const projectedTotalDays = Math.round(elapsedDays / (completionPercent / 100));
    projectedEndDate = addDays(start, projectedTotalDays).toISOString().slice(0, 10);
  } else if (delayDays > 0) {
    projectedEndDate = addDays(today, Math.max(1, remainingDays * -1))
      .toISOString()
      .slice(0, 10);
  }

  let status: TimelineStatus;
  if (isFinished) {
    status = 'finalizado';
  } else if (elapsedDays <= 0) {
    status = 'no-iniciado';
  } else if (delayDays > 0) {
    status = 'atrasado';
  } else if (completionPercent + 15 < expectedProgressPercent) {
    status = 'en-riesgo';
  } else {
    status = 'en-plazo';
  }

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    plannedDurationDays,
    elapsedDays,
    remainingDays,
    projectedEndDate,
    delayDays,
    completionPercent,
    scheduleProgressPercent,
    criticalTaskCount,
    openTaskCount,
    milestoneTotal: milestones.length,
    milestoneCompleted,
    status,
  };
}
