'use client';

import React, { memo, useMemo } from 'react';
import { Clock } from 'lucide-react';
import type { Project, Milestone, UpcomingMilestone } from '../types';

interface UpcomingMilestonesProps {
  projects: Project[];
  milestones: Milestone[];
  onSelectProject: (projectId: string) => void;
}

const MilestoneCard = memo(function MilestoneCard({ milestone, isUrgent, onSelect }: { milestone: UpcomingMilestone; isUrgent: boolean; onSelect: () => void }) {
  return (
    <div
      onClick={onSelect}
      className="group cursor-pointer rounded-2xl border border-slate-800 bg-slate-800/60 p-4 transition hover:border-amber-500/50 hover:bg-slate-800"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase text-amber-400">{milestone.projectCode} • {milestone.phase}</span>
          <h4 className="mt-0.5 text-xs font-extrabold text-white transition group-hover:text-amber-300">{milestone.title}</h4>
          <p className="mt-1 line-clamp-1 text-[11px] text-slate-400">{milestone.projectName}</p>
        </div>
        <span
          className={`shrink-0 rounded-lg px-2 py-1 font-mono text-[10px] font-extrabold ${
            isUrgent
              ? 'border border-rose-700 bg-rose-950 text-rose-300'
              : 'border border-amber-700/60 bg-amber-950/60 text-amber-300'
          }`}
        >
          {milestone.diffDays === 0
            ? 'Vence hoy'
            : milestone.diffDays > 0
              ? `Vence en ${milestone.diffDays}d`
              : `Vencido (${Math.abs(milestone.diffDays)}d)`}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-slate-700/50 pt-2 font-mono text-[11px] text-slate-300">
        <span>Fecha límite: {milestone.targetDate}</span>
        <span className="font-bold text-emerald-400">{milestone.progress}% avance</span>
      </div>
    </div>
  );
});

const UpcomingMilestonesComponent = memo(function UpcomingMilestonesComponent({ projects, milestones, onSelectProject }: UpcomingMilestonesProps) {
  const upcoming = useMemo(() => {
    const allMilestones =
      milestones.length > 0
        ? milestones
        : projects.flatMap((p) => p.scheduleMilestones ?? []);

    const today = new Date('2026-11-01T00:00:00');
    const in7Days = new Date(today);
    in7Days.setDate(today.getDate() + 30);

    return allMilestones
      .filter((m) => {
        if (m.completed) return false;
        if (!m.targetDate) return false;
        const target = new Date(m.targetDate + 'T00:00:00');
        const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= -5 && diffDays <= 30;
      })
      .map((m): UpcomingMilestone => {
        const project = projects.find((p) => p.id === m.projectId);
        const target = new Date(m.targetDate + 'T00:00:00');
        const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return {
          ...m,
          projectName: project?.name ?? 'Proyecto de Obra',
          projectCode: project?.code ?? m.projectId,
          diffDays,
        };
      })
      .sort((a, b) => a.targetDate.localeCompare(b.targetDate));
  }, [projects, milestones]);

  return (
    <div className="space-y-4 rounded-2xl border border-amber-500/30 bg-slate-900/90 p-5 shadow-xl">
      <div className="flex flex-col items-start justify-between gap-2 border-b border-slate-800 pb-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="rounded-xl border border-amber-500/40 bg-amber-500/20 p-2.5 text-amber-400" aria-hidden="true">
            <Clock className="h-5 w-5 animate-pulse" />
          </span>
          <div>
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-white">
              Alertas Próximas & Hitos del Cronograma (Próximos Vencimientos)
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Hitos críticos de obra pendientes con fecha de vencimiento próxima en el cronograma de ejecución.
            </p>
          </div>
        </div>
        <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 font-mono text-xs font-bold text-amber-300">
          {upcoming.length} Hitos Activos
        </span>
      </div>

      {upcoming.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-400">
          No hay hitos programados con vencimiento inminente en los próximos días. Todo el cronograma se encuentra al día.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {upcoming.map((m) => {
            const isUrgent = m.diffDays <= 3;
            return (
              <MilestoneCard
                key={m.id}
                milestone={m}
                isUrgent={isUrgent}
                onSelect={() => onSelectProject(m.projectId)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
});

export const UpcomingMilestones = memo(UpcomingMilestonesComponent);
UpcomingMilestones.displayName = 'UpcomingMilestones';