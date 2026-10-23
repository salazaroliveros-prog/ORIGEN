'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ProjectFormValues,
  ProjectFormProject,
  validateProjectForm,
  getDefaultProjectValues,
} from '@/lib/validation/project.schema';
import { toast } from 'react-hot-toast';

interface ProjectFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (values: ProjectFormValues) => Promise<void>;
  editingProject?: ProjectFormProject | null;
  className?: string;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({
  isOpen,
  onClose,
  onSave,
  editingProject,
  className = '',
}) => {
  const [formData, setFormData] = useState<ProjectFormValues>(getDefaultProjectValues());
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ProjectFormValues, string>>>({});

  useEffect(() => {
    if (isOpen && editingProject) {
      setFormData({
        code: editingProject.code,
        name: editingProject.name,
        client: editingProject.client,
        location: editingProject.location,
        municipality: editingProject.municipality,
        department: editingProject.department,
        budgetTotal: editingProject.budgetTotal,
        spentTotal: editingProject.spentTotal,
        progressPercent: editingProject.progressPercent,
        startDate: editingProject.startDate,
        endDate: editingProject.endDate,
        status: editingProject.status,
        lat: editingProject.lat,
        lng: editingProject.lng,
        expectedProfitMarginPercent: editingProject.expectedProfitMarginPercent,
      });
    } else if (isOpen && !editingProject) {
      setFormData(getDefaultProjectValues());
    }
    setErrors({});
  }, [isOpen, editingProject]);

  const handleChange = useCallback(
    (field: keyof ProjectFormValues, value: string | number) => {
      setFormData((prev) => ({ ...prev, [field]: value } as ProjectFormProject));
      if (errors[field]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    },
    [errors]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateProjectForm(formData);
    if (!validation.success) {
      const fieldErrors: Partial<Record<keyof ProjectFormValues, string>> = {};
      validation.error.issues.forEach((issue) => {
        const path = issue.path[0] as keyof ProjectFormValues;
        fieldErrors[path] = issue.message;
      });
      setErrors(fieldErrors);
      toast.error('Corrija los errores en el formulario');
      return;
    }

    setSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      toast.error('No se pudo guardar el proyecto');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-form-title"
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 ${className}`}
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-white/10 overflow-hidden flex flex-col">
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
            </div>
            <div>
              <h3 id="project-form-title" className="font-bold text-white text-lg">
                {editingProject ? 'Editar Proyecto' : 'Nuevo Proyecto'}
              </h3>
              <p className="text-xs text-slate-400">{editingProject ? 'Modifique los datos del proyecto' : 'Complete los datos para crear un nuevo proyecto'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition"
            aria-label="Cerrar formulario"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Código del Proyecto
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => handleChange('code', e.target.value)}
                placeholder="Ej: OBRA-2026-01"
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition bg-slate-50 border-slate-200 ${
                  errors.code ? 'border-red-500 focus:ring-red-500/50' : ''
                }`}
              />
              {errors.code && (
                <p className="text-[10px] text-red-500">{errors.code}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Nombre del Proyecto
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Ej: Torre Residencial Vista Hermosa"
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition bg-slate-50 border-slate-200 ${
                  errors.name ? 'border-red-500 focus:ring-red-500/50' : ''
                }`}
              />
              {errors.name && (
                <p className="text-[10px] text-red-500">{errors.name}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Cliente
            </label>
            <input
              type="text"
              value={formData.client}
              onChange={(e) => handleChange('client', e.target.value)}
              placeholder="Nombre del cliente o desarrollador"
              className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition bg-slate-50 border-slate-200 ${
                errors.client ? 'border-red-500 focus:ring-red-500/50' : ''
              }`}
            />
            {errors.client && (
              <p className="text-[10px] text-red-500">{errors.client}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Ubicación
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="Dirección completa"
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition bg-slate-50 border-slate-200 ${
                  errors.location ? 'border-red-500 focus:ring-red-500/50' : ''
                }`}
              />
              {errors.location && (
                <p className="text-[10px] text-red-500">{errors.location}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Municipio
              </label>
              <input
                type="text"
                value={formData.municipality}
                onChange={(e) => handleChange('municipality', e.target.value)}
                placeholder="Ej: Guatemala"
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition bg-slate-50 border-slate-200 ${
                  errors.municipality ? 'border-red-500 focus:ring-red-500/50' : ''
                }`}
              />
              {errors.municipality && (
                <p className="text-[10px] text-red-500">{errors.municipality}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Departamento
            </label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => handleChange('department', e.target.value)}
              placeholder="Ej: Guatemala"
              className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition bg-slate-50 border-slate-200 ${
                errors.department ? 'border-red-500 focus:ring-red-500/50' : ''
              }`}
            />
            {errors.department && (
              <p className="text-[10px] text-red-500">{errors.department}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Presupuesto Total (Q)
              </label>
              <input
                type="number"
                value={formData.budgetTotal}
                onChange={(e) => handleChange('budgetTotal', parseFloat(e.target.value) || 0)}
                placeholder="0"
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition bg-slate-50 border-slate-200 ${
                  errors.budgetTotal ? 'border-red-500 focus:ring-red-500/50' : ''
                }`}
              />
              {errors.budgetTotal && (
                <p className="text-[10px] text-red-500">{errors.budgetTotal}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Gasto Ejecutado (Q)
              </label>
              <input
                type="number"
                value={formData.spentTotal}
                onChange={(e) => handleChange('spentTotal', parseFloat(e.target.value) || 0)}
                placeholder="0"
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition bg-slate-50 border-slate-200 ${
                  errors.spentTotal ? 'border-red-500 focus:ring-red-500/50' : ''
                }`}
              />
              {errors.spentTotal && (
                <p className="text-[10px] text-red-500">{errors.spentTotal}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Avance (%)
              </label>
              <input
                type="number"
                value={formData.progressPercent}
                onChange={(e) => handleChange('progressPercent', parseFloat(e.target.value) || 0)}
                min="0"
                max="100"
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition bg-slate-50 border-slate-200 ${
                  errors.progressPercent ? 'border-red-500 focus:ring-red-500/50' : ''
                }`}
              />
              {errors.progressPercent && (
                <p className="text-[10px] text-red-500">{errors.progressPercent}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Fecha de Inicio
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition bg-slate-50 border-slate-200 ${
                  errors.startDate ? 'border-red-500 focus:ring-red-500/50' : ''
                }`}
              />
              {errors.startDate && (
                <p className="text-[10px] text-red-500">{errors.startDate}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Fecha de Finalización
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition bg-slate-50 border-slate-200 ${
                  errors.endDate ? 'border-red-500 focus:ring-red-500/50' : ''
                }`}
              />
              {errors.endDate && (
                <p className="text-[10px] text-red-500">{errors.endDate}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Estado del Proyecto
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value as ProjectFormValues['status'])}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition"
            >
              <option value="Planificación">Planificación</option>
              <option value="En Ejecución">En Ejecución</option>
              <option value="Suspendido">Suspendido</option>
              <option value="Finalizado">Finalizado</option>
            </select>
            {errors.status && (
              <p className="text-[10px] text-red-500">{errors.status}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Latitud
              </label>
              <input
                type="number"
                step="any"
                value={formData.lat}
                onChange={(e) => handleChange('lat', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition bg-slate-50 border-slate-200"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Longitud
              </label>
              <input
                type="number"
                step="any"
                value={formData.lng}
                onChange={(e) => handleChange('lng', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition bg-slate-50 border-slate-200"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Margen de Utilidad Esperado (%)
            </label>
            <input
              type="number"
              value={formData.expectedProfitMarginPercent ?? 15}
              onChange={(e) => handleChange('expectedProfitMarginPercent', parseFloat(e.target.value) || 15)}
              min="0"
              max="100"
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition bg-slate-50 border-slate-200"
            />
          </div>

          <div className="pt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-amber-500 hover:bg-amber-400 disabled:opacity-50 transition shadow-[0_0_20px_rgba(245,158,11,0.4)]`}
            >
              {submitting ? 'Guardando...' : editingProject ? 'Actualizar' : 'Crear Proyecto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
