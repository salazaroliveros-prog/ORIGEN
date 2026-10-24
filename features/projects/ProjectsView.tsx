'use client';

import React, { useState, useCallback } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Calendar,
  Building,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { ProjectForm } from '@/components/ProjectForm';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { TouchTarget } from '@/components/ui/TouchTarget';
import { useProjectData } from '@/lib/hooks/useProjectData';
import { useAuthSession } from '@/lib/hooks/useAuthSession';
import { toast } from 'react-hot-toast';
import type { CompanySettings } from '@/lib/types';
import type { ProjectFormProject, ProjectFormValues } from '@/lib/validation/project.schema';

export function ProjectsView({ company }: { company?: CompanySettings }) {
  const { currentUser } = useAuthSession();
  const {
    projects,
    loading,
    createProject,
    updateProject,
    deleteProject,
  } = useProjectData(currentUser?.uid);

  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectFormProject | null>(null);

  const handleCreate = useCallback(
    async (values: ProjectFormValues) => {
      const success = await createProject(values);
      if (success) setFormOpen(false);
    },
    [createProject]
  );

  const handleEdit = useCallback(
    async (values: ProjectFormValues) => {
      if (!editingProject) return;
      try {
        const success = await updateProject(editingProject.id, values);
        if (success) {
          setFormOpen(false);
        }
      } finally {
        setEditingProject(null);
      }
    },
    [editingProject, updateProject]
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteProject(id);
    },
    [deleteProject]
  );

  const openEdit = (project: ProjectFormProject) => {
    setEditingProject(project);
    setFormOpen(true);
  };

  if (loading) {
    return (
      <div className="responsive-container safe-area-top safe-area-bottom min-h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <Skeleton height="48px" width="160px" className="mx-auto" />
          <Skeleton height="24px" width="200px" className="mx-auto" />
          <Skeleton height="8px" width="100%" className="w-1/2 mx-auto" />
          <Skeleton height="8px" width="100%" className="w-3/4 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="responsive-container safe-area-top safe-area-bottom min-h-full">
      <PageHeader
        title="Proyectos y Firmas Digitales"
        subtitle={`Gestión de ${projects.length} proyectos con trazabilidad completa`}
        logoUrl={company?.logoUrl}
        companyName={company?.companyName}
        actions={
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setEditingProject(null);
                setFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4" /> Nuevo Proyecto
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                toast('Función de exportación próxima');
              }}
              aria-label="Exportar proyectos (próximamente)"
              title="Exportar proyectos (próximamente)"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        }
      />

      <div className="responsive-grid">
        <Card variant="elevated" padding="md">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand-secondary" />
              <h3 className="text-sm font-semibold text-slate-300">Listado de Proyectos</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                {projects.length} registro{projects.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <ul className="space-y-3">
            {projects.map((p) => {
              return (
                <li
                  key={p.id}
                  className="glass-l1 p-4 rounded-xl border border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-3 hover:bg-white/[0.05] transition-all duration-200"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-3 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-lg">
                        <span className="font-bold text-sm">{p.code?.charAt(0) || 'P'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-slate-200 truncate block">
                          {p.code || 'PRO-001'}
                        </span>
                        <span className="text-base font-bold text-white leading-tight">
                          {p.name || 'Proyecto sin nombre'}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 lg:mt-0 line-clamp-2">
                      {p.client || 'Sin cliente asignado'}
                      {p.municipality && p.department
                        ? ` • ${p.municipality}, ${p.department}`
                        : ''}
                    </p>
                  </div>

                  <div className="flex flex-col lg:flex-row gap-3 w-full lg:w-auto items-end">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                        {p.status || 'Planificación'}
                      </span>
                      <span className="text-[10px] px-2 py-1 rounded bg-slate-700 text-slate-300 border border-slate-600">
                        {p.progressPercent ?? 0}%
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                      <span>Q{p.budgetTotal?.toLocaleString('es-GT') || '0'}</span>
                      <span className="text-amber-400">·</span>
                      <span>Q{p.spentTotal?.toLocaleString('es-GT') || '0'}</span>
                    </div>
                    <div className="flex gap-2">
                      <TouchTarget
                        onPress={() => openEdit(p as ProjectFormProject)}
                        className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/10 transition-all"
                        aria-label={`Editar proyecto ${p.code}`}
                        title={`Editar proyecto ${p.code}`}
                      >
                        <Edit2 className="w-4 h-4" aria-hidden="true" />
                      </TouchTarget>
                      <TouchTarget
                        onPress={() => handleDelete(p.id)}
                        className="p-2 rounded-lg bg-white/[0.05] hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-slate-300 hover:text-red-300 transition-all"
                        aria-label={`Eliminar proyecto ${p.code}`}
                        title={`Eliminar proyecto ${p.code}`}
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </TouchTarget>
                    </div>
                  </div>
                </li>
              );
            })}
            {projects.length === 0 && (
              <li className="glass-l1 p-8 rounded-xl text-center text-slate-400 text-sm flex flex-col items-center gap-3">
                <Building className="w-10 h-10 opacity-30 text-slate-500" />
                <span>No hay proyectos registrados</span>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setFormOpen(true)}
                  className="mt-3"
                >
                  <Plus className="w-3 h-3 mr-2" />
                  Crear su primer proyecto
                </Button>
              </li>
            )}
          </ul>
        </Card>
      </div>

      <ProjectForm
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingProject(null);
        }}
        onSave={editingProject ? handleEdit : handleCreate}
        editingProject={editingProject}
      />
    </div>
  );
}
