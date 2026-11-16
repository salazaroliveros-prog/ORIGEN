'use client';

import React, { useMemo, useState, startTransition } from 'react';
import {
  Plus,
  Edit2,
  Archive,
  ArchiveRestore,
  Download,
  Calendar,
  Building,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { ProjectForm } from '@/components/ProjectForm';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Pagination } from '@/components/ui/Pagination';
import { ProjectPhotoDropzone } from '@/components/ProjectPhotoDropzone';
import { toast } from 'react-hot-toast';
import type { APUItem, CompanySettings, ExpenseRecord, Project, QuoteRecord } from '@/lib/types';
import { formatGTQ } from '@/lib/data';
import type { ProjectFormProject, ProjectFormValues } from '@/lib/validation/project.schema';

interface ProjectsViewProps {
  company?: CompanySettings;
  projects: Project[];
  expenses: ExpenseRecord[];
  budgetItems?: APUItem[];
  quotes?: QuoteRecord[];
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
  budgetItems = [],
  quotes = [],
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
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedProjectForPhotos, setSelectedProjectForPhotos] = useState<Project | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const visibleProjects = useMemo(
    () => projects.filter((project) => (project.status === 'Archivado') === showArchived),
    [projects, showArchived]
  );

  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return visibleProjects.slice(start, start + pageSize);
  }, [visibleProjects, currentPage, pageSize]);

  const projectSpentById = useMemo(
    () =>
      expenses.reduce((totals, expense) => {
        // Excluir rechazados: no consumen presupuesto (consistente con sumCountableExpenses).
        if (expense.approvalStatus === 'Rechazado') return totals;
        totals.set(expense.projectId, (totals.get(expense.projectId) ?? 0) + expense.amount);
        return totals;
      }, new Map<string, number>()),
    [expenses]
  );

  const projectApuById = useMemo(
    () =>
      budgetItems.reduce((totals, item) => {
        if (item.projectId) {
          totals.set(item.projectId, (totals.get(item.projectId) ?? 0) + item.totalPriceGTQ);
        }
        return totals;
      }, new Map<string, number>()),
    [budgetItems]
  );

  const projectQuoteById = useMemo(
    () =>
      quotes.reduce((totals, quote) => {
        if (quote.status === 'Rechazada') return totals;
        const qProjectId = quote.projectId ?? '';
        const current = totals.get(qProjectId) ?? { count: 0, totalGTQ: 0 };
        totals.set(qProjectId, {
          count: current.count + 1,
          totalGTQ: current.totalGTQ + quote.totalGTQ,
        });
        return totals;
      }, new Map<string, { count: number; totalGTQ: number }>()),
    [quotes]
  );

  const openEdit = (project: Project) => {
    const status = project.status;
    if (status === 'Archivado') return;
    startTransition(() => {
      setEditingProject({ ...project, status });
      setFormOpen(true);
    });
  };

  const openPhotoModal = (project: Project) => {
    startTransition(() => {
      setSelectedProjectForPhotos(project);
      setPhotoModalOpen(true);
    });
  };

  const handlePhotoUploaded = (
    photoUrl: string,
    metadata: { filename: string; uploadedAt: string; size: number }
  ) => {
    // Aquí podrías guardar la referencia de la foto en el proyecto
    // Por ahora solo mostramos un toast de éxito
    toast.success(`Foto guardada para ${selectedProjectForPhotos?.name}`);
  };

  const exportProjects = () => {
    const escapeCsv = (value: string | number) => {
      const text = String(value);
      const safeText = typeof value === 'string' && /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
      return `"${safeText.replace(/"/g, '""')}"`;
    };
    const rows = [
      [
        'Código',
        'Proyecto',
        'Cliente',
        'Estado',
        'Presupuesto (GTQ)',
        'APU (GTQ)',
        'Gasto (GTQ)',
        'Saldo (GTQ)',
        'Cotizaciones',
        'Pipeline (GTQ)',
        'Avance (%)',
      ],
      ...visibleProjects.map((project) => {
        const spent = projectSpentById.get(project.id) ?? project.spentTotal;
        const quoteSummary = projectQuoteById.get(project.id);
        return [
          project.code || project.id,
          project.name,
          project.client,
          project.status,
          project.budgetTotal,
          projectApuById.get(project.id) ?? 0,
          spent,
          (project.budgetTotal ?? 0) - spent,
          quoteSummary?.count ?? 0,
          quoteSummary?.totalGTQ ?? 0,
          project.progressPercent ?? 0,
        ];
      }),
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
      <div className="transition-container" style={{ transition: 'fade' }}>
        <div className="responsive-container safe-area-top safe-area-bottom flex min-h-full items-center justify-center">
          <div className="space-y-4 text-center">
            <Skeleton height="48px" width="160px" className="mx-auto" aria-hidden="true" />
            <Skeleton height="24px" width="200px" className="mx-auto" aria-hidden="true" />
            <Skeleton height="8px" width="100%" className="mx-auto w-1/2" aria-hidden="true" />
            <Skeleton height="8px" width="100%" className="mx-auto w-3/4" aria-hidden="true" />
          </div>
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
                <Plus className="h-4 w-4" aria-hidden="true" /> Nuevo Proyecto
              </Button>
            )}
            <Button
              variant="outline"
              size="md"
              onClick={exportProjects}
              aria-label="Exportar proyectos a CSV"
              title="Exportar proyectos a CSV"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4">
        <Card variant="elevated" padding="md">
          <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-brand-secondary" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-slate-300">Listado de Proyectos</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {showArchived ? 'Archivados' : 'Activos'}
              </span>
              <button
                type="button"
                onClick={() => setShowArchived((prev) => !prev)}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/[0.07]"
              >
                {showArchived ? 'Ver activos' : 'Ver archivados'}
              </button>
            </div>
          </div>

          {visibleProjects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
              <Building className="mx-auto h-8 w-8 text-slate-600" aria-hidden="true" />
              <p className="mt-2 text-sm text-slate-400">
                {showArchived ? 'No hay proyectos archivados.' : 'Aún no hay proyectos registrados.'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800/50">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-bold text-slate-400 uppercase border-b border-slate-700">Código</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-slate-400 uppercase border-b border-slate-700">Proyecto</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-slate-400 uppercase border-b border-slate-700">Cliente</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-slate-400 uppercase border-b border-slate-700">Estado</th>
                      <th className="text-right py-3 px-4 text-xs font-bold text-slate-400 uppercase border-b border-slate-700">Presupuesto</th>
                      <th className="text-right py-3 px-4 text-xs font-bold text-slate-400 uppercase border-b border-slate-700">Gasto</th>
                      <th className="text-center py-3 px-4 text-xs font-bold text-slate-400 uppercase border-b border-slate-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {paginatedProjects.map((project) => {
                      const spent = projectSpentById.get(project.id) ?? project.spentTotal;
                      const isArchived = project.status === 'Archivado';
                      return (
                        <tr key={project.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4 text-sm font-mono text-slate-200">{project.code || project.id}</td>
                          <td className="py-3 px-4 text-sm text-slate-200">
                            <div className="font-medium">{project.name}</div>
                            <div className="text-xs text-slate-500">{project.location}</div>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-200">{project.client}</td>
                          <td className="py-3 px-4 text-sm">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-slate-700/40 text-slate-200 border border-slate-600/30">
                              {project.status}
                            </span>
                          </td>
                          <td className="text-right py-3 px-4 text-sm font-mono text-slate-200">
                            {formatGTQ(project.budgetTotal)}
                          </td>
                          <td className="text-right py-3 px-4 text-sm font-mono text-slate-200">
                            {formatGTQ(spent)}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <div className="flex gap-1 justify-center">
                              {canManageProjects && !isArchived && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEdit(project)}
                                  className="text-xs p-2"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              )}
                              {canManageProjects && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void (isArchived ? onRestoreProject(project.id) : onArchiveProject(project.id))}
                                  className="text-xs p-2"
                                >
                                  {isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openPhotoModal(project)}
                                className="text-xs p-2"
                              >
                                <ImageIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Página {currentPage} de {Math.max(1, Math.ceil(visibleProjects.length / pageSize))}
                </span>
                <Pagination
                  currentPage={currentPage}
                  pageSize={pageSize}
                  totalItems={visibleProjects.length}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            </>
          )}
        </Card>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">
                {editingProject ? 'Editar Proyecto' : 'Nuevo Proyecto'}
              </h2>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/[0.05] hover:text-white"
                aria-label="Cerrar formulario"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <ProjectForm
              initialValues={editingProject ?? undefined}
              onSubmit={async (values) => {
                const ok = editingProject
                  ? await onUpdateProject(editingProject.id, values)
                  : await onCreateProject(values, onProjectCreated);
                if (ok) {
                  setFormOpen(false);
                  setEditingProject(null);
                  toast.success(editingProject ? 'Proyecto actualizado.' : 'Proyecto creado.');
                } else {
                  toast.error('No se pudo guardar el proyecto.');
                }
                return ok;
              }}
              onCancel={() => setFormOpen(false)}
              isSubmitting={false}
            />
          </div>
        </div>
      )}

      {photoModalOpen && selectedProjectForPhotos && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">
                Fotos de avance · {selectedProjectForPhotos.name}
              </h2>
              <button
                type="button"
                onClick={() => setPhotoModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/[0.05] hover:text-white"
                aria-label="Cerrar fotos"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <ProjectPhotoDropzone
              projectId={selectedProjectForPhotos.id}
              projectCode={selectedProjectForPhotos.code}
              onUpload={handlePhotoUploaded}
            />
          </div>
        </div>
      )}
    </div>
  );
}