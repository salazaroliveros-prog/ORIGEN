'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Project, FieldVisit, ExpenseRecord, AttendanceRecord, CompanySettings } from '@/lib/types';
import {
  subscribeProjects,
  subscribeFieldVisits,
  subscribeExpenses,
  subscribeAttendance,
  subscribeCompanySettings,
  saveProjectToFirestore,
  deleteProjectFromFirestore,
  saveCompanySettingsToFirestore,
  deleteExpensesByProject,
  deleteFieldVisitsByProject,
  deleteAttendanceByProject,
} from '@/lib/firebaseService';
import { validateProjectForm, getDefaultProjectValues, type ProjectFormValues } from '@/lib/validation/project.schema';
import { toast } from 'react-hot-toast';

export function useProjectData(currentUserId?: string) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [fieldVisits, setFieldVisits] = useState<FieldVisit[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUserId) return;

    const unsubProjects = subscribeProjects(currentUserId, setProjects);
    const unsubFieldVisits = subscribeFieldVisits(currentUserId, setFieldVisits);
    const unsubExpenses = subscribeExpenses(currentUserId, setExpenses);
    const unsubAttendance = subscribeAttendance(currentUserId, setAttendance);
    const unsubCompany = subscribeCompanySettings(currentUserId, setCompany);

    return () => {
      unsubProjects();
      unsubFieldVisits();
      unsubExpenses();
      unsubAttendance();
      unsubCompany();
    };
  }, [currentUserId]);

  const createProject = useCallback(
    async (data: ProjectFormValues) => {
      if (!currentUserId) {
        toast.error('Usuario no autenticado');
        return false;
      }

      const validation = validateProjectForm(data);
      if (!validation.success) {
        toast.error('Datos inválidos: ' + validation.error.issues.map(i => i.message).join(', '));
        return false;
      }

      setLoading(true);
      try {
        const projectId = `proj-${Date.now()}`;
        const project: Project = {
          ...validation.data,
          id: projectId,
          ownerId: currentUserId,
        };
        const success = await saveProjectToFirestore(project, currentUserId);
        if (success) {
          toast.success('Proyecto creado correctamente');
          return true;
        }
        toast.error('Error al crear el proyecto');
        return false;
      } catch (err) {
        toast.error('Error inesperado al crear el proyecto');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [currentUserId]
  );

  const updateProject = useCallback(
    async (projectId: string, data: Partial<ProjectFormValues>) => {
      if (!currentUserId) {
        toast.error('Usuario no autenticado');
        return false;
      }

      setLoading(true);
      try {
        const existing = projects.find(p => p.id === projectId);
        if (!existing) {
          toast.error('Proyecto no encontrado');
          return false;
        }

        const updated: Project = {
          ...existing,
          ...data,
          id: projectId,
          ownerId: currentUserId,
        };
        const success = await saveProjectToFirestore(updated, currentUserId);
        if (success) {
          toast.success('Proyecto actualizado correctamente');
          return true;
        }
        toast.error('Error al actualizar el proyecto');
        return false;
      } catch (err) {
        toast.error('Error inesperado al actualizar el proyecto');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [currentUserId, projects]
  );

  const deleteProject = useCallback(
    async (projectId: string) => {
      if (!currentUserId) {
        toast.error('Usuario no autenticado');
        return false;
      }

      if (!window.confirm('¿Está seguro de que desea eliminar este proyecto? Esta acción no se puede deshacer.')) {
        return false;
      }

      setLoading(true);
      try {
        const relatedRecordsDeleted = await Promise.all([
          deleteExpensesByProject(projectId, currentUserId),
          deleteFieldVisitsByProject(projectId, currentUserId),
          deleteAttendanceByProject(projectId, currentUserId),
        ]);

        if (relatedRecordsDeleted.some((deleted) => !deleted)) {
          toast.error('No se pudieron eliminar todos los registros. El proyecto se conserva.');
          return false;
        }

        const projectDeleted = await deleteProjectFromFirestore(projectId);
        if (!projectDeleted) {
          toast.error('No se pudo eliminar el proyecto');
          return false;
        }

        toast.success('Proyecto eliminado correctamente');
        return true;
      } catch (err) {
        toast.error('Error inesperado al eliminar el proyecto');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [currentUserId]
  );

  return {
    projects,
    fieldVisits,
    expenses,
    attendance,
    company,
    loading,
    createProject,
    updateProject,
    deleteProject,
    saveCompanySettings: (settings: CompanySettings) =>
      saveCompanySettingsToFirestore(settings, currentUserId || ''),
    getDefaultValues: () => getDefaultProjectValues(),
    validateForm: (data: unknown) => validateProjectForm(data),
  };
}
