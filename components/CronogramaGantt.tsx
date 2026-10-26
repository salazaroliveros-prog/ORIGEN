'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Target,
  Layers,
  Building2,
  TrendingUp,
  Sliders,
  Filter,
  Search,
  ChevronRight,
  Sparkles,
  Printer,
  ShieldAlert,
  ArrowRight,
  Flame,
  Award,
  CalendarDays,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';
import * as d3 from 'd3';
import { Project, ScheduleTask, Milestone, CompanySettings } from '@/lib/types';
import { formatGTQ } from '@/lib/data';
import { Card } from '@/components/ui/Card';

interface CronogramaGanttProps {
  projects: Project[];
  tasks?: ScheduleTask[];
  milestones?: Milestone[];
  activeProjectId?: string;
  company?: CompanySettings;
  onUpdateTaskProgress?: (taskId: string, newProgress: number) => void;
}

export function CronogramaGantt({
  projects = [],
  tasks = [],
  milestones = [],
  activeProjectId: initialActiveProjectId,
  company,
  onUpdateTaskProgress,
}: CronogramaGanttProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialActiveProjectId || projects[0]?.id || ''
  );
  const [phaseFilter, setPhaseFilter] = useState<string>('all');
  const [onlyCriticalPath, setOnlyCriticalPath] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeView, setActiveView] = useState<'gantt' | 'curva_s' | 'matriz'>('gantt');

  // Selected project object
  const currentProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId) || projects[0] || null;
  }, [projects, selectedProjectId]);

  // Tasks belonging to this project
  const projectTasks = useMemo(() => {
    return currentProject ? tasks.filter((t) => t.projectId === currentProject.id) : [];
  }, [tasks, currentProject]);

  // Milestones belonging to this project
  const projectMilestones = useMemo(() => {
    return currentProject ? milestones.filter((m) => m.projectId === currentProject.id) : [];
  }, [milestones, currentProject]);

  const scheduleRange = useMemo(() => {
    const validDates = (values: string[]) =>
      values.map((value) => new Date(value)).filter((date) => Number.isFinite(date.getTime()));
    const taskStarts = validDates(projectTasks.map((task) => task.startDate));
    const taskEnds = validDates(projectTasks.map((task) => task.endDate));
    const projectStart = currentProject?.startDate ? new Date(currentProject.startDate) : null;
    const projectEnd = currentProject?.endDate ? new Date(currentProject.endDate) : null;
    const startDate =
      projectStart && Number.isFinite(projectStart.getTime())
        ? projectStart
        : taskStarts.length > 0
          ? new Date(Math.min(...taskStarts.map((date) => date.getTime())))
          : null;
    const endDate =
      projectEnd && Number.isFinite(projectEnd.getTime())
        ? projectEnd
        : taskEnds.length > 0
          ? new Date(Math.max(...taskEnds.map((date) => date.getTime())))
          : null;

    return startDate && endDate && startDate <= endDate ? { startDate, endDate } : null;
  }, [currentProject, projectTasks]);

  // Phases in this project
  const uniquePhases = useMemo(() => {
    const set = new Set<string>();
    projectTasks.forEach((t) => set.add(t.phase));
    return Array.from(set);
  }, [projectTasks]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return projectTasks.filter((t) => {
      if (onlyCriticalPath && !t.criticalPath) return false;
      if (phaseFilter !== 'all' && t.phase !== phaseFilter) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          t.phase.toLowerCase().includes(q) ||
          (t.assignedTo && t.assignedTo.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [projectTasks, onlyCriticalPath, phaseFilter, searchQuery]);

  // Compute Planned Progress vs Real Progress for each task
  const enrichedTasks = useMemo(() => {
    const todayMs = Date.now();

    return filteredTasks.map((t) => {
      const startMs = new Date(t.startDate).getTime();
      const endMs = new Date(t.endDate).getTime();
      const totalDurationDays = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)));

      // Theoretical planned progress to date
      let plannedPercent = 0;
      if (todayMs >= endMs) {
        plannedPercent = 100;
      } else if (todayMs <= startMs) {
        plannedPercent = 0;
      } else {
        const elapsedDays = Math.round((todayMs - startMs) / (1000 * 60 * 60 * 24));
        plannedPercent = Math.min(
          100,
          Math.max(0, Math.round((elapsedDays / totalDurationDays) * 100))
        );
      }

      const realPercent = t.progress;
      const variance = realPercent - plannedPercent; // positive = ahead, negative = behind

      let status: 'adelantado' | 'al_dia' | 'retraso_leve' | 'retraso_critico' = 'al_dia';
      if (variance >= 5) {
        status = 'adelantado';
      } else if (variance >= -5) {
        status = 'al_dia';
      } else if (variance >= -15) {
        status = 'retraso_leve';
      } else {
        status = 'retraso_critico';
      }

      return {
        ...t,
        durationDays: totalDurationDays,
        plannedPercent,
        realPercent,
        variance,
        status,
        startDateObj: new Date(t.startDate),
        endDateObj: new Date(t.endDate),
      };
    });
  }, [filteredTasks]);

  // Overall schedule stats
  const stats = useMemo(() => {
    if (enrichedTasks.length === 0) {
      return {
        avgPlanned: 0,
        avgReal: 0,
        varianceGap: 0,
        criticalTasks: 0,
        delayedTasks: 0,
        totalMilestones: projectMilestones.length,
        completedMilestones: projectMilestones.filter((m) => m.completed).length,
      };
    }

    const totalWeight = enrichedTasks.reduce((sum, t) => sum + (t.weightPercent || 10), 0);
    const weightedPlanned = Math.round(
      enrichedTasks.reduce((sum, t) => sum + t.plannedPercent * (t.weightPercent || 10), 0) /
        (totalWeight || 1)
    );
    const weightedReal = Math.round(
      enrichedTasks.reduce((sum, t) => sum + t.realPercent * (t.weightPercent || 10), 0) /
        (totalWeight || 1)
    );

    const delayed = enrichedTasks.filter(
      (t) => t.status === 'retraso_leve' || t.status === 'retraso_critico'
    ).length;
    const critical = enrichedTasks.filter((t) => t.criticalPath).length;

    return {
      avgPlanned: weightedPlanned,
      avgReal: weightedReal,
      varianceGap: weightedReal - weightedPlanned,
      criticalTasks: critical,
      delayedTasks: delayed,
      totalMilestones: projectMilestones.length,
      completedMilestones: projectMilestones.filter((m) => m.completed).length,
    };
  }, [enrichedTasks, projectMilestones]);

  // S-Curve monthly timeline data
  const sCurveData = useMemo(() => {
    if (!scheduleRange) return [];
    const { startDate: projStart, endDate: projEnd } = scheduleRange;
    const today = new Date();
    const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const totalTaskWeight = projectTasks.reduce((sum, task) => sum + (task.weightPercent || 10), 0);
    const currentProgress =
      totalTaskWeight > 0
        ? Math.round(
            projectTasks.reduce(
              (sum, task) => sum + task.progress * (task.weightPercent || 10),
              0
            ) / totalTaskWeight
          )
        : null;

    const months: {
      monthKey: string;
      label: string;
      date: Date;
      avancePlanificado: number;
      avanceReal: number | null;
    }[] = [];

    const cursor = new Date(projStart.getFullYear(), projStart.getMonth(), 1);
    const endLimit = new Date(projEnd.getFullYear(), projEnd.getMonth() + 1, 1);

    const monthNames = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];

    while (cursor <= endLimit) {
      const year = cursor.getFullYear();
      const monthIdx = cursor.getMonth();
      const monthKey = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
      const label = `${monthNames[monthIdx]} ${year}`;
      const monthMidDate = new Date(year, monthIdx, 15);

      // S-curve cumulative planned calculation across tasks
      let monthlyPlannedSum = 0;
      let totalWeight = 0;

      projectTasks.forEach((t) => {
        const w = t.weightPercent || 10;
        totalWeight += w;
        const s = new Date(t.startDate).getTime();
        const e = new Date(t.endDate).getTime();
        const m = monthMidDate.getTime();

        if (m >= e) {
          monthlyPlannedSum += 100 * w;
        } else if (m <= s) {
          monthlyPlannedSum += 0;
        } else {
          monthlyPlannedSum += ((m - s) / (e - s)) * 100 * w;
        }
      });

      const cumPlanned = totalWeight > 0 ? Math.round(monthlyPlannedSum / totalWeight) : 0;

      months.push({
        monthKey,
        label,
        date: new Date(cursor),
        avancePlanificado: cumPlanned,
        avanceReal: monthKey === currentMonthKey ? currentProgress : null,
      });

      cursor.setMonth(cursor.getMonth() + 1);
    }

    return months;
  }, [scheduleRange, projectTasks]);

  // D3 Scales for Interactive Gantt Canvas
  const ganttConfig = useMemo(() => {
    if (!scheduleRange) return null;
    const { startDate: projStart, endDate: projEnd } = scheduleRange;
    const today = new Date();

    // Add 10 days padding on each side
    const minDate = new Date(projStart.getTime() - 10 * 24 * 60 * 60 * 1000);
    const maxDate = new Date(projEnd.getTime() + 15 * 24 * 60 * 60 * 1000);

    const timeScale = d3.scaleTime().domain([minDate, maxDate]).range([0, 920]);

    // Generate monthly ticks
    const monthlyInterval = d3.timeMonth.every(1);
    const ticks = monthlyInterval ? timeScale.ticks(monthlyInterval) : timeScale.ticks(12);

    return {
      timeScale,
      minDate,
      maxDate,
      ticks,
      width: 920,
      todayX: timeScale(today),
    };
  }, [scheduleRange]);

  if (!currentProject) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-8 text-center text-slate-300">
        No hay proyectos disponibles para mostrar en el cronograma.
      </div>
    );
  }

  if (!ganttConfig) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-8 text-center text-slate-300">
        Registra fechas de inicio y fin del proyecto o de sus tareas para mostrar el cronograma.
      </div>
    );
  }

  return (
    <div className="responsive-container safe-area-top safe-area-bottom min-h-full space-y-6">
      {/* Header and Project Switcher */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl lg:flex-row lg:items-center">
        <div className="flex items-center gap-3">
          <span className="rounded-2xl border border-sky-500/30 bg-sky-500/15 p-3 text-sky-400">
            <CalendarDays className="h-6 w-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-white">
                Cronograma Gantt & Ruta Crítica de Obra
              </h1>
              <span className="rounded-md border border-sky-400/30 bg-sky-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-300">
                D3 + Recharts
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              Control temporal de fases de construcción, hitos críticos, fechas de inicio/fin y
              desvío de avance real vs planificado.
            </p>
          </div>
        </div>

        {/* Project Selector & View Toggles */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Project Dropdown */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 font-bold text-slate-200">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="cursor-pointer bg-transparent font-bold text-slate-200 focus:outline-none"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-800 text-white">
                  {p.code ? `${p.code} - ${p.name.substring(0, 24)}...` : p.name}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Buttons */}
          <div className="flex items-center rounded-xl border border-slate-700 bg-slate-800 p-0.5 font-bold">
            <button
              onClick={() => setActiveView('gantt')}
              className={`rounded-lg px-3 py-1.5 transition ${
                activeView === 'gantt'
                  ? 'bg-sky-500 font-black text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Gantt Temporal
            </button>
            <button
              onClick={() => setActiveView('curva_s')}
              className={`rounded-lg px-3 py-1.5 transition ${
                activeView === 'curva_s'
                  ? 'bg-sky-500 font-black text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Curva S (Plan vs Real)
            </button>
            <button
              onClick={() => setActiveView('matriz')}
              className={`rounded-lg px-3 py-1.5 transition ${
                activeView === 'matriz'
                  ? 'bg-sky-500 font-black text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Matriz de Tareas
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards: Schedule Performance Index */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card variant="elevated" padding="md" className="border-slate-800 bg-slate-900/80">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Avance Planificado
            </p>
            <span className="rounded-lg bg-sky-500/10 p-1.5 text-sky-400">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-1 font-mono text-2xl font-black text-sky-400">{stats.avgPlanned}%</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Meta programada a la fecha de hoy</p>
        </Card>

        <Card variant="elevated" padding="md" className="border-slate-800 bg-slate-900/80">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Avance Físico Real
            </p>
            <span className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-1 font-mono text-2xl font-black text-emerald-400">{stats.avgReal}%</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Ejecución ponderada en obra</p>
        </Card>

        <Card
          variant="elevated"
          padding="md"
          className={`border ${
            stats.varianceGap < -5
              ? 'border-rose-800/80 bg-rose-950/20'
              : stats.varianceGap >= 0
                ? 'border-emerald-800/80 bg-emerald-950/20'
                : 'border-slate-800 bg-slate-900/80'
          }`}
        >
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Desvío de Cronograma
            </p>
            <span
              className={`rounded-lg p-1.5 ${stats.varianceGap < 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}
            >
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <p
            className={`mt-1 font-mono text-2xl font-black ${stats.varianceGap < 0 ? 'text-rose-400' : 'text-emerald-400'}`}
          >
            {stats.varianceGap > 0 ? '+' : ''}
            {stats.varianceGap}%
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {stats.varianceGap < -5
              ? `${stats.delayedTasks} actividades con retraso`
              : 'Ritmo de obra en tolerancia'}
          </p>
        </Card>

        <Card variant="elevated" padding="md" className="border-slate-800 bg-slate-900/80">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Hitos Críticos
            </p>
            <span className="rounded-lg bg-amber-500/10 p-1.5 text-amber-400">
              <Award className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-1 font-mono text-2xl font-black text-amber-400">
            {stats.completedMilestones} / {stats.totalMilestones}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {stats.criticalTasks} tareas en ruta crítica
          </p>
        </Card>
      </div>

      {/* VIEW 1: D3 INTERACTIVE GANTT TIMELINE */}
      {activeView === 'gantt' && (
        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
          {/* Filter and Search Bar */}
          <div className="flex flex-col items-start justify-between gap-3 border-b border-slate-800 pb-3 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute top-2.5 left-3 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar tarea o fase..."
                  className="rounded-xl border border-slate-700 bg-slate-800 py-1.5 pr-3 pl-8 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              {/* Phase Filter */}
              <select
                value={phaseFilter}
                onChange={(e) => setPhaseFilter(e.target.value)}
                className="cursor-pointer rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 focus:outline-none"
              >
                <option value="all">Todas las Fases ({uniquePhases.length})</option>
                {uniquePhases.map((phase) => (
                  <option key={phase} value={phase}>
                    {phase}
                  </option>
                ))}
              </select>

              {/* Critical Path Toggle */}
              <button
                onClick={() => setOnlyCriticalPath(!onlyCriticalPath)}
                className={`flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  onlyCriticalPath
                    ? 'border border-rose-500/40 bg-rose-500/20 text-rose-300'
                    : 'border border-slate-700 bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Flame className="h-3.5 w-3.5 text-rose-400" />
                Solo Ruta Crítica
              </button>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-3 rounded border border-slate-500 bg-slate-700" />{' '}
                Planificado
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-3 rounded bg-emerald-500" /> Real Ejecutado
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-3 rounded bg-rose-500" /> Retraso Crítico
              </span>
              <span className="flex items-center gap-1.5 text-amber-300">
                <span className="inline-block h-2.5 w-2.5 rotate-45 bg-amber-400" /> Hito Crítico
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="inline-block h-3 w-0.5 bg-rose-500" /> Hoy (24/10/2026)
              </span>
            </div>
          </div>

          {/* Gantt SVG + Table Split View */}
          <div className="overflow-x-auto">
            <div className="min-w-[1050px]">
              {/* Header Time Axis */}
              <div className="grid grid-cols-[280px_1fr] border-b border-slate-800 pb-2">
                <div className="pl-2 text-xs font-extrabold tracking-wider text-slate-400 uppercase">
                  Fase & Actividad de Construcción
                </div>
                <div className="relative h-7 font-mono text-[10px] text-slate-400">
                  {ganttConfig.ticks.map((tick, idx) => {
                    const x = ganttConfig.timeScale(tick);
                    const monthLabel = d3.timeFormat('%b %y')(tick);
                    return (
                      <div
                        key={idx}
                        className="absolute top-0 border-l border-slate-800 pl-1"
                        style={{ left: `${x}px` }}
                      >
                        <span className="font-bold text-slate-300">{monthLabel}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tasks Rows */}
              <div className="divide-y divide-slate-800/60 font-sans">
                {enrichedTasks.map((t) => {
                  const xStart = ganttConfig.timeScale(t.startDateObj);
                  const xEnd = ganttConfig.timeScale(t.endDateObj);
                  const barWidth = Math.max(8, xEnd - xStart);
                  const realBarWidth = (barWidth * t.realPercent) / 100;
                  const plannedIndicatorX = (barWidth * t.plannedPercent) / 100;

                  return (
                    <div
                      key={t.id}
                      className="grid grid-cols-[280px_1fr] items-center py-3 transition hover:bg-slate-800/40"
                    >
                      {/* Left Task Metadata */}
                      <div className="space-y-0.5 pr-4 pl-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="py-0.2 rounded border border-amber-800/60 bg-amber-950/60 px-1.5 font-mono text-[10px] font-bold text-amber-400">
                            {t.phase}
                          </span>
                          {t.criticalPath && (
                            <span className="py-0.2 rounded border border-rose-800 bg-rose-950/80 px-1 text-[9px] font-extrabold text-rose-300">
                              Ruta Crítica
                            </span>
                          )}
                        </div>
                        <h4 className="truncate text-xs font-bold text-white" title={t.name}>
                          {t.name}
                        </h4>
                        <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                          <span>
                            {t.startDate} al {t.endDate} ({t.durationDays}d)
                          </span>
                          <span
                            className={`font-bold ${
                              t.status === 'retraso_critico'
                                ? 'text-rose-400'
                                : t.status === 'retraso_leve'
                                  ? 'text-amber-400'
                                  : 'text-emerald-400'
                            }`}
                          >
                            Real: {t.realPercent}% | Plan: {t.plannedPercent}%
                          </span>
                        </div>
                      </div>

                      {/* Right Timeline Canvas */}
                      <div className="relative flex h-9 items-center overflow-hidden rounded-xl border border-slate-800/50 bg-slate-950/40">
                        {/* Month Grid Lines */}
                        {ganttConfig.ticks.map((tick, idx) => {
                          const x = ganttConfig.timeScale(tick);
                          return (
                            <div
                              key={idx}
                              className="absolute top-0 bottom-0 border-l border-slate-800/40"
                              style={{ left: `${x}px` }}
                            />
                          );
                        })}

                        {/* Today Marker Line */}
                        <div
                          className="absolute top-0 bottom-0 z-20 w-[2px] bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                          style={{ left: `${ganttConfig.todayX}px` }}
                          title="Fecha Actual: 24 de Octubre de 2026"
                        />

                        {/* Planned Baseline Bar */}
                        <div
                          className="absolute z-10 h-5 overflow-hidden rounded-md border border-slate-700/80 bg-slate-800 transition-all"
                          style={{ left: `${xStart}px`, width: `${barWidth}px` }}
                        >
                          {/* Real Progress Fill */}
                          <div
                            className={`h-full transition-all ${
                              t.status === 'retraso_critico'
                                ? 'bg-rose-500'
                                : t.status === 'retraso_leve'
                                  ? 'bg-amber-500'
                                  : t.realPercent >= 100
                                    ? 'bg-emerald-500'
                                    : 'bg-sky-500'
                            }`}
                            style={{ width: `${realBarWidth}px` }}
                          />

                          {/* Planned Progress Target Marker */}
                          {t.plannedPercent > 0 && t.plannedPercent < 100 && (
                            <div
                              className="absolute top-0 bottom-0 z-10 w-[2px] bg-white shadow"
                              style={{ left: `${plannedIndicatorX}px` }}
                              title={`Avance Planificado: ${t.plannedPercent}%`}
                            />
                          )}
                        </div>

                        {/* Associated Milestone Diamond */}
                        {t.milestoneId && (
                          <div
                            className="absolute -top-1 z-30 flex cursor-pointer items-center justify-center"
                            style={{ left: `${xEnd - 7}px` }}
                            title={`Hito de Entrega de Fase: ${t.phase}`}
                          >
                            <span className="flex h-3.5 w-3.5 rotate-45 items-center justify-center border border-amber-200 bg-amber-400 shadow-md" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: S-CURVE (CURVA S) PLANIFICADO VS REAL */}
      {activeView === 'curva_s' && (
        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
          <div className="flex flex-col items-start justify-between gap-2 border-b border-slate-800 pb-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-white">
                <TrendingUp className="h-4 w-4 text-sky-400" />
                Curva S de Avance Físico Acumulado (Planificado vs. Real)
              </h3>
              <p className="mt-0.5 text-xs text-slate-400">
                Proyección sigmoide de avance de obra. La brecha entre la curva azul (plan) y verde
                (real) muestra la variación en la entrega.
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-sky-400">
                <span className="inline-block h-3 w-3 rounded bg-sky-500" /> Avance Planificado (%)
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="inline-block h-3 w-3 rounded bg-emerald-500" /> Avance Real
                Ejecutado (%)
              </span>
            </div>
          </div>

          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={sCurveData} margin={{ top: 15, right: 20, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorPlanificado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} unit="%" domain={[0, 100]} />
                <Tooltip content={<CustomSCurveTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

                <ReferenceLine
                  x="Oct 2026"
                  stroke="#f43f5e"
                  strokeDasharray="4 4"
                  label={{
                    value: 'Hoy (Oct 2026)',
                    fill: '#f43f5e',
                    fontSize: 10,
                    position: 'top',
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="avancePlanificado"
                  name="Avance Planificado Acumulado (%)"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorPlanificado)"
                />

                <Line
                  type="monotone"
                  dataKey="avanceReal"
                  name="Avance Real Ejecutado (%)"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#10b981', stroke: '#064e3b', strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* VIEW 3: DETAILED TASKS & MILESTONES MATRIX */}
      {activeView === 'matriz' && (
        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-white">
                <Sliders className="h-4 w-4 text-amber-400" />
                Matriz de Desglose de Fases, Hitos y Ajuste de Avance
              </h3>
              <p className="mt-0.5 text-xs text-slate-400">
                Edición de avances porcentuales, verificación de fechas contractuales y ponderación
                de impacto.
              </p>
            </div>
            <span className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1 font-mono text-xs font-bold text-slate-300">
              {enrichedTasks.length} Tareas Activas
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase">
                  <th className="pb-2.5 pl-2">Fase / Actividad</th>
                  <th className="pb-2.5">Fechas Programadas</th>
                  <th className="pb-2.5 text-center">Ruta Crítica</th>
                  <th className="pb-2.5 text-center">Peso</th>
                  <th className="pb-2.5 text-center">Planificado</th>
                  <th className="pb-2.5 text-center">Real Actual</th>
                  <th className="pb-2.5 text-center">Estado</th>
                  <th className="pb-2.5 text-center">Ajustar Avance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {enrichedTasks.map((t) => (
                  <tr key={t.id} className="transition hover:bg-slate-800/30">
                    <td className="py-3 pl-2 font-sans">
                      <span className="mr-1.5 rounded border border-amber-800/60 bg-amber-950/60 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-400">
                        {t.phase}
                      </span>
                      <strong className="text-xs text-white">{t.name}</strong>
                      {t.assignedTo && (
                        <span className="block font-sans text-[10px] text-slate-400">
                          Responsable: {t.assignedTo}
                        </span>
                      )}
                    </td>

                    <td className="py-3 font-sans text-[11px] text-slate-300">
                      <Clock className="mr-1 inline h-3 w-3 text-sky-400" />
                      {t.startDate} al {t.endDate}
                    </td>

                    <td className="py-3 text-center">
                      {t.criticalPath ? (
                        <span className="rounded border border-rose-800 bg-rose-950 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                          Crítica
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">Normal</span>
                      )}
                    </td>

                    <td className="py-3 text-center text-slate-300">{t.weightPercent}%</td>

                    <td className="py-3 text-center font-bold text-sky-400">{t.plannedPercent}%</td>

                    <td className="py-3 text-center font-black text-emerald-400">
                      {t.realPercent}%
                    </td>

                    <td className="py-3 text-center font-sans">
                      {t.status === 'adelantado' && (
                        <span className="rounded-full border border-emerald-800 bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                          Adelantado (+{t.variance}%)
                        </span>
                      )}
                      {t.status === 'al_dia' && (
                        <span className="rounded-full border border-sky-800 bg-sky-950 px-2 py-0.5 text-[10px] font-bold text-sky-300">
                          Al Día
                        </span>
                      )}
                      {t.status === 'retraso_leve' && (
                        <span className="rounded-full border border-amber-800 bg-amber-950 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                          Retraso Leve ({t.variance}%)
                        </span>
                      )}
                      {t.status === 'retraso_critico' && (
                        <span className="rounded-full border border-rose-800 bg-rose-950 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                          Crítico ({t.variance}%)
                        </span>
                      )}
                    </td>

                    <td className="py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            if (onUpdateTaskProgress)
                              onUpdateTaskProgress(t.id, Math.max(0, t.progress - 10));
                          }}
                          className="cursor-pointer rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-300 hover:bg-slate-700"
                        >
                          -10%
                        </button>
                        <button
                          onClick={() => {
                            if (onUpdateTaskProgress)
                              onUpdateTaskProgress(t.id, Math.min(100, t.progress + 10));
                          }}
                          className="cursor-pointer rounded bg-sky-600 px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-sky-500"
                        >
                          +10%
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Custom Tooltip for S-Curve Chart
 */
function CustomSCurveTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const hasReal = data.avanceReal !== null;
    const gap = hasReal ? data.avanceReal - data.avancePlanificado : null;

    return (
      <div className="min-w-[200px] space-y-1.5 rounded-xl border border-slate-700 bg-slate-950 p-3.5 font-sans text-xs shadow-2xl">
        <strong className="block border-b border-slate-800 pb-1 text-sm text-white">
          {data.label}
        </strong>
        <div className="space-y-1 font-mono text-[11px]">
          <div className="flex justify-between font-bold text-sky-400">
            <span>Avance Planificado:</span>
            <span>{data.avancePlanificado}%</span>
          </div>
          {hasReal && (
            <div className="flex justify-between font-bold text-emerald-400">
              <span>Avance Real Ejecutado:</span>
              <span>{data.avanceReal}%</span>
            </div>
          )}
          {gap !== null && (
            <div
              className={`flex justify-between border-t border-slate-800 pt-1 font-bold ${gap >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}
            >
              <span>Variación de Obra:</span>
              <span>
                {gap > 0 ? '+' : ''}
                {gap}%
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
}
