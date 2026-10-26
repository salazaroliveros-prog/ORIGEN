'use client';

import React, { useMemo, useState } from 'react';
import { Plus, Edit2, Archive, ArchiveRestore, Download, Calendar, Building } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { ProjectForm } from '@/components/ProjectForm';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { TouchTarget } from '@/components/ui/TouchTarget';
import { toast } from 'react-hot-toast';
import type { CompanySettings, ExpenseRecord, Project } from '@/lib/types';
import type { ProjectFormProject, ProjectFormValues } from '@/lib/validation/project.schema';

interface ProjectsViewProps {
  company?: CompanySettings;
  projects: Project[];
  expenses: ExpenseRecord[];
  loading: boolean;
  onCreateProject: (
    values: ProjectFormValues,
    onCreated?: (projectId: string) => void
  ) => Promise<boolean>;
  onProjectCreated: (projectId: string) => void;
  onUpdateProject: (projectId: string, values: Partial<ProjectFormValues>) => Promise<boolean>;
  onArchiveProject: (projectId: string) => Promise<boolean>;
  onRestoreProject: (projectId: string) => Promise<boolean>;
  canManageProjects: boolean;
}

export function ProjectsView({
  company,
  projects,
  expenses,
  loading,
  onCreateProject,
  onProjectCreated,
  onUpdateProject,
  onArchiveProject,
  onRestoreProject,
  canManageProjects,
}: ProjectsViewProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectFormProject | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const visibleProjects = useMemo(
    () => projects.filter((project) => (project.status === 'Archivado') === showArchived),
    [projects, showArchived]
  );
  const projectSpentById = useMemo(
    () =>
      expenses.reduce((totals, expense) => {
        totals.set(expense.projectId, (totals.get(expense.projectId) ?? 0) + expense.amount);
        return totals;
      }, new Map<string, number>()),
    [expenses]
  );

  const openEdit = (project: Project) => {
    const status = project.status;
    if (status === 'Archivado') return;
    setEditingProject({ ...project, status });
    setFormOpen(true);
  };

  const exportProjects = () => {
    const escapeCsv = (value: string | number) => {
      const text = String(value);
      const safeText = typeof value === 'string' && /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
      return `"${safeText.replace(/"/g, '""')}"`;
    };
    const rows = [
      ['Código', 'Proyecto', 'Cliente', 'Estado', 'Presupuesto (GTQ)', 'Gasto (GTQ)', 'Avance (%)'],
      ...visibleProjects.map((project) => [
        project.code || project.id,
        project.name,
        project.client,
        project.status,
        project.budgetTotal,
        projectSpentById.get(project.id) ?? project.spentTotal,
        project.progressPercent ?? 0,
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n')}`;
    const fileUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = `proyectos-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(fileUrl);
    toast.success('Exportación de proyectos lista.');
  };

  if (loading) {
    return (
      <div className="responsive-container safe-area-top safe-area-bottom flex min-h-full items-center justify-center">
        <div className="space-y-4 text-center">
          <Skeleton height="48px" width="160px" className="mx-auto" />
          <Skeleton height="24px" width="200px" className="mx-auto" />
          <Skeleton height="8px" width="100%" className="mx-auto w-1/2" />
          <Skeleton height="8px" width="100%" className="mx-auto w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="responsive-container safe-area-top safe-area-bottom min-h-full">
      <PageHeader
        title="Proyectos y Firmas Digitales"
        subtitle={`Gestión de ${visibleProjects.length} ${showArchived ? 'proyectos archivados' : 'proyectos activos'}`}
        logoUrl={company?.logoUrl}
        companyName={company?.companyName}
        actions={
          <div className="flex gap-2">
            {canManageProjects && (
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setEditingProject(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> Nuevo Proyecto
              </Button>
            )}
            <Button
              variant="outline"
              size="md"
              onClick={exportProjects}
              aria-label="Exportar proyectos a CSV"
              title="Exportar proyectos a CSV"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4">
        <Card variant="elevated" padding="md">
          <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="text-brand-secondary h-5 w-5" />
              <h3 className="text-sm font-semibold text-slate-300">Listado de Proyectos</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                <label className="flex items-center gap-2 tracking-normal normal-case">
                  <span>Mostrar</span>
                  <select
                    value={showArchived ? 'archived' : 'active'}
                    onChange={(event) => setShowArchived(event.target.value === 'archived')}
                    className="min-h-9 rounded-lg border border-white/15 bg-slate-900 px-2 text-xs text-white"
                  >
                    <option value="active">Activos</option>
                    <option value="archived">Archivados</option>
                  </select>
                </label>
                {visibleProjects.length} registro{visibleProjects.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <ul className="space-y-3">
            {visibleProjects.map((p) => {
              return (
                <li
                  key={p.id}
                  className="glass-l1 flex flex-col justify-between gap-3 rounded-xl border border-white/10 p-4 transition-all duration-200 hover:bg-white/[0.05] lg:flex-row lg:items-center"
                >
                  <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-500 text-white shadow-lg">
                        <span className="text-sm font-bold">{p.code?.charAt(0) || 'P'}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-200">
                          {p.code || 'PRO-001'}
                        </span>
                        <span className="text-base leading-tight font-bold text-white">
                          {p.name || 'Proyecto sin nombre'}
                        </span>
                      </div>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-400 lg:mt-0">
                      {p.client || 'Sin cliente asignado'}
                      {p.municipality && p.department
                        ? ` • ${p.municipality}, ${p.department}`
                        : ''}
                    </p>
                  </div>

                  <div className="flex w-full flex-col items-end gap-3 lg:w-auto lg:flex-row">
                    <div className="flex items-center gap-2">
                      <span className="rounded border border-amber-400/30 bg-amber-400/20 px-2 py-1 text-[10px] font-bold tracking-wider text-amber-300 uppercase">
                        {p.status || 'Planificación'}
                      </span>
                      <span className="rounded border border-slate-600 bg-slate-700 px-2 py-1 text-[10px] text-slate-300">
                        {p.progressPercent ?? 0}%
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-xs text-slate-400">
                      <span>Q{p.budgetTotal?.toLocaleString('es-GT') || '0'}</span>
                      <span className="text-amber-400">·</span>
                      <span>
                        Q{(projectSpentById.get(p.id) ?? p.spentTotal ?? 0).toLocaleString('es-GT')}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {canManageProjects && p.status !== 'Archivado' && (
                        <TouchTarget
                          onPress={() => openEdit(p)}
                          className="rounded-lg border border-white/10 bg-white/[0.05] p-2 text-slate-300 transition-all hover:bg-white/[0.1]"
                          aria-label={`Editar proyecto ${p.code}`}
                          title={`Editar proyecto ${p.code}`}
                        >
                          <Edit2 className="h-4 w-4" aria-hidden="true" />
                        </TouchTarget>
                      )}
                      {canManageProjects &&
                        (p.status === 'Archivado' ? (
                          <TouchTarget
                            onPress={() => void onRestoreProject(p.id)}
                            className="rounded-lg border border-white/10 bg-white/[0.05] p-2 text-slate-300 transition-all hover:bg-emerald-500/20 hover:text-emerald-300"
                            aria-label={`Restaurar proyecto ${p.code}`}
                            title={`Restaurar proyecto ${p.code}`}
                          >
                            <ArchiveRestore className="h-4 w-4" aria-hidden="true" />
                          </TouchTarget>
                        ) : (
                          <TouchTarget
                            onPress={() => void onArchiveProject(p.id)}
                            className="rounded-lg border border-white/10 bg-white/[0.05] p-2 text-slate-300 transition-all hover:bg-amber-500/20 hover:text-amber-300"
                            aria-label={`Archivar proyecto ${p.code}`}
                            title={`Archivar proyecto ${p.code}; conserva sus datos`}
                          >
                            <Archive className="h-4 w-4" aria-hidden="true" />
                          </TouchTarget>
                        ))}
                    </div>
                  </div>
                </li>
              );
            })}
            {visibleProjects.length === 0 && (
              <li className="glass-l1 flex flex-col items-center gap-3 rounded-xl p-8 text-center text-sm text-slate-400">
                <Building className="h-10 w-10 text-slate-500 opacity-30" />
                <span>
                  {showArchived ? 'No hay proyectos archivados' : 'No hay proyectos activos'}
                </span>
                {canManageProjects && !showArchived && (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => setFormOpen(true)}
                    className="mt-3"
                  >
                    <Plus className="mr-2 h-3 w-3" />
                    Crear su primer proyecto
                  </Button>
                )}
              </li>
            )}
          </ul>
        </Card>
      </div>

      {canManageProjects && (
        <ProjectForm
          isOpen={formOpen}
          onClose={() => {
            setFormOpen(false);
            setEditingProject(null);
          }}
          onSave={(values) =>
            editingProject
              ? onUpdateProject(editingProject.id, values)
              : onCreateProject(values, onProjectCreated)
          }
          editingProject={editingProject}
        />
      )}
    </div>
  );
}
