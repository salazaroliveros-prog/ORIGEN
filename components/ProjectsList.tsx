/**
 * ORIGEN ERP - Projects List Component
 * Enhanced with sticky create button, delete confirmation, and sort preferences
 *
 * Features:
 * - Sticky create button (floating on mobile, static on desktop)
 * - Delete confirmation dialog with undo option
 * - Sort preference storage in localStorage
 * - Responsive table layout
 * - Real-time data updates
 * - Pagination support
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useProjectData } from '@/lib/hooks/useProjectDataEnhanced';
import { usePagination } from '@/lib/hooks/usePagination';
import {
  Plus,
  Trash2,
  Pencil,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader,
  ArrowUpDown,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from '@/components/ui/toast';

type SortBy = 'name' | 'budget' | 'date' | 'status';

interface DeleteConfirmation {
  projectId: string;
  projectName: string;
  show: boolean;
}

export function ProjectsList() {
  const { projects, loading, archiveProject } = useProjectData();
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmation>({
    projectId: '',
    projectName: '',
    show: false,
  });
  const [deleting, setDeleting] = useState<string | null>(null);

  // Pagination
  const {
    currentPage,
    itemsPerPage: pageSize,
    totalPages,
    paginatedItems,
    goToPage,
  } = usePagination(projects || [], { itemsPerPage: 10 });

  // FEATURE 2.3.3: Load sort preference from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('projectSort');
    if (saved && ['name', 'budget', 'date', 'status'].includes(saved)) {
      setSortBy(saved as SortBy);
    }
  }, []);

  // FEATURE 2.3.3: Sort and paginate projects with localStorage persistence
  const sortedProjects = useMemo(() => {
    if (!projects || projects.length === 0) return [];

    const sorted = [...projects];

    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name, 'es'));
        break;
      case 'budget':
        sorted.sort((a, b) => (b.budgetTotal || 0) - (a.budgetTotal || 0));
        break;
      case 'status':
        sorted.sort((a, b) => a.status.localeCompare(b.status, 'es'));
        break;
      case 'date':
      default:
        sorted.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
        break;
    }

    return sorted;
  }, [projects, sortBy]);

  // Handle sort change with localStorage persistence
  const handleSort = useCallback((field: SortBy) => {
    setSortBy(field);
    localStorage.setItem('projectSort', field);
  }, []);

  // FEATURE 2.2.2: Delete confirmation handler
  const handleDeleteClick = (projectId: string, projectName: string) => {
    setDeleteConfirm({
      projectId,
      projectName,
      show: true,
    });
  };

  const handleConfirmDelete = async () => {
    const { projectId } = deleteConfirm;

    try {
      setDeleting(projectId);

      // Archive instead of delete (soft delete)
      await archiveProject(projectId);

      toast.success('Proyecto archivado correctamente');
      setDeleteConfirm({ projectId: '', projectName: '', show: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al archivar proyecto';
      toast.error(message);
    } finally {
      setDeleting(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirm({ projectId: '', projectName: '', show: false });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Planificación':
        return 'bg-blue-100 text-blue-800';
      case 'En Ejecución':
        return 'bg-yellow-100 text-yellow-800';
      case 'Finalizado':
        return 'bg-green-100 text-green-800';
      case 'Archivado':
        return 'bg-slate-100 text-slate-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center gap-2 text-slate-600">
          <Loader className="h-5 w-5 animate-spin" />
          <span>Cargando proyectos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 bg-slate-50 p-6 pb-24 sm:pb-6">
      {/* Header - RESPONSIVE OPTIMIZED */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Proyectos</h1>
          <p className="mt-1 text-xs text-slate-600 sm:text-sm">
            Total: {projects?.length || 0} proyecto{projects?.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Sort Controls - RESPONSIVE OPTIMIZED */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => handleSort('date')}
          className={`flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold transition-all duration-200 sm:gap-2 sm:px-3 sm:text-sm ${
            sortBy === 'date'
              ? 'bg-blue-600 text-white shadow-md hover:shadow-lg'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:shadow-sm'
          }`}
          title={`Ordenar por fecha ${sortBy === 'date' ? '(activo)' : ''}`}
        >
          <ArrowUpDown className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="xs:inline hidden">Más recientes</span>
          <span className="xs:hidden inline">Fecha</span>
          {sortBy === 'date' && (
            <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-xs font-bold sm:ml-2 sm:h-5 sm:w-5">
              ✓
            </span>
          )}
        </button>
        <button
          onClick={() => handleSort('name')}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${
            sortBy === 'name'
              ? 'bg-blue-600 text-white shadow-md hover:shadow-lg'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:shadow-sm'
          }`}
        >
          Nombre
        </button>
        <button
          onClick={() => handleSort('budget')}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${
            sortBy === 'budget'
              ? 'bg-blue-600 text-white shadow-md hover:shadow-lg'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:shadow-sm'
          }`}
        >
          Mayor presupuesto
        </button>
        <button
          onClick={() => handleSort('status')}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${
            sortBy === 'status'
              ? 'bg-blue-600 text-white shadow-md hover:shadow-lg'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:shadow-sm'
          }`}
        >
          Estado
        </button>
      </div>

      {/* Projects Grid/List */}
      {sortedProjects.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-lg text-slate-600">No hay proyectos disponibles</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden sm:block">
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="p-4 text-left font-semibold text-slate-900">Nombre</th>
                    <th className="p-4 text-left font-semibold text-slate-900">Cliente</th>
                    <th className="p-4 text-right font-semibold text-slate-900">Presupuesto</th>
                    <th className="p-4 text-center font-semibold text-slate-900">Progreso</th>
                    <th className="p-4 text-center font-semibold text-slate-900">Estado</th>
                    <th className="p-4 text-center font-semibold text-slate-900">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((project) => (
                    <tr
                      key={project.id}
                      className="border-b transition-colors last:border-b-0 hover:bg-slate-50"
                    >
                      <td className="p-4">
                        <Link
                          href={`/projects/${project.id}`}
                          className="font-semibold text-blue-600 hover:text-blue-700"
                        >
                          {project.name}
                        </Link>
                        <p className="mt-1 text-xs text-slate-500">{project.code}</p>
                      </td>
                      <td className="p-4 text-slate-700">{project.client}</td>
                      <td className="p-4 text-right font-semibold text-slate-900">
                        Q{project.budgetTotal.toLocaleString()}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-3">
                          <div className="h-3 w-24 overflow-hidden rounded-full bg-slate-200 shadow-sm">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
                              style={{
                                width: `${Math.min(project.progressPercent || 0, 100)}%`,
                              }}
                            />
                          </div>
                          <span className="w-10 text-right text-xs font-semibold text-slate-700">
                            {project.progressPercent || 0}%
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(
                            project.status
                          )}`}
                        >
                          {project.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center gap-2">
                          <Link
                            href={`/projects/${project.id}/edit`}
                            className="rounded-lg p-2 text-blue-600 transition-all duration-200 hover:bg-blue-100 active:scale-95"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleDeleteClick(project.id, project.name)}
                            className="rounded-lg p-2 text-red-600 transition-all duration-200 hover:bg-red-100 active:scale-95"
                            title="Archivar"
                            disabled={deleting === project.id}
                          >
                            {deleting === project.id ? (
                              <Loader className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="space-y-3 sm:hidden">
            {paginatedItems.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block rounded-lg border border-slate-200 bg-white p-4 transition-all duration-200 hover:border-slate-300 hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">{project.name}</h3>
                    <p className="text-xs text-slate-500">{project.code}</p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(
                      project.status
                    )}`}
                  >
                    {project.status}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <p className="text-slate-600">
                    Cliente: <span className="font-semibold">{project.client}</span>
                  </p>
                  <p className="text-slate-600">
                    Presupuesto:{' '}
                    <span className="font-semibold">Q{project.budgetTotal.toLocaleString()}</span>
                  </p>

                  <div className="flex items-center gap-3">
                    <span className="text-slate-600">Progreso:</span>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200 shadow-sm">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                        style={{
                          width: `${Math.min(project.progressPercent || 0, 100)}%`,
                        }}
                      />
                    </div>
                    <span className="w-8 text-xs font-semibold text-slate-600">
                      {project.progressPercent || 0}%
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-2 border-t border-slate-200 pt-4">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleDeleteClick(project.id, project.name);
                    }}
                    className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-100"
                    disabled={deleting === project.id}
                  >
                    {deleting === project.id ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => goToPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="rounded-lg p-2 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex gap-1">
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i + 1}
                onClick={() => goToPage(i + 1)}
                className={`h-8 w-8 rounded-lg font-semibold transition-colors ${
                  currentPage === i + 1
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="rounded-lg p-2 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* FEATURE 2.2.1: Sticky Create Button (Mobile Floating) - FIXED: Added z-50, background, shadow */}
      <Link
        href="/projects?create=true"
        className="fixed bottom-20 right-4 z-50 sm:static sm:bottom-auto sm:right-auto sm:mt-6 sm:pt-4"
      >
        <button className="flex h-14 w-14 items-center justify-center gap-2 rounded-full bg-blue-600 font-semibold text-white shadow-lg transition-all duration-200 hover:bg-blue-700 hover:shadow-xl active:scale-95 sm:h-auto sm:w-auto sm:rounded-lg sm:px-6 sm:py-2 sm:shadow-sm sm:hover:shadow-md">
          <Plus className="h-6 w-6" />
          <span className="hidden sm:inline">Crear Proyecto</span>
        </button>
      </Link>

      {/* FEATURE 2.2.2: Delete Confirmation Dialog */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="mb-2 text-lg font-semibold text-slate-900">¿Archivar proyecto?</h3>
                <p className="mb-4 text-sm text-slate-600">
                  Vas a archivar &quot;{deleteConfirm.projectName}&quot;. Puedes restaurarlo después
                  si lo necesitas.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-6">
              <button
                onClick={handleCancelDelete}
                disabled={deleting !== null}
                className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting !== null}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    Archivando...
                  </>
                ) : (
                  'Archivar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectsList;
