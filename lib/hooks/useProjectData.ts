'use client';

import { useEffect, useState, useCallback } from 'react';
import type {
  Project,
  FieldVisit,
  ExpenseRecord,
  AttendanceRecord,
  CompanySettings,
  Employee,
  EmployeeDirectoryEntry,
  CompanyRole,
  Machinery,
  MachineryLog,
  QuoteRecord,
  APUItem,
} from '@/lib/types';
import {
  subscribeProjects,
  subscribeFieldVisits,
  subscribeExpenses,
  subscribeAttendance,
  subscribeEmployees,
  subscribeEmployeeDirectory,
  subscribeCompanySettings,
  saveProjectToFirestore,
  saveExpenseToFirestore,
  updateExpenseToFirestore,
  deleteExpenseFromFirestore,
  saveAttendanceToFirestore,
  deleteAttendanceFromFirestore,
  saveEmployeeToFirestore,
  saveCompanySettingsToFirestore,
  subscribeQuotes,
  subscribeAPUItems,
  saveAPUItemsToFirestore,
  deleteAPUItemFromFirestore,
  saveQuoteToFirestore,
  updateQuoteStatusInFirestore,
  subscribeMachinery,
  saveMachineryToFirestore,
  updateMachineryStatusInFirestore,
  subscribeMachineryLogs,
  recordMachineryUse,
} from '@/lib/firebaseService';
import {
  validateProjectForm,
  getDefaultProjectValues,
  type ProjectFormValues,
} from '@/lib/validation/project.schema';
import { toast } from 'react-hot-toast';
import {
  canReadAttendance,
  canReadEmployeeDirectory,
  canReadFullPersonnel,
} from '@/lib/permissions';
import {
  updateProjectWithCalculatedMetrics,
  calculateProjectSpentById,
  calculateProjectProgress,
} from '@/lib/projectCalculations';

