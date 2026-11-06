'use client';

/**
 * Enhanced useProjectData Hook with Caching & Logging
 * Integration of calculations, caching, and logging utilities
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
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
  resolveProjectProgress,
} from '@/lib/projectCalculations';
import { notifySyncEnd } from './useFirebaseSyncStatus';

// Import new utilities
import { createLogger } from '@/lib/utils/logger';
import { queryCache, createCacheKey } from '@/lib/utils/cacheManager';
import { validateAPUItem, calculateBudgetSummary } from '@/lib/utils/calculations';
import { validateData, validationSchemas } from '@/lib/utils/validation';

// Create module logger
const log = createLogger('useProjectData');

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

  // ========== BUDGET SUMMARY MEMOIZATION ==========
  const budgetSummary = useMemo(() => {
    if (apuItems.length === 0 && expenses.length === 0) {
      return {
        budgetTotal: 0,
        spentTotal: 0,
        remaining: 0,
        utilization: 0,
        variance: 0,
      };
    }

    try {
      return calculateBudgetSummary(
        apuItems,
        expenses.reduce((sum, exp) => sum + exp.amount, 0)
      );
    } catch (error) {
      log.error('Budget summary calculation failed', error as Error, {
        apuItemsCount: apuItems.length,
        expensesCount: expenses.length,
      });
      return {
        budgetTotal: 0,
        spentTotal: 0,
        remaining: 0,
        utilization: 0,
        variance: 0,
      };
    }
  }, [apuItems, expenses]);

  // ========== CACHED SUBSCRIPTIONS ==========
  useEffect(() => {
    if (!companyId || !currentUserId || !role) {
      log.debug('Missing auth context, clearing data');
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

    log.info('Starting data subscriptions', { companyId, role });

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
      log.debug('Projects updated', { count: nextProjects.length });
      // Cache projects
      const cacheKey = createCacheKey('projects', { companyId });
      queryCache.set(cacheKey, nextProjects, 5 * 60 * 1000);
      setProjects(nextProjects);
      setLoading(false);
    });

    const unsubFieldVisits = subscribeFieldVisits(companyId, (data) => {
      log.debug('Field visits updated', { count: data.length });
      const cacheKey = createCacheKey('fieldVisits', { companyId });
      queryCache.set(cacheKey, data, 5 * 60 * 1000);
      setFieldVisits(data);
    });

    const unsubExpenses = subscribeExpenses(companyId, (data) => {
      log.debug('Expenses updated', { count: data.length });
      const cacheKey = createCacheKey('expenses', { companyId });
      queryCache.set(cacheKey, data, 5 * 60 * 1000);
      setExpenses(data);
    });

    const unsubAttendance = canReadAttendance(role)
      ? subscribeAttendance(companyId, (data) => {
          log.debug('Attendance updated', { count: data.length });
          const cacheKey = createCacheKey('attendance', { companyId });
          queryCache.set(cacheKey, data, 5 * 60 * 1000);
          setAttendance(data);
        })
      : () => setAttendance([]);

    const unsubEmployees = canReadFullPersonnel(role)
      ? subscribeEmployees(companyId, (data) => {
          log.debug('Employees updated', { count: data.length });
          const cacheKey = createCacheKey('employees', { companyId });
          queryCache.set(cacheKey, data, 5 * 60 * 1000);
          setEmployees(data);
        })
      : canReadEmployeeDirectory(role)
        ? subscribeEmployeeDirectory(companyId, (data) => {
            log.debug('Employee directory updated', { count: data.length });
            setEmployees(data);
          })
        : () => setEmployees([]);

    const unsubCompany = subscribeCompanySettings(companyId, (data) => {
      log.debug('Company settings updated', { companyId });
      const cacheKey = createCacheKey('companySettings', { companyId });
      queryCache.set(cacheKey, data, 10 * 60 * 1000);
      setCompany(data);
    });

    const unsubQuotes = subscribeQuotes(companyId, (data) => {
      log.debug('Quotes updated', { count: data.length });
      const cacheKey = createCacheKey('quotes', { companyId });
      queryCache.set(cacheKey, data, 5 * 60 * 1000);
      setQuotes(data);
    });

    const unsubAPUItems = subscribeAPUItems(companyId, (nextItems) => {
      log.debug('APU items updated', { count: nextItems.length });
      const cacheKey = createCacheKey('apuItems', { companyId });
      queryCache.set(cacheKey, nextItems, 5 * 60 * 1000);
      setApuItems(nextItems);
      setApuItemsLoading(false);
    });

    const unsubMachinery = subscribeMachinery(companyId, (data) => {
      log.debug('Machinery updated', { count: data.length });
      const cacheKey = createCacheKey('machinery', { companyId });
      queryCache.set(cacheKey, data, 5 * 60 * 1000);
      setMachinery(data);
    });

    const unsubMachineryLogs = subscribeMachineryLogs(companyId, (data) => {
      log.debug('Machinery logs updated', { count: data.length });
      setMachineryLogs(data);
    });

    return () => {
      log.info('Unsubscribing from data streams');
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

  // ========== AUTO-CALCULATION: PROJECT SPENT ==========
  useEffect(() => {
    if (projects.length === 0) return;

    const updatedProjects = projects.map((project) => {
      const calculatedSpent = calculateProjectSpentById(expenses, project.id);

      if (calculatedSpent !== project.spentTotal) {
        log.debug('Project spent updated', {
          projectId: project.id,
          oldSpent: project.spentTotal,
          newSpent: calculatedSpent,
        });
        return {
          ...project,
          spentTotal: calculatedSpent,
        };
      }

      return project;
    });

    const hasChanges = updatedProjects.some(
      (updated, index) => updated.spentTotal !== projects[index].spentTotal
    );

    if (hasChanges) {
      setProjects(updatedProjects);
    }
  }, [expenses, projects]);

  // ========== AUTO-CALCULATION: PROJECT PROGRESS ==========
  useEffect(() => {
    if (projects.length === 0) return;

    const updatedProjects = projects.map((project) => {
      const calculatedProgress = resolveProjectProgress(
        project.scheduleTasks,
        project.scheduleMilestones,
        project.progressPercent
      );

      if (calculatedProgress !== project.progressPercent) {
        log.debug('Project progress updated', {
          projectId: project.id,
          oldProgress: project.progressPercent,
          newProgress: calculatedProgress,
        });
        return {
          ...project,
          progressPercent: calculatedProgress,
        };
      }

      return project;
    });

    const hasChanges = updatedProjects.some(
      (updated, index) => updated.progressPercent !== projects[index].progressPercent
    );

    if (hasChanges) {
      setProjects(updatedProjects);
    }
  }, [projects]);

  // ========== PROJECT CREATION ==========
  const createProject = useCallback(
    async (data: ProjectFormValues, onCreated?: (projectId: string) => void) => {
      if (!companyId || !currentUserId) {
        log.warn('Project creation attempted without auth');
        toast.error('Usuario no autenticado');
        return false;
      }

      const validation = validateProjectForm(data);
      if (!validation.success) {
        log.warn('Project validation failed', {
          errors: validation.error.issues.map((i) => i.message),
        });
        toast.error('Datos inválidos: ' + validation.error.issues.map((i) => i.message).join(', '));
        return false;
      }

      setLoading(true);
      try {
        log.info('Creating project', { companyId });
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
          log.info('Project created successfully', { projectId, companyId });
          onCreated?.(projectId);
          toast.success('Proyecto creado correctamente');
          // Clear cache
          const cacheKey = createCacheKey('projects', { companyId });
          queryCache.clear(cacheKey);
          return true;
        }

        log.error('Project creation failed in Firestore', { projectId, companyId });
        toast.error('Error al crear el proyecto');
        return false;
      } catch (err) {
        notifySyncEnd();
        log.error('Project creation error', err as Error, { companyId });
        toast.error('Error inesperado al crear el proyecto');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [companyId, currentUserId]
  );

  // ========== PROJECT UPDATE ==========
  const updateProject = useCallback(
    async (projectId: string, data: Partial<ProjectFormValues>) => {
      if (!companyId || !currentUserId) {
        log.warn('Project update attempted without auth');
        toast.error('Usuario no autenticado');
        return false;
      }

      setLoading(true);
      try {
        const existing = projects.find((p) => p.id === projectId);
        if (!existing) {
          log.warn('Project not found for update', { projectId });
          toast.error('Proyecto no encontrado');
          return false;
        }

        log.info('Updating project', { projectId, companyId });
        const updated: Project = {
          ...existing,
          ...data,
          id: projectId,
          companyId,
          ownerId: currentUserId,
        };

        const success = await saveProjectToFirestore(updated, companyId, currentUserId);
        if (success) {
          log.info('Project updated successfully', { projectId });
          toast.success('Proyecto actualizado correctamente');
          // Clear cache
          const cacheKey = createCacheKey('projects', { companyId });
          queryCache.clear(cacheKey);
          return true;
        }

        log.error('Project update failed in Firestore', { projectId });
        toast.error('Error al actualizar el proyecto');
        return false;
      } catch (err) {
        notifySyncEnd();
        log.error('Project update error', err as Error, { projectId });
        toast.error('Error inesperado al actualizar el proyecto');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [companyId, currentUserId, projects]
  );

  // ========== PROJECT ARCHIVE ==========
  const archiveProject = useCallback(
    async (projectId: string) => {
      if (!companyId || !currentUserId) {
        log.warn('Project archive attempted without auth');
        toast.error('Usuario no autenticado');
        return false;
      }

      const project = projects.find((item) => item.id === projectId);
      if (!project) {
        log.warn('Project not found for archival', { projectId });
        toast.error('No se encontró el proyecto que quieres archivar.');
        return false;
      }

      if (project.status === 'Archivado') {
        log.warn('Attempted to archive already archived project', { projectId });
        toast.error('Este proyecto ya está archivado.');
        return false;
      }

      setLoading(true);
      try {
        log.info('Archiving project', { projectId, companyId });
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
          log.error('Project archival failed', { projectId });
          toast.error('No se pudo archivar el proyecto. No se eliminó ningún dato relacionado.');
          return false;
        }

        log.info('Project archived successfully', { projectId });
        toast.success('Proyecto archivado. Su historial y registros relacionados se conservaron.');
        // Clear cache
        const cacheKey = createCacheKey('projects', { companyId });
        queryCache.clear(cacheKey);
        return true;
      } catch (err) {
        notifySyncEnd();
        log.error('Project archival error', err as Error, { projectId });
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

  // ========== PROJECT RESTORE ==========
  const restoreProject = useCallback(
    async (projectId: string) => {
      if (!companyId || !currentUserId) {
        log.warn('Project restore attempted without auth');
        toast.error('Usuario no autenticado');
        return false;
      }

      const project = projects.find((item) => item.id === projectId);
      if (!project || project.status !== 'Archivado') {
        log.warn('Archived project not found for restoration', { projectId });
        toast.error('No se encontró un proyecto archivado para restaurar.');
        return false;
      }

      setLoading(true);
      try {
        log.info('Restoring project', { projectId, companyId });
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
          log.error('Project restoration failed', { projectId });
          toast.error('No se pudo restaurar el proyecto.');
          return false;
        }

        log.info('Project restored successfully', { projectId });
        toast.success('Proyecto restaurado.');
        // Clear cache
        const cacheKey = createCacheKey('projects', { companyId });
        queryCache.clear(cacheKey);
        return true;
      } catch (error) {
        notifySyncEnd();
        log.error('Project restoration error', error as Error, { projectId });
        toast.error('Error inesperado al restaurar el proyecto.');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [companyId, currentUserId, projects]
  );

  // ========== EXPENSE MANAGEMENT ==========
  const addExpense = useCallback(
    async (expense: ExpenseRecord) => {
      if (!companyId || !currentUserId) {
        log.warn('Expense creation attempted without auth');
        toast.error('Usuario no autenticado');
        return false;
      }

      try {
        log.info('Creating expense', { projectId: expense.projectId, amount: expense.amount });
        const ok = await saveExpenseToFirestore(expense, companyId, currentUserId);
        if (ok) {
          log.info('Expense created successfully', { expenseId: expense.id });
          toast.success('Gasto registrado correctamente');
          // Clear cache
          const cacheKey = createCacheKey('expenses', { companyId });
          queryCache.clear(cacheKey);
          return true;
        }

        log.error('Expense creation failed in Firestore', {
          expenseId: expense.id,
        });
        toast.error('Error al guardar el gasto');
        return false;
      } catch (err) {
        notifySyncEnd();
        log.error('Expense creation error', err as Error, { companyId });
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
        log.warn('Expense deletion attempted without auth');
        toast.error('Usuario no autenticado');
        return false;
      }

      try {
        log.info('Deleting expense', { expenseId });
        const ok = await deleteExpenseFromFirestore(expenseId);
        if (ok) {
          log.info('Expense deleted successfully', { expenseId });
          toast.success('Gasto eliminado correctamente');
          // Clear cache
          const cacheKey = createCacheKey('expenses', { companyId });
          queryCache.clear(cacheKey);
          return true;
        }

        log.error('Expense deletion failed', { expenseId });
        toast.error('Error al eliminar el gasto');
        return false;
      } catch (err) {
        notifySyncEnd();
        log.error('Expense deletion error', err as Error, { expenseId });
        toast.error('Error inesperado al eliminar el gasto');
        return false;
      }
    },
    [companyId, currentUserId]
  );

  const updateExpense = useCallback(
    async (expense: ExpenseRecord) => {
      if (!companyId || !currentUserId) {
        log.warn('Expense update attempted without auth');
        toast.error('Usuario no autenticado');
        return false;
      }

      try {
        log.info('Updating expense', { expenseId: expense.id });
        const ok = await updateExpenseToFirestore(expense, companyId, currentUserId);
        if (ok) {
          log.info('Expense updated successfully', { expenseId: expense.id });
          toast.success('Gasto actualizado correctamente');
          // Clear cache
          const cacheKey = createCacheKey('expenses', { companyId });
          queryCache.clear(cacheKey);
          return true;
        }

        log.error('Expense update failed in Firestore', { expenseId: expense.id });
        toast.error('Error al actualizar el gasto');
        return false;
      } catch (err) {
        notifySyncEnd();
        log.error('Expense update error', err as Error, { expenseId: expense.id });
        toast.error('Error inesperado al actualizar el gasto');
        return false;
      }
    },
    [companyId, currentUserId]
  );

  // ========== ATTENDANCE MANAGEMENT ==========
  const addAttendance = useCallback(
    async (record: AttendanceRecord) => {
      if (!companyId || !currentUserId) {
        log.warn('Attendance creation attempted without auth');
        toast.error('Usuario no autenticado');
        return false;
      }

      try {
        log.info('Recording attendance', {
          projectId: record.projectId,
          employeeId: record.employeeId,
          date: record.date,
        });
        const saved = await saveAttendanceToFirestore(record, companyId, currentUserId);
        if (saved) {
          log.info('Attendance recorded successfully', { attendanceId: record.id });
          toast.success('Asistencia registrada correctamente');
          // Clear cache
          const cacheKey = createCacheKey('attendance', { companyId });
          queryCache.clear(cacheKey);
          return true;
        }

        log.error('Attendance recording failed', { attendanceId: record.id });
        toast.error('No se pudo guardar la asistencia');
        return false;
      } catch (err) {
        notifySyncEnd();
        log.error('Attendance recording error', err as Error, { companyId });
        toast.error('Error inesperado al guardar la asistencia');
        return false;
      }
    },
    [companyId, currentUserId]
  );

  const deleteAttendance = useCallback(
    async (attendanceId: string) => {
      if (!companyId || !currentUserId) {
        log.warn('Attendance deletion attempted without auth');
        toast.error('Inicia sesión para eliminar un registro de asistencia.');
        return false;
      }

      if (!attendance.some((record) => record.id === attendanceId)) {
        log.warn('Attendance record not found', { attendanceId });
        toast.error('No se encontró el registro de asistencia.');
        return false;
      }

      if (!window.confirm('¿Eliminar este registro de asistencia?')) return false;

      try {
        log.info('Deleting attendance', { attendanceId });
        const deleted = await deleteAttendanceFromFirestore(attendanceId);
        if (deleted) {
          log.info('Attendance deleted successfully', { attendanceId });
          toast.success('Registro de asistencia eliminado.');
          // Clear cache
          const cacheKey = createCacheKey('attendance', { companyId });
          queryCache.clear(cacheKey);
        } else {
          log.error('Attendance deletion failed', { attendanceId });
          toast.error('No se pudo eliminar el registro de asistencia.');
        }
        return deleted;
      } catch (err) {
        log.error('Attendance deletion error', err as Error, { attendanceId });
        toast.error('Error al eliminar la asistencia.');
        return false;
      }
    },
    [attendance, companyId, currentUserId]
  );

  // ========== APU MANAGEMENT ==========
  const saveAPUItems = useCallback(
    async (items: APUItem[], projectId: string) => {
      if (!companyId || !currentUserId) {
        log.warn('APU items save attempted without auth');
        toast.error('Inicia sesión en una empresa para guardar el presupuesto APU.');
        return false;
      }

      if (!projectId || !projects.some((project) => project.id === projectId)) {
        log.warn('Invalid project for APU save', { projectId });
        toast.error('Selecciona un proyecto válido para guardar las partidas APU.');
        return false;
      }

      try {
        // Validate all APU items
        const validatedItems = items.map((item) => {
          try {
            return validateAPUItem(item);
          } catch (err) {
            log.error('APU item validation failed', err as Error, {
              itemCode: item.code,
            });
            throw err;
          }
        });

        log.info('Saving APU items', { projectId, count: validatedItems.length });
        const saved = await saveAPUItemsToFirestore(
          validatedItems,
          projectId,
          companyId,
          currentUserId
        );

        if (!saved) {
          log.error('APU items save failed in Firestore', { projectId });
          toast.error('No se pudo guardar el presupuesto APU.');
          return false;
        }

        log.info('APU items saved successfully', { projectId, count: validatedItems.length });
        // Clear cache
        const cacheKey = createCacheKey('apuItems', { companyId });
        queryCache.clear(cacheKey);
        return true;
      } catch (err) {
        log.error('APU items save error', err as Error, { projectId });
        toast.error('Error al guardar el presupuesto APU.');
        return false;
      }
    },
    [companyId, currentUserId, projects]
  );

  const deleteAPUItem = useCallback(
    async (itemId: string) => {
      if (!companyId || !currentUserId) {
        log.warn('APU item deletion attempted without auth');
        toast.error('Inicia sesión en una empresa para eliminar partidas APU.');
        return false;
      }

      if (!apuItems.some((item) => item.id === itemId && item.companyId === companyId)) {
        log.warn('APU item not found in company', { itemId });
        toast.error('No se encontró la partida APU en esta empresa.');
        return false;
      }

      try {
        log.info('Deleting APU item', { itemId });
        const deleted = await deleteAPUItemFromFirestore(itemId);
        if (!deleted) {
          log.error('APU item deletion failed', { itemId });
          toast.error('No se pudo eliminar la partida APU.');
          return false;
        }

        log.info('APU item deleted successfully', { itemId });
        // Clear cache
        const cacheKey = createCacheKey('apuItems', { companyId });
        queryCache.clear(cacheKey);
        return true;
      } catch (err) {
        log.error('APU item deletion error', err as Error, { itemId });
        toast.error('Error al eliminar la partida APU.');
        return false;
      }
    },
    [apuItems, companyId, currentUserId]
  );

  // ========== EMPLOYEE MANAGEMENT ==========
  const addEmployee = useCallback(
    async (employee: Employee) => {
      if (!companyId || !currentUserId) {
        log.warn('Employee creation attempted without auth');
        toast.error('Inicia sesión para guardar empleados.');
        return false;
      }

      try {
        log.info('Creating employee', { employeeName: employee.name, role: employee.role });
        const saved = await saveEmployeeToFirestore(employee, companyId, currentUserId);
        if (!saved) {
          log.error('Employee creation failed', {
            employeeName: employee.name,
          });
          toast.error('No se pudo guardar el empleado.');
          return false;
        }

        log.info('Employee created successfully', { employeeId: employee.id });
        toast.success('Empleado registrado correctamente.');
        // Clear cache
        const cacheKey = createCacheKey('employees', { companyId });
        queryCache.clear(cacheKey);
        return true;
      } catch (err) {
        log.error('Employee creation error', err as Error, { companyId });
        toast.error('Error al guardar el empleado.');
        return false;
      }
    },
    [companyId, currentUserId]
  );

  // ========== QUOTATION MANAGEMENT ==========
  const addQuote = useCallback(
    async (quote: QuoteRecord) => {
      if (!companyId || !currentUserId) {
        log.warn('Quote creation attempted without auth');
        toast.error('Inicia sesión en una empresa para guardar cotizaciones.');
        return false;
      }

      try {
        log.info('Creating quote', {
          clientName: quote.clientName,
          totalGTQ: quote.totalGTQ,
        });
        const saved = await saveQuoteToFirestore(quote, companyId, currentUserId);
        if (!saved) {
          log.error('Quote creation failed', { quoteId: quote.id });
          toast.error('No se pudo guardar la cotización.');
          return false;
        }

        log.info('Quote created successfully', { quoteId: quote.id });
        // Clear cache
        const cacheKey = createCacheKey('quotes', { companyId });
        queryCache.clear(cacheKey);
        return true;
      } catch (err) {
        log.error('Quote creation error', err as Error, { companyId });
        toast.error('Error al guardar la cotización.');
        return false;
      }
    },
    [companyId, currentUserId]
  );

  const updateQuoteStatus = useCallback(
    async (quoteId: string, status: QuoteRecord['status']) => {
      if (!companyId || !currentUserId) {
        log.warn('Quote status update attempted without auth');
        toast.error('Inicia sesión en una empresa para actualizar cotizaciones.');
        return false;
      }

      const quote = quotes.find((item) => item.id === quoteId);
      if (!quote) {
        log.warn('Quote not found for status update', { quoteId });
        toast.error('No se encontró la cotización.');
        return false;
      }

      try {
        log.info('Updating quote status', { quoteId, newStatus: status });
        const saved = await updateQuoteStatusInFirestore(quote, status, companyId, currentUserId);
        if (!saved) {
          log.error('Quote status update failed', { quoteId });
          toast.error('No se pudo actualizar el estado de la cotización.');
          return false;
        }

        log.info('Quote status updated successfully', { quoteId, newStatus: status });
        // Clear cache
        const cacheKey = createCacheKey('quotes', { companyId });
        queryCache.clear(cacheKey);
        return true;
      } catch (err) {
        log.error('Quote status update error', err as Error, { quoteId });
        toast.error('Error al actualizar la cotización.');
        return false;
      }
    },
    [companyId, currentUserId, quotes]
  );

  // ========== MACHINERY MANAGEMENT ==========
  const addMachinery = useCallback(
    async (item: Machinery) => {
      if (!companyId || !currentUserId) {
        log.warn('Machinery creation attempted without auth');
        toast.error('Inicia sesión en una empresa para registrar maquinaria.');
        return false;
      }

      try {
        log.info('Creating machinery', {
          machineryName: item.name,
          hourlyRate: item.hourlyRateGTQ,
        });
        const saved = await saveMachineryToFirestore(item, companyId, currentUserId);
        if (!saved) {
          log.error('Machinery creation failed', { machineryId: item.id });
          toast.error('No se pudo guardar la maquinaria.');
          return false;
        }

        log.info('Machinery created successfully', { machineryId: item.id });
        // Clear cache
        const cacheKey = createCacheKey('machinery', { companyId });
        queryCache.clear(cacheKey);
        return true;
      } catch (err) {
        log.error('Machinery creation error', err as Error, { companyId });
        toast.error('Error al guardar la maquinaria.');
        return false;
      }
    },
    [companyId, currentUserId]
  );

  const addMachineryLog = useCallback(
    async (log_: MachineryLog) => {
      if (!companyId || !currentUserId) {
        log.warn('Machinery log creation attempted without auth');
        toast.error('Inicia sesión en una empresa para registrar horas de maquinaria.');
        return false;
      }

      const equipment = machinery.find((item) => item.id === log_.machineryId);
      if (!equipment) {
        log.warn('Machinery not found for log', {
          machineryId: log_.machineryId,
        });
        toast.error('No se encontró la maquinaria seleccionada.');
        return false;
      }

      try {
        log.info('Creating machinery log', {
          machineryId: log_.machineryId,
          hoursWorked: log_.hoursWorked,
        });
        const saved = await recordMachineryUse(log_, equipment, companyId, currentUserId);
        if (!saved) {
          log.error('Machinery log creation failed', { logId: log_.id });
          toast.error('No se pudo registrar el uso y costo de maquinaria.');
          return false;
        }

        log.info('Machinery log created successfully', { logId: log_.id });
        return true;
      } catch (err) {
        log.error('Machinery log creation error', err as Error, { companyId });
        toast.error('Error al registrar el uso de maquinaria.');
        return false;
      }
    },
    [companyId, currentUserId, machinery]
  );

  const setMachineryStatus = useCallback(
    async (machineryId: string, status: Machinery['status']) => {
      if (!companyId || !currentUserId) {
        log.warn('Machinery status update attempted without auth');
        toast.error('Inicia sesión en una empresa para actualizar maquinaria.');
        return false;
      }

      const equipment = machinery.find((item) => item.id === machineryId);
      if (!equipment) {
        log.warn('Machinery not found for status update', { machineryId });
        toast.error('No se encontró la maquinaria seleccionada.');
        return false;
      }

      try {
        log.info('Updating machinery status', { machineryId, newStatus: status });
        const saved = await updateMachineryStatusInFirestore(
          equipment,
          status,
          companyId,
          currentUserId
        );
        if (!saved) {
          log.error('Machinery status update failed', { machineryId });
          toast.error('No se pudo actualizar el estado de la maquinaria.');
          return false;
        }

        log.info('Machinery status updated successfully', {
          machineryId,
          newStatus: status,
        });
        // Clear cache
        const cacheKey = createCacheKey('machinery', { companyId });
        queryCache.clear(cacheKey);
        return true;
      } catch (err) {
        log.error('Machinery status update error', err as Error, { machineryId });
        toast.error('Error al actualizar la maquinaria.');
        return false;
      }
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
    budgetSummary, // NEW: Memoized budget calculations
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
