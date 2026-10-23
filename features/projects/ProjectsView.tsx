'use client';

import React, { useState, useCallback } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { ProjectForm } from '@/components/ProjectForm';
import { useProjectData } from '@/lib/hooks/useProjectData';
import { useAuthSession } from '@/lib/hooks/useAuthSession';
import { toast } from 'react-hot-toast';
import type { ProjectFormProject } from '@/lib/validation/project.schema';

export function ProjectsView({ company }: { company?: any }) {
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
    async (values: any) => {
      const success = await createProject(values);
      if (success) setFormOpen(false);
    },
    [createProject]
  );

  const handleEdit = useCallback(
    async (values: any) => {
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

  const openEdit = (project: any) => {
    setEditingProject(project);
    setFormOpen(true);
  };

  return (
    <div className="responsive-container safe-area-top safe-area-bottom min-h-full">
      <PageHeader
        title="Proyectos y Firmas Digitales"
        subtitle={`Gestión de ${projects.length} proyectos con trazabilidad completa`}
        logoUrl={company?.logoUrl}
        companyName={company?.companyName}
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => {
                setEditingProject(null);
                setFormOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm hover:bg-amber-400 transition shadow-[0_0_20px_rgba(245,158,11,0.4)]"
            >
              <Plus className="w-4 h-4" /> Nuevo Proyecto
            </button>
            <button
              onClick={() => {
                toast('Función de exportación próxima');
              }}
              className="px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-slate-300 hover:bg-white/[0.1] transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {loading && (
        <div className="glass-panel p-8 flex flex-col items-center justify-center text-center">
          <Clock className="w-8 h-8 animate-spin text-amber-400 mb-3" />
          <p className="text-sm text-slate-300">Cargando proyectos...</p>
        </div>
      )}

      {!loading && (
        <div className="responsive-grid">
          <div className="glass-panel overflow-y-auto max-h-[70vh] lg:max-h-none">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
              <h3 className="text-sm font-semibold text-slate-300">Listado de Proyectos</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  {projects.length} registro{projects.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <ul className="space-y-2">
              {projects.map((p: any) => (
                <li key={p.id || p.code} className="glass-l1 p-4 rounded-xl border border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-3 hover:bg-white/5 transition">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-3 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-lg">
                        <span className="font-bold text-sm">{p.code?.charAt(0) || 'P'}</span>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-slate-200 truncate block">
                          {p.code || 'PRO-001'}
                        </span>
                        <span className="text-base font-bold text-white leading-tight">
                          {p.name || 'Proyecto sin nombre'}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 lg:mt-0">
                      {p.client || 'Sin cliente asignado'}
                      {p.municipality && p.department ? ` • ${p.municipality}, ${p.department}` : ''}
                    </p>
                  </div>

                  <div className="flex flex-col lg:flex-row gap-3 w-full lg:w-auto">
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
                      <button
                        onClick={() => openEdit(p)}
                        className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/10 transition"
                        title="Editar proyecto"
                        aria-label={`Editar ${p.name}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id || p.code)}
                        className="p-2 rounded-lg bg-white/[0.05] hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-slate-300 hover:text-red-300 transition"
                        title="Eliminar proyecto"
                        aria-label={`Eliminar ${p.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
              {projects.length === 0 && (
                <li className="glass-l1 p-8 rounded-xl text-center text-slate-400 text-sm flex flex-col items-center gap-3">
                  <Plus className="w-8 h-8 opacity-30" />
                  <span>No hay proyectos registrados</span>
                  <button
                    onClick={() => setFormOpen(true)}
                    className="text-amber-400 text-sm font-medium hover:text-amber-300 transition"
                  >
                    Crear su primer proyecto
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

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
