'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  Project,
  ProjectStatus,
  ExpenseRecord,
  APUItem,
  QuoteRecord,
  AttendanceRecord,
  MachineryLog,
} from '@/lib/types';
import {
  subscribeProjects,
  saveProjectToFirestore,
  saveProjectScheduleToFirestore,
  deleteProjectFromFirestore,
} from '@/lib/firebaseService';
import {
  validateProjectForm,
  getDefaultProjectValues,
  type ProjectFormValues,
} from '@/lib/validation/project.schema';
import { toast } from 'react-hot-toast';
import { notifySyncEnd } from '../useFirebaseSyncStatus';
import {
  mergeProjectUpdate,
  hasProjectDependencies,
  type ProjectDependencies,
} from '@/lib/projectCalculations';
import { createLogger } from '@/lib/utils/logger';
import { queryCache, createCacheKey } from '@/lib/utils/cacheManager';

const log = createLogger('useProjects');

export interface UseProjectsOptions {
  companyId?: string;
  currentUserId?: string;
}

export interface UseProjectsReturn {
  projects: Project[];
  loading: boolean;
  activeProjects: Project[];
  createProject: (
    data: ProjectFormValues,
    onCreated?: (projectId: string) => void
  ) => Promise<boolean>;
  updateProject: (projectId: string, data: Partial<ProjectFormValues>) => Promise<boolean>;
  archiveProject: (projectId: string) => Promise<boolean>;
  restoreProject: (projectId: string) => Promise<boolean>;
  deleteProject: (
    projectId: string,
    deps?: {
      expenses?: ExpenseRecord[];
      apuItems?: APUItem[];
      quotes?: QuoteRecord[];
      attendance?: AttendanceRecord[];
      machineryLogs?: MachineryLog[];
    }
  ) => Promise<boolean>;
  updateProjectSchedule: (
    projectId: string,
    schedule: Partial<
      Pick<Project, 'scheduleTasks' | 'scheduleMilestones' | 'taskReminders' | 'progressPercent'>
    >
  ) => Promise<void>;
  getDefaultValues: () => ProjectFormValues;
  validateForm: (data: unknown) => ReturnType<typeof validateProjectForm>;
}

