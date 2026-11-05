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
  deleteEmployeeFromFirestore,
  deleteMachineryFromFirestore,
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
  updateProjectFields,
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
  resolveProjectProgress,
} from '@/lib/projectCalculations';
import { notifySyncEnd } from './useFirebaseSyncStatus';

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

  // Recalcular spentTotal cuando cambian los expenses (sin depender de projects para evitar loop)
  useEffect(() => {
    if (expenses.length === 0) return;

    setProjects((prev) => {
      let changed = false;
      const next = prev.map((project) => {
        const calculatedSpent = calculateProjectSpentById(expenses, project.id);
        if (calculatedSpent !== project.spentTotal) {
          changed = true;
          return { ...project, spentTotal: calculatedSpent };
        }
        return project;
      });
      return changed ? next : prev;
    });
  }, [expenses]);

  // Recalcular progressPercent solo cuando hay cronograma (tareas/hitos)
  useEffect(() => {
    setProjects((prev) => {
      let changed = false;
      const next = prev.map((project) => {
        const hasSchedule =
          (project.scheduleTasks?.length ?? 0) > 0 || (project.scheduleMilestones?.length ?? 0) > 0;
        if (!hasSchedule) return project; // conservar avance manual
        const calculatedProgress = resolveProjectProgress(
          project.scheduleTasks,
          project.scheduleMilestones,
          project.progressPercent
        );
        if (calculatedProgress !== project.progressPercent) {
          changed = true;
          return { ...project, progressPercent: calculatedProgress };
        }
        return project;
      });
      return changed ? next : prev;
    });
  }, []); // solo al montar; el cronograma vive dentro del proyecto y llega via subscribeProjects

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
          apuBudgetTotal: 0,
          apuBudgetVarianceGTQ: 0,
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
        notifySyncEnd();
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
        notifySyncEnd();
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
            code: project.code || 'ARCH',
            name: project.name || 'Proyecto Archivado',
            client: project.client || 'Cliente Desconocido',
            location: project.location || 'Ubicación No Especificada',
            municipality: project.municipality || 'Municipio',
            department: project.department || 'Departamento',
            budgetTotal: project.budgetTotal ?? 0,
            spentTotal: project.spentTotal ?? 0,
            progressPercent: project.progressPercent ?? 0,
            startDate: project.startDate || new Date().toISOString().split('T')[0],
            endDate: project.endDate || new Date().toISOString().split('T')[0],
            lat: project.lat ?? 14.6133,
            lng: project.lng ?? -90.4875,
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
        notifySyncEnd();
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
        notifySyncEnd();
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
        notifySyncEnd();
        const detail = err instanceof Error ? err.message : '';
        toast.error(
          detail ? `No se pudo guardar el gasto: ${detail}` : 'Error inesperado al guardar el gasto'
        );
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
        notifySyncEnd();
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
        notifySyncEnd();
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
        notifySyncEnd();
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
      if (!saved) {
        toast.error('No se pudo guardar el presupuesto APU.');
        return false;
      }
      // Merge batch with existing items to calculate correct total
      const projectItemsAfterSave = [
        ...apuItems.filter(
          (existing) => existing.projectId === projectId && !items.find((n) => n.id === existing.id)
        ),
        ...items,
      ];
      const newApuTotal = projectItemsAfterSave.reduce(
        (sum, item) => sum + (item.totalPriceGTQ ?? 0),
        0
      );
      const activeProject = projects.find((p) => p.id === projectId);
      const variance = (activeProject?.budgetTotal ?? 0) - newApuTotal;
      await updateProjectFields(projectId, {
        apuBudgetTotal: newApuTotal,
        apuBudgetVarianceGTQ: variance,
      });
      return true;
    },
    [apuItems, companyId, currentUserId, projects]
  );

  const deleteAPUItem = useCallback(
    async (itemId: string) => {
      if (!companyId || !currentUserId) {
        toast.error('Inicia sesión en una empresa para eliminar partidas APU.');
        return false;
      }
      const targetItem = apuItems.find(
        (item) => item.id === itemId && item.companyId === companyId
      );
      if (!targetItem) {
        toast.error('No se encontró la partida APU en esta empresa.');
        return false;
      }
      const deleted = await deleteAPUItemFromFirestore(itemId);
      if (!deleted) {
        toast.error('No se pudo eliminar la partida APU.');
        return false;
      }
      const projectId = targetItem.projectId;
      if (projectId) {
        const remainingItems = apuItems.filter(
          (item) => item.projectId === projectId && item.id !== itemId
        );
        const newApuTotal = remainingItems.reduce(
          (sum, item) => sum + (item.totalPriceGTQ ?? 0),
          0
        );
        const activeProject = projects.find((p) => p.id === projectId);
        const variance = (activeProject?.budgetTotal ?? 0) - newApuTotal;
        await updateProjectFields(projectId, {
          apuBudgetTotal: newApuTotal,
          apuBudgetVarianceGTQ: variance,
        });
      }
      return true;
    },
    [apuItems, companyId, currentUserId, projects]
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

  const deleteEmployee = useCallback(
    async (employeeId: string) => {
      if (!companyId || !currentUserId) {
        toast.error('Inicia sesión en una empresa para eliminar empleados.');
        return false;
      }
      const deleted = await deleteEmployeeFromFirestore(employeeId, companyId);
      if (deleted) toast.success('Empleado eliminado correctamente.');
      else toast.error('No se pudo eliminar el empleado.');
      return deleted;
    },
    [companyId, currentUserId]
  );

  const deleteMachinery = useCallback(
    async (machineryId: string) => {
      if (!companyId || !currentUserId) {
        toast.error('Inicia sesión en una empresa para eliminar maquinaria.');
        return false;
      }
      const deleted = await deleteMachineryFromFirestore(machineryId, companyId);
      if (deleted) toast.success('Maquinaria eliminada correctamente.');
      else toast.error('No se pudo eliminar la maquinaria.');
      return deleted;
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
    deleteEmployee,
    addQuote,
    updateQuoteStatus,
    saveAPUItems,
    deleteAPUItem,
    addMachinery,
    deleteMachinery,
    addMachineryLog,
    setMachineryStatus,
    saveCompanySettings: (settings: CompanySettings) =>
      companyId ? saveCompanySettingsToFirestore(settings, companyId) : Promise.resolve(false),
    getDefaultValues: () => getDefaultProjectValues(),
    validateForm: (data: unknown) => validateProjectForm(data),
  };
}
