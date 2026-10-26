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
    const validDates = (values: string[]) => values
      .map((value) => new Date(value))
      .filter((date) => Number.isFinite(date.getTime()));
    const taskStarts = validDates(projectTasks.map((task) => task.startDate));
    const taskEnds = validDates(projectTasks.map((task) => task.endDate));
    const projectStart = currentProject?.startDate ? new Date(currentProject.startDate) : null;
    const projectEnd = currentProject?.endDate ? new Date(currentProject.endDate) : null;
    const startDate = projectStart && Number.isFinite(projectStart.getTime())
      ? projectStart
      : taskStarts.length > 0 ? new Date(Math.min(...taskStarts.map((date) => date.getTime()))) : null;
    const endDate = projectEnd && Number.isFinite(projectEnd.getTime())
      ? projectEnd
      : taskEnds.length > 0 ? new Date(Math.max(...taskEnds.map((date) => date.getTime()))) : null;

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
        plannedPercent = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDurationDays) * 100)));
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

    const delayed = enrichedTasks.filter((t) => t.status === 'retraso_leve' || t.status === 'retraso_critico').length;
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
    const currentProgress = totalTaskWeight > 0
      ? Math.round(projectTasks.reduce((sum, task) => sum + task.progress * (task.weightPercent || 10), 0) / totalTaskWeight)
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

    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

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
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <span className="p-3 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400">
            <CalendarDays className="w-6 h-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-white tracking-tight">
                Cronograma Gantt & Ruta Crítica de Obra
              </h1>
              <span className="text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-md border border-sky-400/30">
                D3 + Recharts
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Control temporal de fases de construcción, hitos críticos, fechas de inicio/fin y desvío de avance real vs planificado.
            </p>
          </div>
        </div>

        {/* Project Selector & View Toggles */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Project Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 font-bold text-slate-200">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-transparent text-slate-200 font-bold focus:outline-none cursor-pointer"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-800 text-white">
                  {p.code ? `${p.code} - ${p.name.substring(0, 24)}...` : p.name}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Buttons */}
          <div className="flex items-center bg-slate-800 border border-slate-700 p-0.5 rounded-xl font-bold">
            <button
              onClick={() => setActiveView('gantt')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeView === 'gantt' ? 'bg-sky-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Gantt Temporal
            </button>
            <button
              onClick={() => setActiveView('curva_s')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeView === 'curva_s' ? 'bg-sky-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Curva S (Plan vs Real)
            </button>
            <button
              onClick={() => setActiveView('matriz')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeView === 'matriz' ? 'bg-sky-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Matriz de Tareas
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards: Schedule Performance Index */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card variant="elevated" padding="md" className="bg-slate-900/80 border-slate-800">
          <div className="flex justify-between items-start">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avance Planificado</p>
            <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-sky-400 mt-1 font-mono">{stats.avgPlanned}%</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Meta programada a la fecha de hoy</p>
        </Card>

        <Card variant="elevated" padding="md" className="bg-slate-900/80 border-slate-800">
          <div className="flex justify-between items-start">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avance Físico Real</p>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">{stats.avgReal}%</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Ejecución ponderada en obra</p>
        </Card>

        <Card
          variant="elevated"
          padding="md"
          className={`border ${
            stats.varianceGap < -5
              ? 'bg-rose-950/20 border-rose-800/80'
              : stats.varianceGap >= 0
              ? 'bg-emerald-950/20 border-emerald-800/80'
              : 'bg-slate-900/80 border-slate-800'
          }`}
        >
          <div className="flex justify-between items-start">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Desvío de Cronograma</p>
            <span className={`p-1.5 rounded-lg ${stats.varianceGap < 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <p className={`text-2xl font-black mt-1 font-mono ${stats.varianceGap < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {stats.varianceGap > 0 ? '+' : ''}{stats.varianceGap}%
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {stats.varianceGap < -5 ? `${stats.delayedTasks} actividades con retraso` : 'Ritmo de obra en tolerancia'}
          </p>
        </Card>

        <Card variant="elevated" padding="md" className="bg-slate-900/80 border-slate-800">
          <div className="flex justify-between items-start">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hitos Críticos</p>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-amber-400 mt-1 font-mono">
            {stats.completedMilestones} / {stats.totalMilestones}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">{stats.criticalTasks} tareas en ruta crítica</p>
        </Card>
      </div>

      {/* VIEW 1: D3 INTERACTIVE GANTT TIMELINE */}
      {activeView === 'gantt' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar tarea o fase..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Phase Filter */}
              <select
                value={phaseFilter}
                onChange={(e) => setPhaseFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-200 font-bold focus:outline-none cursor-pointer"
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  onlyCriticalPath
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                Solo Ruta Crítica
              </button>
            </div>

            {/* Legend */}
            <div className="flex items-center flex-wrap gap-3 text-[11px] font-bold text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-2 rounded bg-slate-700 border border-slate-500 inline-block" /> Planificado
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-2 rounded bg-emerald-500 inline-block" /> Real Ejecutado
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-2 rounded bg-rose-500 inline-block" /> Retraso Crítico
              </span>
              <span className="flex items-center gap-1.5 text-amber-300">
                <span className="w-2.5 h-2.5 rotate-45 bg-amber-400 inline-block" /> Hito Crítico
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-0.5 h-3 bg-rose-500 inline-block" /> Hoy (24/10/2026)
              </span>
            </div>
          </div>

          {/* Gantt SVG + Table Split View */}
          <div className="overflow-x-auto">
            <div className="min-w-[1050px]">
              {/* Header Time Axis */}
              <div className="grid grid-cols-[280px_1fr] border-b border-slate-800 pb-2">
                <div className="text-xs font-extrabold text-slate-400 uppercase tracking-wider pl-2">
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
                      className="grid grid-cols-[280px_1fr] py-3 hover:bg-slate-800/40 transition items-center"
                    >
                      {/* Left Task Metadata */}
                      <div className="pr-4 pl-2 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-800/60">
                            {t.phase}
                          </span>
                          {t.criticalPath && (
                            <span className="text-[9px] font-extrabold text-rose-300 bg-rose-950/80 px-1 py-0.2 rounded border border-rose-800">
                              Ruta Crítica
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-white truncate" title={t.name}>
                          {t.name}
                        </h4>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span>{t.startDate} al {t.endDate} ({t.durationDays}d)</span>
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
                      <div className="relative h-9 bg-slate-950/40 rounded-xl overflow-hidden border border-slate-800/50 flex items-center">
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
                          className="absolute top-0 bottom-0 w-[2px] bg-rose-500 z-20 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                          style={{ left: `${ganttConfig.todayX}px` }}
                          title="Fecha Actual: 24 de Octubre de 2026"
                        />

                        {/* Planned Baseline Bar */}
                        <div
                          className="absolute h-5 rounded-md bg-slate-800 border border-slate-700/80 transition-all z-10 overflow-hidden"
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
                              className="absolute top-0 bottom-0 w-[2px] bg-white z-10 shadow"
                              style={{ left: `${plannedIndicatorX}px` }}
                              title={`Avance Planificado: ${t.plannedPercent}%`}
                            />
                          )}
                        </div>

                        {/* Associated Milestone Diamond */}
                        {t.milestoneId && (
                          <div
                            className="absolute -top-1 z-30 flex items-center justify-center cursor-pointer"
                            style={{ left: `${xEnd - 7}px` }}
                            title={`Hito de Entrega de Fase: ${t.phase}`}
                          >
                            <span className="w-3.5 h-3.5 rotate-45 bg-amber-400 border border-amber-200 shadow-md flex items-center justify-center" />
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
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-sky-400" />
                Curva S de Avance Físico Acumulado (Planificado vs. Real)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Proyección sigmoide de avance de obra. La brecha entre la curva azul (plan) y verde (real) muestra la variación en la entrega.
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-sky-400">
                <span className="w-3 h-3 rounded bg-sky-500 inline-block" /> Avance Planificado (%)
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Avance Real Ejecutado (%)
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
                  label={{ value: 'Hoy (Oct 2026)', fill: '#f43f5e', fontSize: 10, position: 'top' }}
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
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                Matriz de Desglose de Fases, Hitos y Ajuste de Avance
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Edición de avances porcentuales, verificación de fechas contractuales y ponderación de impacto.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-300 bg-slate-800 px-3 py-1 rounded-xl border border-slate-700">
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
                  <tr key={t.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 pl-2 font-sans">
                      <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/60 mr-1.5">
                        {t.phase}
                      </span>
                      <strong className="text-white text-xs">{t.name}</strong>
                      {t.assignedTo && (
                        <span className="text-[10px] text-slate-400 block font-sans">
                          Responsable: {t.assignedTo}
                        </span>
                      )}
                    </td>

                    <td className="py-3 font-sans text-slate-300 text-[11px]">
                      <Clock className="w-3 h-3 text-sky-400 inline mr-1" />
                      {t.startDate} al {t.endDate}
                    </td>

                    <td className="py-3 text-center">
                      {t.criticalPath ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                          Crítica
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">Normal</span>
                      )}
                    </td>

                    <td className="py-3 text-center text-slate-300">
                      {t.weightPercent}%
                    </td>

                    <td className="py-3 text-center text-sky-400 font-bold">
                      {t.plannedPercent}%
                    </td>

                    <td className="py-3 text-center text-emerald-400 font-black">
                      {t.realPercent}%
                    </td>

                    <td className="py-3 text-center font-sans">
                      {t.status === 'adelantado' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                          Adelantado (+{t.variance}%)
                        </span>
                      )}
                      {t.status === 'al_dia' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-800">
                          Al Día
                        </span>
                      )}
                      {t.status === 'retraso_leve' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800">
                          Retraso Leve ({t.variance}%)
                        </span>
                      )}
                      {t.status === 'retraso_critico' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800">
                          Crítico ({t.variance}%)
                        </span>
                      )}
                    </td>

                    <td className="py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            if (onUpdateTaskProgress) onUpdateTaskProgress(t.id, Math.max(0, t.progress - 10));
                          }}
                          className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold cursor-pointer"
                        >
                          -10%
                        </button>
                        <button
                          onClick={() => {
                            if (onUpdateTaskProgress) onUpdateTaskProgress(t.id, Math.min(100, t.progress + 10));
                          }}
                          className="px-1.5 py-0.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold cursor-pointer"
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
      <div className="bg-slate-950 border border-slate-700 p-3.5 rounded-xl shadow-2xl text-xs space-y-1.5 font-sans min-w-[200px]">
        <strong className="text-white text-sm block border-b border-slate-800 pb-1">{data.label}</strong>
        <div className="font-mono text-[11px] space-y-1">
          <div className="flex justify-between text-sky-400 font-bold">
            <span>Avance Planificado:</span>
            <span>{data.avancePlanificado}%</span>
          </div>
          {hasReal && (
            <div className="flex justify-between text-emerald-400 font-bold">
              <span>Avance Real Ejecutado:</span>
              <span>{data.avanceReal}%</span>
            </div>
          )}
          {gap !== null && (
            <div className={`flex justify-between font-bold pt-1 border-t border-slate-800 ${gap >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>
              <span>Variación de Obra:</span>
              <span>{gap > 0 ? '+' : ''}{gap}%</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
}