export function useProjects({ companyId, currentUserId }: UseProjectsOptions): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  const activeProjects = useMemo(
    () => projects.filter((project) => project.status !== 'Archivado'),
    [projects]
  );

  // NOTE: `spentTotal` y `progressPercent` son datos DERIVADOS. No se calculan aquí
  // porque este hook no tiene acceso a los gastos; `useProjectData` los deriva a
  // partir de la colección de gastos y del cronograma (ver deriveProjectsFinancials).

  // Subscribe to projects
  useEffect(() => {
    if (!companyId || !currentUserId) {
      log.debug('Missing auth context, clearing projects');
      setProjects([]);
      setLoading(false);
      return;
    }

    log.info('Starting projects subscription', { companyId });
    setProjects([]);
    setLoading(true);

    const unsubProjects = subscribeProjects(
      companyId,
      (nextProjects) => {
        log.debug('Projects updated', { count: nextProjects.length });
        const cacheKey = createCacheKey('projects', { companyId });
        queryCache.set(cacheKey, nextProjects, 5 * 60 * 1000);
        setProjects(nextProjects);
        setLoading(false);
      },
      (error) => {
        log.error('Projects subscription failed', error);
        setLoading(false);
      }
    );

    return () => {
      log.info('Unsubscribing from projects');
      unsubProjects();
    };
  }, [companyId, currentUserId]);

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
        const projectId = `proj-${crypto.randomUUID()}`;
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
        // `mergeProjectUpdate` ignora `spentTotal` del formulario (es derivado de
        // los gastos) y recalcula `progressPercent` desde el cronograma.
        const updated = mergeProjectUpdate(existing, data, {
          companyId,
          ownerId: currentUserId,
        });

        const success = await saveProjectToFirestore(updated, companyId, currentUserId);
        if (success) {
          log.info('Project updated successfully', { projectId });
          toast.success('Proyecto actualizado correctamente');
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

  const updateProjectSchedule = useCallback(
    async (
      projectId: string,
      schedule: Partial<
        Pick<Project, 'scheduleTasks' | 'scheduleMilestones' | 'taskReminders' | 'progressPercent'>
      >
    ) => {
      if (!currentUserId || !companyId) {
        toast.error('Inicia sesión para guardar los cambios del cronograma.');
        return;
      }

      const saved = await saveProjectScheduleToFirestore(
        projectId,
        schedule,
        companyId,
        currentUserId
      );
      if (!saved) {
        toast.error('No se pudieron guardar los cambios del cronograma.');
      }
    },
    [companyId, currentUserId]
  );

  /**
   * Elimina un proyecto tras verificar que no tiene dependencias activas.
   *
   * Las dependencias se pasan opcionalmente. Si se proporcionan y hay
   * dependencias, la eliminación se bloquea y se muestra un toast con el
   * detalle de qué módulos bloquean el borrado.
   */
  const deleteProject = useCallback(
    async (
      projectId: string,
      deps?: {
        expenses?: ExpenseRecord[];
        apuItems?: APUItem[];
        quotes?: QuoteRecord[];
        attendance?: AttendanceRecord[];
        machineryLogs?: MachineryLog[];
      }
    ) => {
      if (!companyId || !currentUserId) {
        log.warn('Project deletion attempted without auth');
        toast.error('Usuario no autenticado');
        return false;
      }

      const project = projects.find((item) => item.id === projectId);
      if (!project) {
        log.warn('Project not found for deletion', { projectId });
        toast.error('No se encontró el proyecto que quieres eliminar.');
        return false;
      }

      if (project.status !== 'Archivado') {
        log.warn('Attempted to delete non-archived project', { projectId });
        toast.error('Solo se pueden eliminar proyectos archivados. Archivalo primero.');
        return false;
      }

      // Verificar dependencias si se proporcionaron datos
      if (deps) {
        const dependencyCheck = hasProjectDependencies({
          projectId,
          expenses: deps.expenses,
          apuItems: deps.apuItems,
          quotes: deps.quotes,
          attendance: deps.attendance,
          machineryLogs: deps.machineryLogs,
        });

        if (dependencyCheck.hasDependencies) {
          const modulos = Object.entries(dependencyCheck.dependencies)
            .map(([mod, count]) => `${count} ${mod}`)
            .join(', ');
          log.warn('Project deletion blocked by dependencies', {
            projectId,
            dependencies: dependencyCheck.dependencies,
          });
          toast.error(
            `No se puede eliminar el proyecto: tiene ${modulos} asociado(s). Elimina esos registros primero.`
          );
          return false;
        }
      }

      setLoading(true);
      try {
        log.info('Deleting project', { projectId, companyId });
        const deleted = await deleteProjectFromFirestore(projectId, companyId, currentUserId);
        if (!deleted) {
          log.error('Project deletion failed', { projectId });
          toast.error('No se pudo eliminar el proyecto.');
          return false;
        }

        log.info('Project deleted successfully', { projectId });
        toast.success('Proyecto eliminado correctamente.');
        const cacheKey = createCacheKey('projects', { companyId });
        queryCache.clear(cacheKey);
        return true;
      } catch (err) {
        notifySyncEnd();
        log.error('Project deletion error', err as Error, { projectId });
        toast.error('Error inesperado al eliminar el proyecto.');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [companyId, currentUserId, projects]
  );

  return {
    projects,
    loading,
    activeProjects,
    createProject,
    updateProject,
    archiveProject,
    restoreProject,
    deleteProject,
    updateProjectSchedule,
    getDefaultValues: getDefaultProjectValues,
    validateForm: validateProjectForm,
  };
}
