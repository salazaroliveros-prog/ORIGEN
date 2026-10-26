'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Project, FieldVisit, ExpenseRecord, AttendanceRecord, CompanySettings, Employee } from '@/lib/types';
import { initialEmployees } from '@/lib/data';
import {
  subscribeProjects,
  subscribeFieldVisits,
  subscribeExpenses,
  subscribeAttendance,
  subscribeEmployees,
  subscribeCompanySettings,
  saveProjectToFirestore,
  deleteProjectFromFirestore,
  saveExpenseToFirestore,
  deleteExpenseFromFirestore,
  saveAttendanceToFirestore,
  saveEmployeeToFirestore,
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
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUserId) {
      setProjects([]);
      setFieldVisits([]);
      setExpenses([]);
      setAttendance([]);
      setEmployees(initialEmployees);
      setCompany(null);
      setLoading(false);
      return;
    }

    setProjects([]);
    setFieldVisits([]);
    setExpenses([]);
    setAttendance([]);
    setEmployees(initialEmployees);
    setCompany(null);
    setLoading(true);

    const unsubProjects = subscribeProjects(currentUserId, (nextProjects) => {
      setProjects(nextProjects);
      setLoading(false);
    });
    const unsubFieldVisits = subscribeFieldVisits(currentUserId, setFieldVisits);
    const unsubExpenses = subscribeExpenses(currentUserId, setExpenses);
    const unsubAttendance = subscribeAttendance(currentUserId, setAttendance);
    const unsubEmployees = subscribeEmployees(currentUserId, (customEmployees) =>
      setEmployees([...initialEmployees, ...customEmployees])
    );
    const unsubCompany = subscribeCompanySettings(currentUserId, setCompany);

    return () => {
      unsubProjects();
      unsubFieldVisits();
      unsubExpenses();
      unsubAttendance();
      unsubEmployees();
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

  const addExpense = useCallback(
    async (expense: ExpenseRecord) => {
      if (!currentUserId) {
        toast.error('Usuario no autenticado');
        return false;
      }
      try {
        const ok = await saveExpenseToFirestore(expense, currentUserId);
        if (ok) {
          toast.success('Gasto registrado correctamente');
          return true;
        }
        toast.error('Error al guardar el gasto');
        return false;
      } catch (err) {
        toast.error('Error inesperado al guardar el gasto');
        return false;
      }
    },
    [currentUserId]
  );

  const deleteExpense = useCallback(
    async (expenseId: string) => {
      if (!currentUserId) {
        toast.error('Usuario no autenticado');
        return false;
      }
      try {
        const ok = await deleteExpenseFromFirestore(expenseId);
        if (ok) {
          toast.success('Gasto eliminado correctamente');
          return true;
        }
        toast.error('Error al eliminar el gasto');
        return false;
      } catch (err) {
        toast.error('Error inesperado al eliminar el gasto');
        return false;
      }
    },
    [currentUserId]
  );

  const addAttendance = useCallback(
    async (record: AttendanceRecord) => {
      if (!currentUserId) {
        toast.error('Usuario no autenticado');
        return false;
      }
      try {
        const saved = await saveAttendanceToFirestore(record, currentUserId);
        if (saved) {
          toast.success('Asistencia registrada correctamente');
          return true;
        }
        toast.error('No se pudo guardar la asistencia');
        return false;
      } catch (err) {
        toast.error('Error inesperado al guardar la asistencia');
        return false;
      }
    },
    [currentUserId]
  );

  const addEmployee = useCallback(
    async (employee: Employee) => {
      if (!currentUserId) {
        toast.error('Inicia sesión para guardar empleados.');
        return false;
      }

      const saved = await saveEmployeeToFirestore(employee, currentUserId);
      if (!saved) {
        toast.error('No se pudo guardar el empleado.');
        return false;
      }

      toast.success('Empleado registrado correctamente.');
      return true;
    },
    [currentUserId]
  );

  return {
    projects,
    fieldVisits,
    expenses,
    attendance,
    employees,
    company,
    loading,
    createProject,
    updateProject,
    deleteProject,
    addExpense,
    deleteExpense,
    addAttendance,
    addEmployee,
    saveCompanySettings: (settings: CompanySettings) =>
      saveCompanySettingsToFirestore(settings, currentUserId || ''),
    getDefaultValues: () => getDefaultProjectValues(),
    validateForm: (data: unknown) => validateProjectForm(data),
  };
}
