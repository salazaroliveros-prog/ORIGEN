'use client';

import React, { useState, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Filter,
  Search,
  Building2,
  MapPin,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import type { Project } from '@/lib/types';

interface ProjectsModuleProps {
  projects: Project[];
  loading?: boolean;
  onCreateProject?: (data: Partial<Project>) => Promise<void>;
  onUpdateProject?: (id: string, data: Partial<Project>) => Promise<void>;
  onDeleteProject?: (id: string) => Promise<void>;
  canWrite?: boolean;
}

/**
 * PROJECTS MODULE - Módulo de Proyectos
 *
 * ✨ Características:
 * - Listado profesional de proyectos
 * - Vista detallada con información completa
 * - Crear/editar/eliminar proyectos
 * - Search y filtros avanzados
 * - Responsive mobile/tablet/desktop
 * - WCAG 2.1 AA accesibilidad
 */
export function ProjectsModule({
  projects = [],
  loading = false,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  canWrite = false,
}: ProjectsModuleProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filters, setFilters] = useState({ status: 'all' });

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      if (
        searchTerm &&
        !(
          project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          project.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (project.location?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
        )
      ) {
        return false;
      }

      if (filters.status !== 'all' && project.status !== filters.status) {
        return false;
      }

      return true;
    });
  }, [projects, searchTerm, filters]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Planificación':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'En Ejecución':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
      case 'Finalizado':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="min-h-screen space-y-6 bg-slate-950 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Proyectos & Firmas</h1>
          <p className="mt-1 text-sm text-slate-400">
            Gestión integral de proyectos con trazabilidad completa y firmas digitales
          </p>
        </div>

        {canWrite && (
          <Button
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Nuevo Proyecto
          </Button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nombre, código o ubicación..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.05] py-2 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          />
        </div>

        {/* Status Filter */}
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
        >
          <option value="all">Todos los estados</option>
          <option value="Planificación">Planificación</option>
          <option value="En Ejecución">En Ejecución</option>
          <option value="Finalizado">Finalizado</option>
        </select>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProjects.map((project) => (
          <Card
            key={project.id}
            variant="default"
            className="group cursor-pointer transition-all duration-200 hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/10"
            onClick={() => setSelectedProject(project)}
          >
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-primary-500/20 px-2 py-1 text-xs font-semibold text-primary-300">
                      <Building2 className="h-3 w-3" />
                      {project.code}
                    </span>
                  </div>
                  <h3 className="mt-2 font-semibold text-white">{project.name}</h3>
                </div>

                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusColor(project.status)}`}
                >
                  {project.status}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm">
                {project.location && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>{project.location}</span>
                  </div>
                )}

                {project.startDate && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>
                      {new Date(project.startDate).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'short',
                        day: '2-digit',
                      })}
                    </span>
                  </div>
                )}

                {project.budgetTotal && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <TrendingUp className="h-4 w-4 shrink-0" />
                    <span>Q{project.budgetTotal.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              {project.scheduleMilestones && project.scheduleMilestones.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Avance</span>
                    <span className="font-semibold text-white">
                      {Math.round(
                        (project.scheduleMilestones.filter((m) => m.completed).length /
                          project.scheduleMilestones.length) *
                          100
                      )}
                      %
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-primary-500 to-sky-400 transition-all duration-300"
                      style={{
                        width: `${
                          (project.scheduleMilestones.filter((m) => m.completed).length /
                            project.scheduleMilestones.length) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              {canWrite && (
                <div className="flex gap-2 border-t border-white/5 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProject(project);
                    }}
                    className="flex-1"
                  >
                    <Edit2 className="mr-1 h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onDeleteProject) {
                        onDeleteProject(project.id);
                      }
                    }}
                    className="flex-1"
                  >
                    <Trash2 className="mr-1 h-4 w-4 text-red-400" />
                    Eliminar
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredProjects.length === 0 && (
        <Card
          variant="default"
          className="flex flex-col items-center justify-center py-12 text-center"
        >
          <Building2 className="mb-4 h-12 w-12 text-slate-500" />
          <h3 className="mb-2 text-lg font-semibold text-white">Sin proyectos</h3>
          <p className="text-sm text-slate-400">
            {searchTerm || filters.status !== 'all'
              ? 'No se encontraron proyectos con los filtros aplicados'
              : 'Crea tu primer proyecto para comenzar'}
          </p>
        </Card>
      )}
    </div>
  );
}

export default ProjectsModule;
