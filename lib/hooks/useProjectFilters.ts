import { useState, useMemo } from 'react';
import type { Project } from '@/lib/types';

export type ProjectStatusFilter =
  'todos' | 'En Ejecución' | 'Planificación' | 'Finalizado' | 'Archivado';

export function useProjectFilters(projects: Project[]) {
  const [statusFilter, setStatusFilter] = useState<ProjectStatusFilter>('todos');

  const filteredProjects = useMemo(() => {
    if (statusFilter === 'todos') return projects;
    return projects.filter((p) => p.status === statusFilter);
  }, [projects, statusFilter]);

  const projectCounts = useMemo(() => {
    return {
      total: projects.length,
      enEjecucion: projects.filter((p) => p.status === 'En Ejecución').length,
      planificacion: projects.filter((p) => p.status === 'Planificación').length,
      finalizado: projects.filter((p) => p.status === 'Finalizado').length,
      archivado: projects.filter((p) => p.status === 'Archivado').length,
    };
  }, [projects]);

  return {
    filteredProjects,
    statusFilter,
    setStatusFilter,
    projectCounts,
  };
}
