'use client';

import {
  calculateOverallProjectProgress,
  playNotificationChime,
  validateTaskWorkflowFlow,
} from '@/lib/notificationService';
import { Milestone, Project, ScheduleTask, TaskReminder } from '@/lib/types';
import {
  AlertTriangle,
  Award,
  Bell,
  Calendar,
  CheckCircle2,
  Plus,
  ShieldCheck,
  Sliders,
  Target,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

const getGuatemalaDate = (daysFromToday = 0) => {
  const today = getGuatemalaTodayParts();
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guatemala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(Date.UTC(today.year, today.month - 1, today.day + daysFromToday, 12)));
};

const getGuatemalaTodayParts = () => {
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guatemala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(new Date())
    .split('-')
    .map(Number);

  return { year, month, day };
};

interface GanttScheduleProps {
  tasks: ScheduleTask[];
  projects: Project[];
  activeProjectId: string;
  onUpdateTasks?: (updatedTasks: ScheduleTask[]) => void;
  onUpdateProjectProgress?: (projectId: string, newProgress: number) => void;
  reminders?: TaskReminder[];
  milestones?: Milestone[];
  onUpdateMilestones?: (updatedMilestones: Milestone[]) => void;
  onAddReminder?: (reminder: TaskReminder) => void;
  onToggleReminder?: (id: string) => void;
  onDeleteReminder?: (id: string) => void;
}

