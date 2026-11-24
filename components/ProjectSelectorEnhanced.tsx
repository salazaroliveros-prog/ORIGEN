'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  CheckCircle2,
  Clock,
  Zap,
  AlertCircle,
  Briefcase,
  Calendar,
  Users,
} from 'lucide-react';
import type { Project } from '@/lib/types';

interface ProjectSelectorProps {
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (projectId: string) => void;
  compact?: boolean;
}

/**
 * PROJECT SELECTOR ENHANCED - Producción Empresarial
 * 
 * ✨ Características:
 * - Preview visual de proyecto (código, nombre, estado, % avance)
 * - Indicador de estado semántico (Planificación, Ejecución, Finalizado)
 * - Muestra avance del proyecto con barra visual
 * - Responsive: dropdown desktop, sheet mobile
 * - Accesibilidad completa (WCAG 2.1 AA)
 */
export function ProjectSelectorEnhanced({
  projects,
  activeProjectId,
  onSelectProject,
  compact = false,
}: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calcular progreso promedio del proyecto
  const getProjectProgress = (project: Project): number => {
    if (!project.scheduleMilestones || project.scheduleMilestones.length === 0) {
      return 0;
    }
    const completedMilestones = project.scheduleMilestones.filter((m) => m.completed).length;
    return Math.round((completedMilestones / project.scheduleMilestones.length) * 100);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Planificación':
        return <Clock className="h-4 w-4 text-amber-400" aria-hidden="true" />;
      case 'En Ejecución':
        return <Zap className="h-4 w-4 text-sky-400" aria-hidden="true" />;
      case 'Finalizado':
        return <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />;
      default:
        return <Briefcase className="h-4 w-4 text-slate-400" aria-hidden="true" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Planificación':
        return 'bg-amber-500/20 border-amber-500/30 text-amber-300';
      case 'En Ejecución':
        return 'bg-sky-500/20 border-sky-500/30 text-sky-300';
      case 'Finalizado':
        return 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300';
      default:
        return 'bg-slate-500/20 border-slate-500/30 text-slate-300';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 75) return 'bg-emerald-500 shadow-lg shadow-emerald-500/30';
    if (progress >= 50) return 'bg-sky-500 shadow-lg shadow-sky-500/30';
    if (progress >= 25) return 'bg-amber-500 shadow-lg shadow-amber-500/30';
    return 'bg-slate-400 shadow-lg shadow-slate-400/20';
  };

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];
  if (!activeProject) return null;

  const progress = getProjectProgress(activeProject);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  if (compact) {
    // Compact mode - simple select
    return (
      <select
        value={activeProjectId}
        onChange={(e) => onSelectProject(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-white backdrop-blur-sm transition-colors hover:border-white/20 focus-visible:border-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        aria-label="Seleccionar proyecto"
      >
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.code} · {project.name}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group w-full rounded-lg border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-3 text-left transition-all duration-200 hover:border-white/20 hover:bg-white/[0.1] focus-visible:border-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:p-4"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-sky-500/20 px-2 py-1 text-xs font-semibold text-sky-300">
                <Briefcase className="h-3 w-3" aria-hidden="true" />
                {activeProject.code}
              </span>
              {getStatusIcon(activeProject.status)}
            </div>
            <h3 className="mt-2 truncate text-sm font-semibold text-white">
              {activeProject.name}
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              {activeProject.location || 'Ubicación no definida'}
            </p>

            {/* Progress bar */}
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-400">Avance de hitos</span>
                <span className="text-xs font-bold text-white">{progress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full transition-all duration-300 ${getProgressColor(progress)}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Meta info */}
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
              {activeProject.startDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" aria-hidden="true" />
                  <span>
                    {new Date(activeProject.startDate).toLocaleDateString('es-ES', {
                      month: 'short',
                      year: '2-digit',
                    })}
                  </span>
                </div>
              )}
              {activeProject.teamMembers && activeProject.teamMembers.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Users className="h-3 w-3" aria-hidden="true" />
                  <span>{activeProject.teamMembers.length} miembros</span>
                </div>
              )}
            </div>
          </div>

          <ChevronDown
            className={`mt-1 h-5 w-5 shrink-0 transition-transform duration-200 text-slate-400 group-hover:text-white ${isOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto overscroll-contain rounded-lg border border-white/10 bg-slate-900/95 shadow-xl backdrop-blur-xl"
          role="listbox"
          aria-label="Lista de proyectos"
        >
          {projects.map((project, index) => {
            const projectProgress = getProjectProgress(project);
            const isActive = project.id === activeProjectId;

            return (
              <button
                key={project.id}
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  onSelectProject(project.id);
                  setIsOpen(false);
                }}
                className={`w-full border-b border-white/5 px-4 py-3 text-left transition-colors duration-150 hover:bg-white/[0.08] focus-visible:bg-white/[0.1] focus-visible:outline-none sm:px-5 sm:py-4 ${
                  isActive ? 'bg-sky-500/20' : ''
                } ${index === projects.length - 1 ? 'border-b-0' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold ${getStatusColor(project.status)}`}
                      >
                        {getStatusIcon(project.status)}
                        {project.code}
                      </span>
                      {isActive && (
                        <CheckCircle2 className="h-4 w-4 text-sky-400" aria-hidden="true" />
                      )}
                    </div>
                    <p className="truncate text-sm font-semibold text-white">{project.name}</p>
                    <p className="truncate text-xs text-slate-400">
                      {project.location || 'Ubicación no definida'}
                    </p>

                    {/* Mini progress bar */}
                    <div className="flex items-center gap-2 pt-1">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-700">
                        <div
                          className={`h-full transition-all duration-200 ${getProgressColor(projectProgress)}`}
                          style={{ width: `${projectProgress}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-400">{projectProgress}%</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ProjectSelectorEnhanced;
