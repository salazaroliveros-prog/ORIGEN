'use client';

import React, { useMemo, useState } from 'react';
import {
  Plus,
  Edit2,
  Archive,
  ArchiveRestore,
  Download,
  Calendar,
  Building,
} from 'lucide-react';
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
  onCreateProject: (values: ProjectFormValues) => Promise<boolean>;
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
                <Plus className="w-4 h-4" /> Nuevo Proyecto
              </Button>
            )}
            <Button
              variant="outline"
              size="md"
              onClick={exportProjects}
              aria-label="Exportar proyectos a CSV"
              title="Exportar proyectos a CSV"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4">
        <Card variant="elevated" padding="md">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand-secondary" />
              <h3 className="text-sm font-semibold text-slate-300">Listado de Proyectos</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                <label className="flex items-center gap-2 normal-case tracking-normal">
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
                      <span>
                        Q{(projectSpentById.get(p.id) ?? p.spentTotal ?? 0).toLocaleString('es-GT')}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {canManageProjects && p.status !== 'Archivado' && (
                        <TouchTarget
                        onPress={() => openEdit(p)}
                        className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/10 transition-all"
                        aria-label={`Editar proyecto ${p.code}`}
                        title={`Editar proyecto ${p.code}`}
                      >
                        <Edit2 className="w-4 h-4" aria-hidden="true" />
                      </TouchTarget>
                      )}
                      {canManageProjects && (p.status === 'Archivado' ? (
                        <TouchTarget
                          onPress={() => void onRestoreProject(p.id)}
                          className="p-2 rounded-lg bg-white/[0.05] hover:bg-emerald-500/20 border border-white/10 text-slate-300 hover:text-emerald-300 transition-all"
                          aria-label={`Restaurar proyecto ${p.code}`}
                          title={`Restaurar proyecto ${p.code}`}
                        >
                          <ArchiveRestore className="w-4 h-4" aria-hidden="true" />
                        </TouchTarget>
                      ) : (
                        <TouchTarget
                          onPress={() => void onArchiveProject(p.id)}
                          className="p-2 rounded-lg bg-white/[0.05] hover:bg-amber-500/20 border border-white/10 text-slate-300 hover:text-amber-300 transition-all"
                          aria-label={`Archivar proyecto ${p.code}`}
                          title={`Archivar proyecto ${p.code}; conserva sus datos`}
                        >
                          <Archive className="w-4 h-4" aria-hidden="true" />
                        </TouchTarget>
                      ))}
                    </div>
                  </div>
                </li>
              );
            })}
            {visibleProjects.length === 0 && (
              <li className="glass-l1 p-8 rounded-xl text-center text-slate-400 text-sm flex flex-col items-center gap-3">
                <Building className="w-10 h-10 opacity-30 text-slate-500" />
                <span>{showArchived ? 'No hay proyectos archivados' : 'No hay proyectos activos'}</span>
                {canManageProjects && !showArchived && (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => setFormOpen(true)}
                    className="mt-3"
                  >
                    <Plus className="w-3 h-3 mr-2" />
                    Crear su primer proyecto
                  </Button>
                )}
              </li>
            )}
          </ul>
        </Card>
      </div>

      {canManageProjects && <ProjectForm
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingProject(null);
        }}
        onSave={(values) =>
          editingProject
            ? onUpdateProject(editingProject.id, values)
            : onCreateProject(values)
        }
        editingProject={editingProject}
      />}
    </div>
  );
}