export function GanttSchedule({
  tasks,
  projects,
  activeProjectId,
  onUpdateTasks,
  onUpdateProjectProgress,
  reminders: propReminders,
  milestones: propMilestones,
  onUpdateMilestones,
  onAddReminder,
  onToggleReminder,
  onDeleteReminder,
}: GanttScheduleProps) {
  const activeProject = projects.find((p) => p.id === activeProjectId);

  // Local state fallbacks if parent does not pass full handlers
  const [localMilestones, setLocalMilestones] = useState<Milestone[]>(propMilestones ?? []);
  const [localReminders, setLocalReminders] = useState<TaskReminder[]>(propReminders ?? []);
  const [viewMode, setViewMode] = useState<'tasks' | 'milestones' | 'roadmap' | 'reminders'>(
    'tasks'
  );
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'in_progress' | 'completed' | 'critical'
  >('all');
  const [searchFilter, setSearchFilter] = useState('');

  // New task modal state
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskPhase, setNewTaskPhase] = useState('Estructura');
  const [newTaskStart, setNewTaskStart] = useState(getGuatemalaDate);
  const [newTaskEnd, setNewTaskEnd] = useState(() => getGuatemalaDate(30));
  const [newTaskCritical, setNewTaskCritical] = useState(false);
  const [newTaskAssigned, setNewTaskAssigned] = useState('');
  const [newTaskPredecessor, setNewTaskPredecessor] = useState('');
  const [newTaskWeight, setNewTaskWeight] = useState(10);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestonePhase, setNewMilestonePhase] = useState('Estructura');
  const [newMilestoneDate, setNewMilestoneDate] = useState(getGuatemalaDate);
  const [newMilestoneWeight, setNewMilestoneWeight] = useState(10);
  const [newMilestoneDescription, setNewMilestoneDescription] = useState('');
  const [newMilestoneDeliverable, setNewMilestoneDeliverable] = useState('');
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderDescription, setNewReminderDescription] = useState('');
  const [newReminderDate, setNewReminderDate] = useState(getGuatemalaDate);
  const [newReminderTaskId, setNewReminderTaskId] = useState('');
  const [newReminderPriority, setNewReminderPriority] = useState<TaskReminder['priority']>('Media');

  // Workflow violation banner
  const [flowWarningMessage, setFlowWarningMessage] = useState<string | null>(null);

  const currentMilestones = propMilestones ?? localMilestones;
  const currentReminders = propReminders ?? localReminders;

  // Filter tasks for active project
  const projectTasks = useMemo(() => {
    return tasks.filter((t) => t.projectId === activeProjectId);
  }, [tasks, activeProjectId]);

  // Filter milestones for active project
  const projectMilestones = useMemo(() => {
    return currentMilestones.filter((m) => m.projectId === activeProjectId);
  }, [currentMilestones, activeProjectId]);

  // Overall progress calculations
  const progressStats = useMemo(() => {
    return calculateOverallProjectProgress(projectTasks, projectMilestones);
  }, [projectTasks, projectMilestones]);

  // Update task progress and automatically sync project overall completion
  const handleUpdateTaskProgress = (taskId: string, newProgress: number) => {
    const targetTask = tasks.find((task) => task.id === taskId);
    if (!targetTask) return;

    if (newProgress >= 100 && !targetTask.completed) {
      const flowCheck = validateTaskWorkflowFlow(targetTask, projectTasks);
      if (flowCheck.isBlocked) {
        setFlowWarningMessage(flowCheck.message);
        playNotificationChime('warning');
        setTimeout(() => setFlowWarningMessage(null), 7000);
        return;
      }
    }

    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const isCompleted = newProgress >= 100;
        const updatedTask: ScheduleTask = {
          ...t,
          progress: newProgress,
          completed: isCompleted,
        };
        if (isCompleted) {
          updatedTask.completedAt = getGuatemalaDate();
        } else {
          delete updatedTask.completedAt;
        }
        return updatedTask;
      }
      return t;
    });

    if (onUpdateTasks) {
      onUpdateTasks(updated);
    }

    // Play chimes based on completion
    if (newProgress === 100) {
      playNotificationChime('success');
    }

    // Recalculate and notify project progress
    const newStats = calculateOverallProjectProgress(
      updated.filter((t) => t.projectId === activeProjectId),
      projectMilestones
    );
    if (onUpdateProjectProgress) {
      onUpdateProjectProgress(activeProjectId, newStats.overallGoalPercent);
    }
  };

  // 1-Click Toggle completion
  const handleToggleTaskCompleted = (taskId: string) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask) return;

    const nextCompleted = !targetTask.completed;
    handleUpdateTaskProgress(taskId, nextCompleted ? 100 : 0);
  };

  // Toggle milestone completion
  const handleToggleMilestone = (milestoneId: string) => {
    const updated = currentMilestones.map((m) => {
      if (m.id === milestoneId) {
        const nextCompleted = !m.completed;
        const updatedMilestone: Milestone = {
          ...m,
          completed: nextCompleted,
          progress: nextCompleted ? 100 : 0,
        };
        if (nextCompleted) {
          updatedMilestone.completedAt = getGuatemalaDate();
        } else {
          delete updatedMilestone.completedAt;
        }
        return updatedMilestone;
      }
      return m;
    });

    if (onUpdateMilestones) {
      onUpdateMilestones(updated);
    } else {
      setLocalMilestones(updated);
    }

    playNotificationChime('success');

    // Recalculate
    const newStats = calculateOverallProjectProgress(projectTasks, updated);
    if (onUpdateProjectProgress) {
      onUpdateProjectProgress(activeProjectId, newStats.overallGoalPercent);
    }
  };

  // Add new task
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim()) return;

    const newTask: ScheduleTask = {
      id: `task-${Date.now()}`,
      projectId: activeProjectId,
      name: newTaskName.trim(),
      phase: newTaskPhase,
      startDate: newTaskStart,
      endDate: newTaskEnd,
      progress: 0,
      criticalPath: newTaskCritical,
      predecessors: newTaskPredecessor ? [newTaskPredecessor] : [],
      completed: false,
      assignedTo: newTaskAssigned.trim() || 'Ingeniero Residente',
      weightPercent: Number(newTaskWeight) || 10,
    };

    const updated = [...tasks, newTask];
    if (onUpdateTasks) {
      onUpdateTasks(updated);
    }

    playNotificationChime('reminder');
    setIsNewTaskModalOpen(false);
    setNewTaskName('');
    setNewTaskAssigned('');
  };

  const handleCreateMilestone = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newMilestoneTitle.trim()) return;

    const milestone: Milestone = {
      id: `milestone-${Date.now()}`,
      projectId: activeProjectId,
      title: newMilestoneTitle.trim(),
      phase: newMilestonePhase,
      targetDate: newMilestoneDate,
      completed: false,
      progress: 0,
      weightPercent: Number(newMilestoneWeight) || 10,
      description: newMilestoneDescription.trim(),
      ...(newMilestoneDeliverable.trim() ? { deliverable: newMilestoneDeliverable.trim() } : {}),
    };
    const updated = [...currentMilestones, milestone];
    if (onUpdateMilestones) onUpdateMilestones(updated);
    else setLocalMilestones(updated);

    setIsMilestoneModalOpen(false);
    setNewMilestoneTitle('');
    setNewMilestoneDescription('');
    setNewMilestoneDeliverable('');
  };

  const openReminderModal = (taskId?: string) => {
    setNewReminderTaskId(taskId ?? '');
    setIsReminderModalOpen(true);
  };

  const handleCreateReminder = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newReminderTitle.trim()) return;

    const selectedTask = projectTasks.find((task) => task.id === newReminderTaskId);
    const reminder: TaskReminder = {
      id: `reminder-${Date.now()}`,
      projectId: activeProjectId,
      ...(selectedTask ? { taskId: selectedTask.id } : {}),
      taskName: selectedTask?.name ?? 'Hito general',
      title: newReminderTitle.trim(),
      description: newReminderDescription.trim(),
      targetDate: newReminderDate,
      advanceOption: 'same_day',
      priority: newReminderPriority,
      channel: 'in_app',
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    if (onAddReminder) onAddReminder(reminder);
    else setLocalReminders((current) => [...current, reminder]);

    setIsReminderModalOpen(false);
    setNewReminderTitle('');
    setNewReminderDescription('');
  };

  const handleToggleReminder = (reminderId: string) => {
    if (onToggleReminder) {
      onToggleReminder(reminderId);
      return;
    }
    setLocalReminders((current) =>
      current.map((reminder) =>
        reminder.id === reminderId ? { ...reminder, enabled: !reminder.enabled } : reminder
      )
    );
  };

  const handleDeleteReminder = (reminderId: string) => {
    if (onDeleteReminder) {
      onDeleteReminder(reminderId);
      return;
    }
    setLocalReminders((current) => current.filter((reminder) => reminder.id !== reminderId));
  };

  // Filter tasks based on view filters
  const filteredTasks = useMemo(() => {
    return projectTasks.filter((t) => {
      const matchSearch =
        t.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        t.phase.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (t.assignedTo && t.assignedTo.toLowerCase().includes(searchFilter.toLowerCase()));

      if (!matchSearch) return false;

      if (statusFilter === 'in_progress') return t.progress > 0 && t.progress < 100;
      if (statusFilter === 'completed') return t.completed || t.progress >= 100;
      if (statusFilter === 'critical') return t.criticalPath;
      return true;
    });
  }, [projectTasks, searchFilter, statusFilter]);

  // Phase breakdown for progress cards
  const phaseProgress = useMemo(() => {
    const phases = [
      'Preliminares',
      'Cimentación',
      'Estructura',
      'Mampostería',
      'Instalaciones',
      'Acabados & Entrega',
    ];
    return phases.map((phase) => {
      const phaseTasks = projectTasks.filter((t) =>
        t.phase.toLowerCase().includes(phase.toLowerCase().split(' ')[0])
      );
      if (phaseTasks.length === 0) return { phase, progress: 0, count: 0, completed: 0 };
      const avg = Math.round(
        phaseTasks.reduce((acc, t) => acc + t.progress, 0) / phaseTasks.length
      );
      const completedCount = phaseTasks.filter((t) => t.completed || t.progress >= 100).length;
      return { phase, progress: avg, count: phaseTasks.length, completed: completedCount };
    });
  }, [projectTasks]);

  if (!activeProject) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-8 text-center text-slate-300">
        Selecciona un proyecto para consultar su cronograma.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* FLOW VIOLATION WARNING BANNER */}
      {flowWarningMessage && (
        <div className="animate-in fade-in slide-in-from-top-2 flex items-start justify-between gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/15 p-4 text-rose-200 shadow-lg duration-300">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
            <div>
              <h4 className="font-mono text-xs font-bold tracking-wider text-rose-300 uppercase">
                Alerta de Flujo Constructivo:
              </h4>
              <p className="mt-0.5 text-xs">{flowWarningMessage}</p>
            </div>
          </div>
          <button
            onClick={() => setFlowWarningMessage(null)}
            className="cursor-pointer rounded-lg bg-rose-500/20 px-2 py-1 text-xs font-bold text-rose-300 hover:bg-rose-500/30"
          >
            Entendido
          </button>
        </div>
      )}

      {/* =========================================================================
          HERO PROGRESS HUD: VISUALIZADOR DEL PROGRESO GENERAL HACIA EL OBJETIVO FINAL
          ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl">
        <div className="pointer-events-none absolute -top-16 -right-16 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col items-center justify-between gap-6 lg:flex-row">
          {/* Left Title & Status */}
          <div className="space-y-2 text-center lg:text-left">
            <div className="flex items-center justify-center gap-2 lg:justify-start">
              <span className="rounded-full border border-sky-400/30 bg-sky-400/15 px-3 py-1 font-mono text-[10px] font-bold tracking-widest text-sky-300 uppercase">
                Seguimiento de Progreso & Control de Hitos
              </span>
              <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 font-mono text-xs font-bold text-amber-400">
                {activeProject.code}
              </span>
            </div>

            <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Progreso General hacia el Objetivo Final
            </h2>
            <p className="max-w-xl text-xs text-slate-400 sm:text-sm">
              Monitoreo continuo de avance físico ponderado de la obra para{' '}
              <strong className="text-slate-200">{activeProject.name}</strong>, asegurando el
              cumplimiento de la ruta crítica y entrega llave en mano.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-xs lg:justify-start">
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>
                  <strong>{progressStats.completedTasksCount}</strong> de{' '}
                  {progressStats.totalTasksCount} tareas completadas
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Target className="h-4 w-4 text-amber-400" />
                <span>
                  <strong>{progressStats.completedMilestonesCount}</strong> de{' '}
                  {progressStats.totalMilestonesCount} hitos certificados
                </span>
              </div>
              <div className="flex items-center gap-2 text-rose-300">
                <AlertTriangle className="h-4 w-4 text-rose-400" />
                <span>{progressStats.criticalTasksCount} en ruta crítica</span>
              </div>
            </div>
          </div>

          {/* Center Radial / Big Visual Progress Dial */}
          <div className="flex w-full flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-inner sm:w-80">
            <div className="relative flex h-40 w-40 items-center justify-center">
              {/* SVG Circular Progress Gauge */}
              <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  className="text-slate-800"
                  strokeWidth="10"
                  stroke="currentColor"
                  fill="transparent"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  stroke={
                    progressStats.overallGoalPercent >= 90
                      ? '#10b981'
                      : progressStats.overallGoalPercent >= 50
                        ? '#38bdf8'
                        : '#f59e0b'
                  }
                  strokeWidth="10"
                  strokeDasharray={2 * Math.PI * 50}
                  strokeDashoffset={2 * Math.PI * 50 * (1 - progressStats.overallGoalPercent / 100)}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700 ease-out"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="font-mono text-3xl font-black tracking-tight text-white">
                  {progressStats.overallGoalPercent}%
                </span>
                <span className="font-mono text-[10px] tracking-wider text-slate-400 uppercase">
                  Avance Global
                </span>
              </div>
            </div>

            <div className="mt-3 w-full text-center">
              <span className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-300">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Meta: Entrega Final ({activeProject.endDate || 'Sin fecha configurada'})
              </span>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex w-full shrink-0 flex-col gap-2.5 sm:w-auto">
            <button
              onClick={() => openReminderModal()}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-500/20 px-5 py-3 text-xs font-bold text-amber-300 shadow-lg shadow-amber-500/10 transition hover:bg-amber-500/30"
            >
              <Bell className="h-4 w-4" />
              <span>Configurar Recordatorios ({currentReminders.length})</span>
            </button>

            <button
              onClick={() => setIsNewTaskModalOpen(true)}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-sky-500 px-5 py-3 text-xs font-bold tracking-wider text-slate-950 uppercase shadow-lg shadow-sky-500/20 transition hover:bg-sky-400"
            >
              <Plus className="h-4 w-4" />
              <span>Nueva Actividad</span>
            </button>

            <button
              onClick={() => {
                playNotificationChime('reminder');
              }}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
            >
              <Volume2 className="h-3.5 w-3.5 text-sky-400" />
              <span>Verificar Timbre Sonoro</span>
            </button>
          </div>
        </div>

        {/* Phase mini progress bars */}
        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-6 sm:grid-cols-3 lg:grid-cols-6">
          {phaseProgress.map((pp) => (
            <div
              key={pp.phase}
              className="space-y-1.5 rounded-xl border border-white/5 bg-white/[0.02] p-2.5"
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="truncate font-semibold text-slate-300">{pp.phase}</span>
                <span className="font-mono font-bold text-amber-400">{pp.progress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    pp.progress >= 100
                      ? 'bg-emerald-500'
                      : pp.progress > 0
                        ? 'bg-sky-400'
                        : 'bg-slate-700'
                  }`}
                  style={{ width: `${pp.progress}%` }}
                />
              </div>
              <div className="font-mono text-[10px] text-slate-500">
                {pp.completed}/{pp.count} finalizadas
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* =========================================================================
          VIEW SWITCHER & FILTERS
          ========================================================================= */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-900/60 p-3 backdrop-blur-md sm:flex-row">
        <div className="flex w-full items-center gap-1.5 sm:w-auto">
          <button
            onClick={() => setViewMode('tasks')}
            className={`flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              viewMode === 'tasks'
                ? 'border border-sky-400/40 bg-sky-500/20 text-sky-300 shadow-sm'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>Registro de Avance & Tareas ({projectTasks.length})</span>
          </button>

          <button
            onClick={() => setViewMode('milestones')}
            className={`flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              viewMode === 'milestones'
                ? 'border border-amber-400/40 bg-amber-500/20 text-amber-300 shadow-sm'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Award className="h-4 w-4" />
            <span>Hitos hacia el Objetivo ({projectMilestones.length})</span>
          </button>

          <button
            onClick={() => setViewMode('reminders')}
            className={`flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              viewMode === 'reminders'
                ? 'border border-emerald-400/40 bg-emerald-500/20 text-emerald-300 shadow-sm'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Bell className="h-4 w-4" />
            <span>Recordatorios Configurados</span>
          </button>
        </div>

        {/* Search & Filter */}
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <input
            type="text"
            placeholder="Buscar por tarea, fase o responsable..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-800/80 px-3 py-1.5 text-xs text-white transition outline-none placeholder:text-slate-500 focus:border-sky-400 sm:w-64"
          />

          <div className="flex gap-1">
            <button
              onClick={() => setStatusFilter(statusFilter === 'all' ? 'in_progress' : 'all')}
              className={`cursor-pointer rounded-xl border px-2.5 py-1.5 text-xs font-bold transition ${
                statusFilter === 'in_progress'
                  ? 'border-sky-400/30 bg-sky-500/20 text-sky-300'
                  : 'border-white/5 bg-white/5 text-slate-400 hover:text-white'
              }`}
              title="Filtrar en ejecución"
            >
              En Curso
            </button>
            <button
              onClick={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}
              className={`cursor-pointer rounded-xl border px-2.5 py-1.5 text-xs font-bold transition ${
                statusFilter === 'completed'
                  ? 'border-emerald-400/30 bg-emerald-500/20 text-emerald-300'
                  : 'border-white/5 bg-white/5 text-slate-400 hover:text-white'
              }`}
              title="Filtrar completadas"
            >
              Completadas
            </button>
            <button
              onClick={() => setStatusFilter(statusFilter === 'critical' ? 'all' : 'critical')}
              className={`cursor-pointer rounded-xl border px-2.5 py-1.5 text-xs font-bold transition ${
                statusFilter === 'critical'
                  ? 'border-rose-500/30 bg-rose-500/20 text-rose-300'
                  : 'border-white/5 bg-white/5 text-slate-400 hover:text-white'
              }`}
              title="Filtrar ruta crítica"
            >
              Ruta Crítica
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          VIEW 1: TASK LIST & INTERACTIVE PROGRESS CONTROLS
          ========================================================================= */}
      {viewMode === 'tasks' && (
        <div className="overflow-hidden rounded-3xl border border-white/15 bg-slate-900/80 shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/60 p-4">
            <span className="font-mono text-xs font-bold tracking-wider text-slate-400 uppercase">
              Listado de Actividades Programadas - Registra el Avance en Tiempo Real
            </span>
            <span className="text-xs text-slate-500">
              {filteredTasks.length} de {projectTasks.length} tareas
            </span>
          </div>

          <div className="divide-y divide-white/5">
            {filteredTasks.length === 0 && (
              <p className="p-8 text-center text-sm text-slate-400">
                No hay tareas para mostrar. Ajusta los filtros o crea la primera actividad.
              </p>
            )}
            {filteredTasks.map((t) => {
              const isCompleted = t.completed || t.progress >= 100;
              const flowCheck = validateTaskWorkflowFlow(t, projectTasks);

              return (
                <div
                  key={t.id}
                  className={`flex flex-col items-start justify-between gap-5 p-5 transition-all hover:bg-white/[0.02] xl:flex-row xl:items-center ${
                    isCompleted ? 'bg-emerald-950/10' : ''
                  }`}
                >
                  {/* Left: Task Details */}
                  <div className="min-w-[280px] flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-sky-500/30 bg-sky-500/15 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-sky-300 uppercase">
                        {t.phase}
                      </span>

                      {t.criticalPath && (
                        <span className="rounded-full border border-rose-500/30 bg-rose-500/15 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-rose-300 uppercase">
                          Ruta Crítica
                        </span>
                      )}

                      {t.weightPercent && (
                        <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-amber-300">
                          Ponderación: {t.weightPercent}%
                        </span>
                      )}

                      {flowCheck.isBlocked && !isCompleted && (
                        <span className="flex items-center gap-1 rounded border border-amber-400/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                          <AlertTriangle className="h-3 w-3 text-amber-400" />
                          Predecesora Requerida
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Checkbox trigger button */}
                      <button
                        onClick={() => handleToggleTaskCompleted(t.id)}
                        className={`flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-lg border transition ${
                          isCompleted
                            ? 'border-emerald-400 bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                            : 'border-white/20 bg-slate-800 text-transparent hover:border-sky-400'
                        }`}
                        title={
                          isCompleted ? 'Marcar como pendiente' : 'Marcar como completada al 100%'
                        }
                      >
                        <CheckCircle2 className="h-4 w-4 fill-current stroke-slate-950" />
                      </button>

                      <h4
                        className={`text-sm font-bold tracking-tight transition ${
                          isCompleted ? 'text-slate-400 line-through' : 'text-white'
                        }`}
                      >
                        {t.name}
                      </h4>
                    </div>

                    {t.notes && <p className="line-clamp-1 text-xs text-slate-400">{t.notes}</p>}

                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-500" />
                        {t.startDate} al {t.endDate}
                      </span>
                      {t.assignedTo && (
                        <span className="text-slate-300">
                          Responsable: <strong className="text-white">{t.assignedTo}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Interactive Slider & Quick Progress Buttons */}
                  <div className="flex w-full shrink-0 flex-col items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-3 sm:flex-row xl:w-auto">
                    {/* Slider & Numeric Percent */}
                    <div className="w-full space-y-1.5 sm:w-56">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-slate-400">Avance:</span>
                        <div className="flex items-center gap-1 font-mono">
                          <span
                            className={`text-sm font-black ${
                              isCompleted
                                ? 'text-emerald-400'
                                : t.progress > 0
                                  ? 'text-sky-400'
                                  : 'text-slate-400'
                            }`}
                          >
                            {t.progress}%
                          </span>
                        </div>
                      </div>

                      <div className="relative flex items-center">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={t.progress}
                          onChange={(e) => handleUpdateTaskProgress(t.id, Number(e.target.value))}
                          className="h-2 w-full cursor-pointer rounded-full bg-slate-800 accent-sky-400"
                        />
                      </div>

                      {/* Micro-Adjustment Buttons */}
                      <div className="flex items-center justify-between gap-1 pt-0.5">
                        <button
                          onClick={() =>
                            handleUpdateTaskProgress(t.id, Math.max(0, t.progress - 10))
                          }
                          className="cursor-pointer rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400 transition hover:bg-white/10"
                        >
                          -10%
                        </button>
                        <button
                          onClick={() =>
                            handleUpdateTaskProgress(t.id, Math.min(100, t.progress + 10))
                          }
                          className="cursor-pointer rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-bold text-slate-300 transition hover:bg-white/10"
                        >
                          +10%
                        </button>
                        <button
                          onClick={() =>
                            handleUpdateTaskProgress(t.id, Math.min(100, t.progress + 25))
                          }
                          className="cursor-pointer rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-bold text-sky-300 transition hover:bg-white/10"
                        >
                          +25%
                        </button>
                        <button
                          onClick={() => handleUpdateTaskProgress(t.id, 100)}
                          className="cursor-pointer rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 transition hover:bg-emerald-500/30"
                        >
                          100%
                        </button>
                      </div>
                    </div>

                    {/* Action buttons: Mark completed & Add Reminder */}
                    <div className="flex w-full gap-2 sm:w-auto sm:flex-col">
                      <button
                        onClick={() => handleToggleTaskCompleted(t.id)}
                        className={`flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                          isCompleted
                            ? 'border border-emerald-400/30 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                            : 'border border-white/10 bg-white/5 text-slate-200 hover:bg-sky-500/20 hover:text-sky-300'
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{isCompleted ? 'Completada' : 'Finalizar'}</span>
                      </button>

                      <button
                        onClick={() => openReminderModal(t.id)}
                        className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20"
                        title="Programar recordatorio para esta tarea"
                      >
                        <Bell className="h-3.5 w-3.5" />
                        <span>Recordatorio</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: MILESTONES ROADMAP TOWARDS FINAL GOAL
          ========================================================================= */}
      {viewMode === 'milestones' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
            <div className="flex items-center gap-3">
              <Award className="h-6 w-6 text-amber-400" />
              <div>
                <h3 className="text-sm font-bold text-white">
                  Secuencia de Hitos Críticos para Entrega de Obra
                </h3>
                <p className="text-xs text-slate-400">
                  Cada hito representa una entrega técnica auditada y aporta al porcentaje de
                  entrega final.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full border border-amber-400/30 bg-amber-500/20 px-3 py-1 font-mono text-xs font-bold text-amber-300">
                {progressStats.completedMilestonesCount} / {progressStats.totalMilestonesCount}{' '}
                Cumplidos
              </span>
              <button
                type="button"
                onClick={() => setIsMilestoneModalOpen(true)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-400"
              >
                <Plus className="h-3.5 w-3.5" />
                Nuevo hito
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {projectMilestones.length === 0 && (
              <p className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-400 md:col-span-2">
                Aún no hay hitos para este proyecto. Crea el primero para medir el avance global.
              </p>
            )}
            {projectMilestones.map((m, index) => {
              const isDone = m.completed || m.progress >= 100;
              return (
                <div
                  key={m.id}
                  className={`flex flex-col justify-between rounded-3xl border p-5 transition-all ${
                    isDone
                      ? 'border-emerald-500/30 bg-emerald-950/20 shadow-lg shadow-emerald-950/20'
                      : m.progress > 0
                        ? 'border-sky-400/30 bg-sky-950/20 shadow-lg shadow-sky-950/20'
                        : 'border-white/10 bg-slate-900/80'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300 uppercase">
                        Paso {index + 1} • {m.phase}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-400">
                        Aporte: {m.weightPercent}%
                      </span>
                    </div>

                    <h4 className="text-base font-bold tracking-tight text-white">{m.title}</h4>
                    <p className="text-xs text-slate-300">{m.description}</p>

                    {m.deliverable && (
                      <div className="rounded-xl border border-white/5 bg-white/[0.03] p-2.5 text-xs text-slate-400">
                        <span className="font-semibold text-slate-200">Entregable Requerido:</span>{' '}
                        {m.deliverable}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                    <div className="space-y-1">
                      <span className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
                        <Calendar className="h-3.5 w-3.5 text-slate-500" />
                        Meta: {m.targetDate}
                      </span>
                      {m.completedAt && (
                        <span className="font-mono text-[10px] text-emerald-400">
                          Certificado el {m.completedAt}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleMilestone(m.id)}
                        className={`flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                          isDone
                            ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{isDone ? 'Certificado' : 'Marcar Cumplido'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 3: CONFIGURED REMINDERS SUMMARY TAB
          ========================================================================= */}
      {viewMode === 'reminders' && (
        <div className="space-y-4 rounded-3xl border border-white/15 bg-slate-900/80 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold tracking-tight text-white">
                Recordatorios Activos & Notificaciones Programadas
              </h3>
              <p className="text-xs text-slate-400">
                Avisos personalizados para tareas críticas e hitos importantes de la obra.
              </p>
            </div>

            <button
              onClick={() => openReminderModal()}
              className="flex cursor-pointer items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-400"
            >
              <Plus className="h-4 w-4" />
              <span>Nuevo Recordatorio</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 pt-2 md:grid-cols-2">
            {currentReminders.length === 0 && (
              <p className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-400 md:col-span-2">
                No hay recordatorios configurados para este proyecto.
              </p>
            )}
            {currentReminders.map((rem) => (
              <div
                key={rem.id}
                className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                      rem.priority === 'Alta'
                        ? 'border-rose-500/30 bg-rose-500/15 text-rose-300'
                        : 'border-amber-500/30 bg-amber-500/15 text-amber-300'
                    }`}
                  >
                    {rem.priority} Prioridad
                  </span>
                  <span className="font-mono text-xs text-slate-400">{rem.targetDate}</span>
                </div>

                <h4 className="text-sm font-bold text-white">{rem.title}</h4>
                <p className="text-xs text-slate-400">{rem.description}</p>

                <div className="flex items-center justify-between border-t border-white/5 pt-2 text-[11px] text-slate-500">
                  <span>{rem.taskName}</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleReminder(rem.id)}
                      className={`cursor-pointer font-semibold ${rem.enabled ? 'text-emerald-400' : 'text-slate-500'}`}
                    >
                      {rem.enabled ? 'Activado' : 'Pausado'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        playNotificationChime(rem.priority === 'Alta' ? 'urgent' : 'reminder')
                      }
                      className="flex cursor-pointer items-center gap-1 font-semibold text-sky-400 hover:text-sky-300"
                    >
                      <Volume2 className="h-3.5 w-3.5" /> Probar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteReminder(rem.id)}
                      aria-label={`Eliminar recordatorio ${rem.title}`}
                      className="cursor-pointer text-rose-400 hover:text-rose-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isMilestoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
          <form
            onSubmit={handleCreateMilestone}
            className="w-full max-w-lg space-y-4 rounded-3xl border border-white/15 bg-slate-900 p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">Crear hito del proyecto</h3>
              <button
                type="button"
                onClick={() => setIsMilestoneModalOpen(false)}
                aria-label="Cerrar"
                className="cursor-pointer text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <label className="block text-xs font-semibold text-slate-300">
              Nombre del hito
              <input
                required
                value={newMilestoneTitle}
                onChange={(event) => setNewMilestoneTitle(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/15 bg-slate-800 px-3 py-2 text-sm text-white"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-semibold text-slate-300">
                Fase
                <select
                  value={newMilestonePhase}
                  onChange={(event) => setNewMilestonePhase(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-slate-800 px-3 py-2 text-xs text-white"
                >
                  <option>Preliminares</option>
                  <option>Cimentación</option>
                  <option>Estructura</option>
                  <option>Mampostería</option>
                  <option>Instalaciones</option>
                  <option>Acabados & Entrega</option>
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-300">
                Fecha objetivo
                <input
                  type="date"
                  required
                  value={newMilestoneDate}
                  onChange={(event) => setNewMilestoneDate(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-slate-800 px-3 py-2 text-xs text-white"
                />
              </label>
            </div>
            <label className="block text-xs font-semibold text-slate-300">
              Ponderación del avance (%)
              <input
                type="number"
                min="1"
                max="100"
                required
                value={newMilestoneWeight}
                onChange={(event) => setNewMilestoneWeight(Number(event.target.value))}
                className="mt-1 w-full rounded-xl border border-white/15 bg-slate-800 px-3 py-2 text-xs text-white"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-300">
              Descripción
              <textarea
                value={newMilestoneDescription}
                onChange={(event) => setNewMilestoneDescription(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/15 bg-slate-800 px-3 py-2 text-sm text-white"
                rows={2}
              />
            </label>
            <label className="block text-xs font-semibold text-slate-300">
              Entregable (opcional)
              <input
                value={newMilestoneDeliverable}
                onChange={(event) => setNewMilestoneDeliverable(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/15 bg-slate-800 px-3 py-2 text-sm text-white"
              />
            </label>
            <div className="flex justify-end gap-2 border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={() => setIsMilestoneModalOpen(false)}
                className="cursor-pointer rounded-xl bg-white/5 px-4 py-2 text-xs font-bold text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="cursor-pointer rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-slate-950"
              >
                Crear hito
              </button>
            </div>
          </form>
        </div>
      )}

      {isReminderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
          <form
            onSubmit={handleCreateReminder}
            className="w-full max-w-lg space-y-4 rounded-3xl border border-white/15 bg-slate-900 p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">Programar recordatorio</h3>
              <button
                type="button"
                onClick={() => setIsReminderModalOpen(false)}
                aria-label="Cerrar"
                className="cursor-pointer text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <label className="block text-xs font-semibold text-slate-300">
              Título
              <input
                required
                value={newReminderTitle}
                onChange={(event) => setNewReminderTitle(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/15 bg-slate-800 px-3 py-2 text-sm text-white"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-semibold text-slate-300">
                Asociar a tarea
                <select
                  value={newReminderTaskId}
                  onChange={(event) => setNewReminderTaskId(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-slate-800 px-3 py-2 text-xs text-white"
                >
                  <option value="">Hito general</option>
                  {projectTasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-300">
                Fecha
                <input
                  type="date"
                  required
                  value={newReminderDate}
                  onChange={(event) => setNewReminderDate(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-slate-800 px-3 py-2 text-xs text-white"
                />
              </label>
            </div>
            <label className="block text-xs font-semibold text-slate-300">
              Prioridad
              <select
                value={newReminderPriority}
                onChange={(event) =>
                  setNewReminderPriority(event.target.value as TaskReminder['priority'])
                }
                className="mt-1 w-full rounded-xl border border-white/15 bg-slate-800 px-3 py-2 text-xs text-white"
              >
                <option value="Alta">Alta</option>
                <option value="Media">Media</option>
                <option value="Baja">Baja</option>
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-300">
              Descripción
              <textarea
                value={newReminderDescription}
                onChange={(event) => setNewReminderDescription(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/15 bg-slate-800 px-3 py-2 text-sm text-white"
                rows={3}
              />
            </label>
            <div className="flex justify-end gap-2 border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={() => setIsReminderModalOpen(false)}
                className="cursor-pointer rounded-xl bg-white/5 px-4 py-2 text-xs font-bold text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="cursor-pointer rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-slate-950"
              >
                Guardar recordatorio
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          MODAL: CREAR NUEVA ACTIVIDAD DE CRONOGRAMA
          ========================================================================= */}
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg space-y-4 rounded-3xl border border-white/15 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="flex items-center gap-2 text-base font-bold text-white">
                <Plus className="h-5 w-5 text-sky-400" />
                <span>Agregar Nueva Tarea al Cronograma</span>
              </h3>
              <button
                onClick={() => setIsNewTaskModalOpen(false)}
                className="cursor-pointer rounded-lg p-1 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">
                  Nombre de la Actividad:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Fundición de losa de entrepiso nivel 3"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-slate-800 px-3 py-2 text-xs text-white outline-none focus:border-sky-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">
                    Fase Constructiva:
                  </label>
                  <select
                    value={newTaskPhase}
                    onChange={(e) => setNewTaskPhase(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-slate-800 px-3 py-2 text-xs text-white outline-none focus:border-sky-400"
                  >
                    <option value="Preliminares">Preliminares</option>
                    <option value="Cimentación">Cimentación</option>
                    <option value="Estructura">Estructura</option>
                    <option value="Mampostería">Mampostería</option>
                    <option value="Instalaciones">Instalaciones</option>
                    <option value="Acabados & Entrega">Acabados & Entrega</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">
                    Ponderación en Meta (%):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={newTaskWeight}
                    onChange={(e) => setNewTaskWeight(Number(e.target.value))}
                    className="w-full rounded-xl border border-white/15 bg-slate-800 px-3 py-2 font-mono text-xs text-white outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">
                    Fecha de Inicio:
                  </label>
                  <input
                    type="date"
                    required
                    value={newTaskStart}
                    onChange={(e) => setNewTaskStart(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-slate-800 px-3 py-2 font-mono text-xs text-white outline-none focus:border-sky-400"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">
                    Fecha de Finalización:
                  </label>
                  <input
                    type="date"
                    required
                    min={newTaskStart}
                    value={newTaskEnd}
                    onChange={(e) => setNewTaskEnd(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-slate-800 px-3 py-2 font-mono text-xs text-white outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">
                  Responsable Asignado:
                </label>
                <input
                  type="text"
                  placeholder="Ej. Don Mario Cifuentes / Cuadrilla Armadores"
                  value={newTaskAssigned}
                  onChange={(e) => setNewTaskAssigned(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-slate-800 px-3 py-2 text-xs text-white outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">
                  Tarea Predecesora (Control de Flujo):
                </label>
                <select
                  value={newTaskPredecessor}
                  onChange={(e) => setNewTaskPredecessor(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-slate-800 px-3 py-2 text-xs text-white outline-none focus:border-sky-400"
                >
                  <option value="">Ninguna (Fase independiente)</option>
                  {projectTasks.map((pt) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.name} ({pt.progress}%)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="critPath"
                  checked={newTaskCritical}
                  onChange={(e) => setNewTaskCritical(e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-white/20 bg-slate-800 text-rose-500"
                />
                <label htmlFor="critPath" className="cursor-pointer text-xs text-slate-200">
                  Pertenece a la Ruta Crítica (Cualquier atraso impacta la entrega final)
                </label>
              </div>

              <div className="flex justify-end gap-2 border-t border-white/10 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewTaskModalOpen(false)}
                  className="cursor-pointer rounded-xl bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="cursor-pointer rounded-xl bg-sky-500 px-5 py-2 text-xs font-bold tracking-wider text-slate-950 uppercase shadow-lg transition hover:bg-sky-400"
                >
                  Crear Actividad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
