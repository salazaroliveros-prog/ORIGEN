'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Project, ProjectStatus } from '@/lib/types';
import {
  subscribeProjects,
  saveProjectToFirestore,
  saveProjectScheduleToFirestore,
} from '@/lib/firebaseService';
import { validateProjectForm, getDefaultProjectValues, type ProjectFormValues } from '@/lib/validation/project.schema';
import { toast } from 'react-hot-toast';
import { notifySyncEnd } from '../useFirebaseSyncStatus';
import { calculateProjectSpentById, resolveProjectProgress } from '@/lib/projectCalculations';
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
  createProject: (data: ProjectFormValues, onCreated?: (projectId: string) => void) => Promise<boolean>;
  updateProject: (projectId: string, data: Partial<ProjectFormValues>) => Promise<boolean>;
  archiveProject: (projectId: string) => Promise<boolean>;
  restoreProject: (projectId: string) => Promise<boolean>;
  updateProjectSchedule: (
    projectId: string,
    schedule: Partial<Pick<Project, 'scheduleTasks' | 'scheduleMilestones' | 'taskReminders' | 'progressPercent'>>
  ) => Promise<void>;
  getDefaultValues: () => ProjectFormValues;
  validateForm: (data: unknown) => ReturnType<typeof validateProjectForm>;
}

export function useProjects({ companyId, currentUserId }: UseProjectsOptions): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const hasInitializedRef = useRef(false);
  const lastCompanyIdRef = useRef<string | null>(null);

  const activeProjects = useMemo(
    () => projects.filter((project) => project.status !== 'Archivado'),
    [projects]
  );

  // Derived state: calculate spent total and progress for each project
  const projectsWithCalculations = useMemo(() => {
    return projects.map((project) => {
      const calculatedSpent = calculateProjectSpentById([], project.id);
      const calculatedProgress = resolveProjectProgress(
        project.scheduleTasks,
        project.scheduleMilestones,
        project.progressPercent
      );
      return {
        ...project,
        spentTotal: calculatedSpent !== project.spentTotal ? calculatedSpent : project.spentTotal,
        progressPercent: calculatedProgress !== project.progressPercent ? calculatedProgress : project.progressPercent,
      };
    });
  }, [projects]);

  // Subscribe to projects
  useEffect(() => {
    if (!companyId || !currentUserId) {
      if (!hasInitializedRef.current) return;
      log.debug('Missing auth context, clearing projects');
      setProjects([]);
      setLoading(false);
      hasInitializedRef.current = false;
      lastCompanyIdRef.current = null;
      return;
    }

    if (hasInitializedRef.current && lastCompanyIdRef.current === companyId) return;

    hasInitializedRef.current = true;
    lastCompanyIdRef.current = companyId;

    log.info('Starting projects subscription', { companyId });
    setLoading(true);

    const unsubProjects = subscribeProjects(companyId, (nextProjects) => {
      log.debug('Projects updated', { count: nextProjects.length });
      const cacheKey = createCacheKey('projects', { companyId });
      queryCache.set(cacheKey, nextProjects, 5 * 60 * 1000);
      setProjects(nextProjects);
      setLoading(false);
    });

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
        log.warn('Project validation failed', { errors: validation.error.issues.map((i) => i.message) });
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
        toast.error('Error inesperado al archivar el proyecto. No se eliminó ningún dato relacionado.');
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
      schedule: Partial<Pick<Project, 'scheduleTasks' | 'scheduleMilestones' | 'taskReminders' | 'progressPercent'>>
    ) => {
      if (!currentUserId || !companyId) {
        toast.error('Inicia sesión para guardar los cambios del cronograma.');
        return;
      }

      const saved = await saveProjectScheduleToFirestore(projectId, schedule, companyId, currentUserId);
      if (!saved) {
        toast.error('No se pudieron guardar los cambios del cronograma.');
      }
    },
    [companyId, currentUserId]
  );

  return {
    projects: projectsWithCalculations,
    loading,
    activeProjects: projectsWithCalculations.filter((project) => project.status !== 'Archivado'),
    createProject,
    updateProject,
    archiveProject,
    restoreProject,
    updateProjectSchedule,
    getDefaultValues: getDefaultProjectValues,
    validateForm: validateProjectForm,
  };
}