export function useProjectData(companyId?: string, currentUserId?: string, role?: CompanyRole) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [fieldVisits, setFieldVisits] = useState<FieldVisit[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Array<Employee | EmployeeDirectoryEntry>>([]);
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [apuItems, setApuItems] = useState<APUItem[]>([]);
  const [apuItemsLoading, setApuItemsLoading] = useState(false);
  const [machinery, setMachinery] = useState<Machinery[]>([]);
  const [machineryLogs, setMachineryLogs] = useState<MachineryLog[]>([]);
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId || !currentUserId || !role) {
      setProjects([]);
      setFieldVisits([]);
      setExpenses([]);
      setAttendance([]);
      setEmployees([]);
      setQuotes([]);
      setApuItems([]);
      setApuItemsLoading(false);
      setMachinery([]);
      setMachineryLogs([]);
      setCompany(null);
      setLoading(false);
      return;
    }

    setProjects([]);
    setFieldVisits([]);
    setExpenses([]);
    setAttendance([]);
    setEmployees([]);
    setQuotes([]);
    setApuItems([]);
    setApuItemsLoading(true);
    setMachinery([]);
    setMachineryLogs([]);
    setCompany(null);
    setLoading(true);

    const unsubProjects = subscribeProjects(companyId, (nextProjects) => {
      setProjects(nextProjects);
      setLoading(false);
    });
    const unsubFieldVisits = subscribeFieldVisits(companyId, setFieldVisits);
    const unsubExpenses = subscribeExpenses(companyId, setExpenses);
    const unsubAttendance = canReadAttendance(role)
      ? subscribeAttendance(companyId, setAttendance)
      : () => setAttendance([]);
    const unsubEmployees = canReadFullPersonnel(role)
      ? subscribeEmployees(companyId, setEmployees)
      : canReadEmployeeDirectory(role)
        ? subscribeEmployeeDirectory(companyId, setEmployees)
        : () => setEmployees([]);
    const unsubCompany = subscribeCompanySettings(companyId, setCompany);
    const unsubQuotes = subscribeQuotes(companyId, setQuotes);
    const unsubAPUItems = subscribeAPUItems(companyId, (nextItems) => {
      setApuItems(nextItems);
      setApuItemsLoading(false);
    });
    const unsubMachinery = subscribeMachinery(companyId, setMachinery);
    const unsubMachineryLogs = subscribeMachineryLogs(companyId, setMachineryLogs);

    return () => {
      unsubProjects();
      unsubFieldVisits();
      unsubExpenses();
      unsubAttendance();
      unsubEmployees();
      unsubCompany();
      unsubQuotes();
      unsubAPUItems();
      unsubMachinery();
      unsubMachineryLogs();
    };
  }, [companyId, currentUserId, role]);

  // Recalcular automáticamente métricas de proyectos cuando cambian expenses o proyectos
  useEffect(() => {
    if (projects.length === 0) return;

    const updatedProjects = projects.map((project) => {
      const calculatedSpent = calculateProjectSpentById(expenses, project.id);

      // Solo actualizar si el gasto calculado es diferente al actual
      if (calculatedSpent !== project.spentTotal) {
        return {
          ...project,
          spentTotal: calculatedSpent,
        };
      }

      return project;
    });

    // Solo actualizar si hubo cambios
    const hasChanges = updatedProjects.some(
      (updated, index) => updated.spentTotal !== projects[index].spentTotal
    );

    if (hasChanges) {
      setProjects(updatedProjects);
    }
  }, [expenses, projects]);

  // Recalcular progreso automáticamente cuando cambian tareas/milestones
  useEffect(() => {
    if (projects.length === 0) return;

    const updatedProjects = projects.map((project) => {
      const calculatedProgress = calculateProjectProgress(
        project.scheduleTasks,
        project.scheduleMilestones
      );

      // Solo actualizar si el progreso calculado es diferente al actual
      if (calculatedProgress !== project.progressPercent) {
        return {
          ...project,
          progressPercent: calculatedProgress,
        };
      }

      return project;
    });

    // Solo actualizar si hubo cambios
    const hasChanges = updatedProjects.some(
      (updated, index) => updated.progressPercent !== projects[index].progressPercent
    );

    if (hasChanges) {
      setProjects(updatedProjects);
    }
  }, [projects]);

  const createProject = useCallback(
    async (data: ProjectFormValues, onCreated?: (projectId: string) => void) => {
      if (!companyId || !currentUserId) {
        toast.error('Usuario no autenticado');
        return false;
      }

      const validation = validateProjectForm(data);
      if (!validation.success) {
        toast.error('Datos inválidos: ' + validation.error.issues.map((i) => i.message).join(', '));
        return false;
      }

      setLoading(true);
      try {
        const projectId = `proj-${Date.now()}`;
        const project: Project = {
          ...validation.data,
          id: projectId,
          companyId,
          ownerId: currentUserId,
          createdBy: currentUserId,
        };
        const success = await saveProjectToFirestore(project, companyId, currentUserId);
        if (success) {
          onCreated?.(projectId);
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
    [companyId, currentUserId]
  );

  const updateProject = useCallback(
    async (projectId: string, data: Partial<ProjectFormValues>) => {
      if (!companyId || !currentUserId) {
        toast.error('Usuario no autenticado');
        return false;
      }

      setLoading(true);
      try {
        const existing = projects.find((p) => p.id === projectId);
        if (!existing) {
          toast.error('Proyecto no encontrado');
          return false;
        }

        const updated: Project = {
          ...existing,
          ...data,
          id: projectId,
          companyId,
          ownerId: currentUserId,
        };
        const success = await saveProjectToFirestore(updated, companyId, currentUserId);
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
    [companyId, currentUserId, projects]
  );

  const archiveProject = useCallback(
    async (projectId: string) => {
      if (!companyId || !currentUserId) {
        toast.error('Usuario no autenticado');
        return false;
      }
      const project = projects.find((item) => item.id === projectId);
      if (!project) {
        toast.error('No se encontró el proyecto que quieres archivar.');
        return false;
      }
      if (project.status === 'Archivado') {
        toast.error('Este proyecto ya está archivado.');
        return false;
      }
      setLoading(true);
      try {
        const archived = await saveProjectToFirestore(
          {
            ...project,
            status: 'Archivado',
            archivedAt: new Date().toISOString(),
            archivedFromStatus: project.status,
          },
          companyId,
          currentUserId
        );
        if (!archived) {
          toast.error('No se pudo archivar el proyecto. No se eliminó ningún dato relacionado.');
          return false;
        }
        toast.success('Proyecto archivado. Su historial y registros relacionados se conservaron.');
        return true;
      } catch (err) {
        console.error('No se pudo archivar el proyecto:', err);
        toast.error(
          'Error inesperado al archivar el proyecto. No se eliminó ningún dato relacionado.'
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    [companyId, currentUserId, projects]
  );

  const restoreProject = useCallback(
    async (projectId: string) => {
      if (!companyId || !currentUserId) {
        toast.error('Usuario no autenticado');
        return false;
      }
      const project = projects.find((item) => item.id === projectId);
      if (!project || project.status !== 'Archivado') {
        toast.error('No se encontró un proyecto archivado para restaurar.');
        return false;
      }
      setLoading(true);
      try {
        const restored = await saveProjectToFirestore(
          {
            ...project,
            status: project.archivedFromStatus ?? 'Planificación',
            archivedAt: null,
          },
          companyId,
          currentUserId
        );
        if (!restored) {
          toast.error('No se pudo restaurar el proyecto.');
          return false;
        }
        toast.success('Proyecto restaurado.');
        return true;
      } catch (error) {
        console.error('No se pudo restaurar el proyecto:', error);
        toast.error('Error inesperado al restaurar el proyecto.');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [companyId, currentUserId, projects]
  );

  const addExpense = useCallback(
    async (expense: ExpenseRecord) => {
      if (!companyId || !currentUserId) {
        toast.error('Usuario no autenticado');
        return false;
      }
      try {
        const ok = await saveExpenseToFirestore(expense, companyId, currentUserId);
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
    [companyId, currentUserId]
  );

  const deleteExpense = useCallback(
    async (expenseId: string) => {
      if (!companyId || !currentUserId) {
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
    [companyId, currentUserId]
  );

  const updateExpense = useCallback(
    async (expense: ExpenseRecord) => {
      if (!companyId || !currentUserId) {
        toast.error('Usuario no autenticado');
        return false;
      }
      try {
        const ok = await updateExpenseToFirestore(expense, companyId, currentUserId);
        if (ok) {
          toast.success('Gasto actualizado correctamente');
          return true;
        }
        toast.error('Error al actualizar el gasto');
        return false;
      } catch (err) {
        toast.error('Error inesperado al actualizar el gasto');
        return false;
      }
    },
    [companyId, currentUserId]
  );

  const addAttendance = useCallback(
    async (record: AttendanceRecord) => {
      if (!companyId || !currentUserId) {
        toast.error('Usuario no autenticado');
        return false;
      }
      try {
        const saved = await saveAttendanceToFirestore(record, companyId, currentUserId);
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
    [companyId, currentUserId]
  );

  const deleteAttendance = useCallback(
    async (attendanceId: string) => {
      if (!companyId || !currentUserId) {
        toast.error('Inicia sesión para eliminar un registro de asistencia.');
        return false;
      }
      if (!attendance.some((record) => record.id === attendanceId)) {
        toast.error('No se encontró el registro de asistencia.');
        return false;
      }
      if (!window.confirm('¿Eliminar este registro de asistencia?')) return false;

      const deleted = await deleteAttendanceFromFirestore(attendanceId);
      if (deleted) toast.success('Registro de asistencia eliminado.');
      else toast.error('No se pudo eliminar el registro de asistencia.');
      return deleted;
    },
    [attendance, companyId, currentUserId]
  );

  const addEmployee = useCallback(
    async (employee: Employee) => {
      if (!companyId || !currentUserId) {
        toast.error('Inicia sesión para guardar empleados.');
        return false;
      }

      const saved = await saveEmployeeToFirestore(employee, companyId, currentUserId);
      if (!saved) {
        toast.error('No se pudo guardar el empleado.');
        return false;
      }

      toast.success('Empleado registrado correctamente.');
      return true;
    },
    [companyId, currentUserId]
  );

  const addQuote = useCallback(
    async (quote: QuoteRecord) => {
      if (!companyId || !currentUserId) {
        toast.error('Inicia sesión en una empresa para guardar cotizaciones.');
        return false;
      }
      const saved = await saveQuoteToFirestore(quote, companyId, currentUserId);
      if (!saved) toast.error('No se pudo guardar la cotización.');
      return saved;
    },
    [companyId, currentUserId]
  );

  const updateQuoteStatus = useCallback(
    async (quoteId: string, status: QuoteRecord['status']) => {
      if (!companyId || !currentUserId) {
        toast.error('Inicia sesión en una empresa para actualizar cotizaciones.');
        return false;
      }
      const quote = quotes.find((item) => item.id === quoteId);
      if (!quote) {
        toast.error('No se encontró la cotización.');
        return false;
      }
      const saved = await updateQuoteStatusInFirestore(quote, status, companyId, currentUserId);
      if (!saved) toast.error('No se pudo actualizar el estado de la cotización.');
      return saved;
    },
    [companyId, currentUserId, quotes]
  );

  const saveAPUItems = useCallback(
    async (items: APUItem[], projectId: string) => {
      if (!companyId || !currentUserId) {
        toast.error('Inicia sesión en una empresa para guardar el presupuesto APU.');
        return false;
      }
      if (!projectId || !projects.some((project) => project.id === projectId)) {
        toast.error('Selecciona un proyecto válido para guardar las partidas APU.');
        return false;
      }
      const saved = await saveAPUItemsToFirestore(items, projectId, companyId, currentUserId);
      if (!saved) toast.error('No se pudo guardar el presupuesto APU.');
      return saved;
    },
    [companyId, currentUserId, projects]
  );

  const deleteAPUItem = useCallback(
    async (itemId: string) => {
      if (!companyId || !currentUserId) {
        toast.error('Inicia sesión en una empresa para eliminar partidas APU.');
        return false;
      }
      if (!apuItems.some((item) => item.id === itemId && item.companyId === companyId)) {
        toast.error('No se encontró la partida APU en esta empresa.');
        return false;
      }
      const deleted = await deleteAPUItemFromFirestore(itemId);
      if (!deleted) toast.error('No se pudo eliminar la partida APU.');
      return deleted;
    },
    [apuItems, companyId, currentUserId]
  );

  const addMachinery = useCallback(
    async (item: Machinery) => {
      if (!companyId || !currentUserId) {
        toast.error('Inicia sesión en una empresa para registrar maquinaria.');
        return false;
      }
      const saved = await saveMachineryToFirestore(item, companyId, currentUserId);
      if (!saved) toast.error('No se pudo guardar la maquinaria.');
      return saved;
    },
    [companyId, currentUserId]
  );

  const addMachineryLog = useCallback(
    async (log: MachineryLog) => {
      if (!companyId || !currentUserId) {
        toast.error('Inicia sesión en una empresa para registrar horas de maquinaria.');
        return false;
      }
      const equipment = machinery.find((item) => item.id === log.machineryId);
      if (!equipment) {
        toast.error('No se encontró la maquinaria seleccionada.');
        return false;
      }
      const saved = await recordMachineryUse(log, equipment, companyId, currentUserId);
      if (!saved) toast.error('No se pudo registrar el uso y costo de maquinaria.');
      return saved;
    },
    [companyId, currentUserId, machinery]
  );

  const setMachineryStatus = useCallback(
    async (machineryId: string, status: Machinery['status']) => {
      if (!companyId || !currentUserId) {
        toast.error('Inicia sesión en una empresa para actualizar maquinaria.');
        return false;
      }
      const equipment = machinery.find((item) => item.id === machineryId);
      if (!equipment) {
        toast.error('No se encontró la maquinaria seleccionada.');
        return false;
      }
      const saved = await updateMachineryStatusInFirestore(
        equipment,
        status,
        companyId,
        currentUserId
      );
      if (!saved) toast.error('No se pudo actualizar el estado de la maquinaria.');
      return saved;
    },
    [companyId, currentUserId, machinery]
  );

  return {
    projects,
    fieldVisits,
    expenses,
    attendance,
    employees,
    quotes,
    apuItems,
    apuItemsLoading,
    machinery,
    machineryLogs,
    company,
    loading,
    createProject,
    updateProject,
    archiveProject,
    restoreProject,
    addExpense,
    updateExpense,
    deleteExpense,
    addAttendance,
    deleteAttendance,
    addEmployee,
    addQuote,
    updateQuoteStatus,
    saveAPUItems,
    deleteAPUItem,
    addMachinery,
    addMachineryLog,
    setMachineryStatus,
    saveCompanySettings: (settings: CompanySettings) =>
      companyId ? saveCompanySettingsToFirestore(settings, companyId) : Promise.resolve(false),
    getDefaultValues: () => getDefaultProjectValues(),
    validateForm: (data: unknown) => validateProjectForm(data),
  };
}
