'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ProjectFormValues,
  ProjectFormProject,
  validateProjectForm,
  getDefaultProjectValues,
} from '@/lib/validation/project.schema';
import { toast } from 'react-hot-toast';
import { FocusTrap } from '@/components/a11y/FocusTrap';

interface ProjectFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (values: ProjectFormValues) => Promise<boolean>;
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
      const saved = await onSave(validation.data);
      if (saved) onClose();
    } catch (err) {
      console.error('No se pudo guardar el proyecto:', err);
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
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 backdrop-blur-sm p-4 ${className}`}
    >
      <FocusTrap onEscape={onClose}>
        <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[calc(100dvh-2rem)] border border-white/10 overflow-hidden flex flex-col">
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

          <form onSubmit={handleSubmit} className="min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 text-slate-900 [&_input::placeholder]:text-slate-600">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="project-code" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Código del Proyecto
                </label>
                <input
                  id="project-code"
                  type="text"
                  aria-invalid={Boolean(errors.code)}
                  aria-describedby={errors.code ? 'project-code-error' : undefined}
                  value={formData.code}
                  onChange={(e) => handleChange('code', e.target.value)}
                  placeholder="Ej: OBRA-2026-01"
                  className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition bg-slate-50 border-slate-200 ${
                    errors.code ? 'border-red-500 focus:ring-red-500/50' : ''
                  }`}
                />
                {errors.code && (
                  <p id="project-code-error" className="text-xs text-red-700">{errors.code}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="project-name" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Nombre del Proyecto
                </label>
                <input
                  id="project-name"
                  type="text"
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? 'project-name-error' : undefined}
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Ej: Torre Residencial Vista Hermosa"
                  className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition bg-slate-50 border-slate-200 ${
                    errors.name ? 'border-red-500 focus:ring-red-500/50' : ''
                  }`}
                />
                {errors.name && (
                  <p id="project-name-error" className="text-xs text-red-700">{errors.name}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="project-client" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Cliente
              </label>
              <input
                id="project-client"
                type="text"
                aria-invalid={Boolean(errors.client)}
                aria-describedby={errors.client ? 'project-client-error' : undefined}
                value={formData.client}
                onChange={(e) => handleChange('client', e.target.value)}
                placeholder="Nombre del cliente o desarrollador"
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition bg-slate-50 border-slate-200 ${
                  errors.client ? 'border-red-500 focus:ring-red-500/50' : ''
                }`}
              />
              {errors.client && (
                <p id="project-client-error" className="text-xs text-red-700">{errors.client}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="project-location" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Ubicación
                </label>
                <input
                  id="project-location"
                  type="text"
                  aria-invalid={Boolean(errors.location)}
                  aria-describedby={errors.location ? 'project-location-error' : undefined}
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder="Dirección completa"
                  className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition bg-slate-50 border-slate-200 ${
                    errors.location ? 'border-red-500 focus:ring-red-500/50' : ''
                  }`}
                />
                {errors.location && (
                  <p id="project-location-error" className="text-xs text-red-700">{errors.location}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="project-municipality" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Municipio
                </label>
                <input
                  id="project-municipality"
                  type="text"
                  aria-invalid={Boolean(errors.municipality)}
                  aria-describedby={errors.municipality ? 'project-municipality-error' : undefined}
                  value={formData.municipality}
                  onChange={(e) => handleChange('municipality', e.target.value)}
                  placeholder="Ej: Guatemala"
                  className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition bg-slate-50 border-slate-200 ${
                    errors.municipality ? 'border-red-500 focus:ring-red-500/50' : ''
                  }`}
                />
                {errors.municipality && (
                  <p id="project-municipality-error" className="text-xs text-red-700">{errors.municipality}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="project-department" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Departamento
              </label>
              <input
                id="project-department"
                type="text"
                aria-invalid={Boolean(errors.department)}
                aria-describedby={errors.department ? 'project-department-error' : undefined}
                value={formData.department}
                onChange={(e) => handleChange('department', e.target.value)}
                placeholder="Ej: Guatemala"
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition bg-slate-50 border-slate-200 ${
                  errors.department ? 'border-red-500 focus:ring-red-500/50' : ''
                }`}
              />
              {errors.department && (
                <p id="project-department-error" className="text-xs text-red-700">{errors.department}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label htmlFor="project-budget-total" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Presupuesto Total (Q)
                </label>
                <input
                  id="project-budget-total"
                  type="number"
                  aria-invalid={Boolean(errors.budgetTotal)}
                  aria-describedby={errors.budgetTotal ? 'project-budget-total-error' : undefined}
                  value={formData.budgetTotal}
                  onChange={(e) => handleChange('budgetTotal', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition bg-slate-50 border-slate-200 ${
                    errors.budgetTotal ? 'border-red-500 focus:ring-red-500/50' : ''
                  }`}
                />
                {errors.budgetTotal && (
                  <p id="project-budget-total-error" className="text-xs text-red-700">{errors.budgetTotal}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="project-spent-total" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Gasto Ejecutado (Q)
                </label>
                <input
                  id="project-spent-total"
                  type="number"
                  aria-invalid={Boolean(errors.spentTotal)}
                  aria-describedby={errors.spentTotal ? 'project-spent-total-error' : undefined}
                  value={formData.spentTotal}
                  onChange={(e) => handleChange('spentTotal', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition bg-slate-50 border-slate-200 ${
                    errors.spentTotal ? 'border-red-500 focus:ring-red-500/50' : ''
                  }`}
                />
                {errors.spentTotal && (
                  <p id="project-spent-total-error" className="text-xs text-red-700">{errors.spentTotal}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="project-progress" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Avance (%)
                </label>
                <input
                  id="project-progress"
                  type="number"
                  aria-invalid={Boolean(errors.progressPercent)}
                  aria-describedby={errors.progressPercent ? 'project-progress-error' : undefined}
                  value={formData.progressPercent}
                  onChange={(e) => handleChange('progressPercent', parseFloat(e.target.value) || 0)}
                  min="0"
                  max="100"
                  className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition bg-slate-50 border-slate-200 ${
                    errors.progressPercent ? 'border-red-500 focus:ring-red-500/50' : ''
                  }`}
                />
                {errors.progressPercent && (
                  <p id="project-progress-error" className="text-xs text-red-700">{errors.progressPercent}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="project-start-date" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Fecha de Inicio
                </label>
                <input
                  id="project-start-date"
                  type="date"
                  aria-invalid={Boolean(errors.startDate)}
                  aria-describedby={errors.startDate ? 'project-start-date-error' : undefined}
                  value={formData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition bg-slate-50 border-slate-200 ${
                    errors.startDate ? 'border-red-500 focus:ring-red-500/50' : ''
                  }`}
                />
                {errors.startDate && (
                  <p id="project-start-date-error" className="text-xs text-red-700">{errors.startDate}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="project-end-date" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Fecha de Finalización
                </label>
                <input
                  id="project-end-date"
                  type="date"
                  aria-invalid={Boolean(errors.endDate)}
                  aria-describedby={errors.endDate ? 'project-end-date-error' : undefined}
                  value={formData.endDate}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition bg-slate-50 border-slate-200 ${
                    errors.endDate ? 'border-red-500 focus:ring-red-500/50' : ''
                  }`}
                />
                {errors.endDate && (
                  <p id="project-end-date-error" className="text-xs text-red-700">{errors.endDate}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="project-status" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Estado del Proyecto
              </label>
              <select
                id="project-status"
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
                <label htmlFor="project-latitude" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Latitud
                </label>
                <input
                  id="project-latitude"
                  type="number"
                  step="any"
                  value={formData.lat}
                  onChange={(e) => handleChange('lat', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition bg-slate-50 border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="project-longitude" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Longitud
                </label>
                <input
                  id="project-longitude"
                  type="number"
                  step="any"
                  value={formData.lng}
                  onChange={(e) => handleChange('lng', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition bg-slate-50 border-slate-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="project-profit-margin" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Margen de Utilidad Esperado (%)
              </label>
              <input
                id="project-profit-margin"
                type="number"
                value={formData.expectedProfitMarginPercent ?? 15}
                onChange={(e) => handleChange('expectedProfitMarginPercent', parseFloat(e.target.value) || 15)}
                min="0"
                max="100"
                className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition bg-slate-50 border-slate-200"
              />
            </div>

            <div className="pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="min-h-11 px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 transition shadow-[0_0_20px_rgba(245,158,11,0.4)]"
              >
                {submitting ? 'Guardando...' : editingProject ? 'Actualizar' : 'Crear Proyecto'}
              </button>
            </div>
          </form>
        </div>
      </FocusTrap>
    </div>
  );
};
