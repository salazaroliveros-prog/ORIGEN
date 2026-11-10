'use client';

import { useCallback } from 'react';
import type { Project } from '@/lib/types';
import { saveProjectToFirestore } from '@/lib/firebaseService';
import { validateProjectForm, type ProjectFormValues } from '@/lib/validation/project.schema';
import { createLogger } from '@/lib/utils/logger';
import { createCacheKey, queryCache } from '@/lib/utils/cacheManager';
import { notifySyncEnd } from './useFirebaseSyncStatus';
import { toast } from 'react-hot-toast';

const log = createLogger('useProjectCrud');

interface UseProjectCrudParams {
  companyId: string;
  currentUserId: string;
  projects: Project[];
}

export function useProjectCrud({
  companyId,
  currentUserId,
  projects,
}: UseProjectCrudParams) {
  const createProject = useCallback(
    async (_data: ProjectFormValues, _onCreated?: (projectId: string) => void) => {
      toast.error('Usuario no autenticado');
      return false;
    },
    []
  );

  const createProjectWithAuth = useCallback(
    async (data: ProjectFormValues, onCreated?: (projectId: string) => void) => {
      const validation = validateProjectForm(data);
      if (!validation.success) {
        log.warn('Project validation failed', {
          errors: validation.error.issues.map((i) => i.message),
        });
        toast.error('Datos inválidos: ' + validation.error.issues.map((i) => i.message).join(', '));
        return false;
      }

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
      }
    },
    [companyId, currentUserId]
  );

  const updateProject = useCallback(
    async (_projectId: string, _data: Partial<ProjectFormValues>) => {
      toast.error('Usuario no autenticado');
      return false;
    },
    []
  );

  const updateProjectWithAuth = useCallback(
    async (projectId: string, data: Partial<ProjectFormValues>) => {
      const existing = projects.find((p) => p.id === projectId);
      if (!existing) {
        log.warn('Project not found for update', { projectId });
        toast.error('Proyecto no encontrado');
        return false;
      }

      try {
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
      }
    },
    [companyId, currentUserId, projects]
  );
  const archiveProject = useCallback(
    async (_projectId: string) => {
      toast.error('Usuario no autenticado');
      return false;
    },
    []
  );

  const archiveProjectWithAuth = useCallback(
    async (projectId: string) => {
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
      }
    },
    [companyId, currentUserId, projects]
  );

  const restoreProject = useCallback(
    async (_projectId: string) => {
      toast.error('Usuario no autenticado');
      return false;
    },
    []
  );

  const restoreProjectWithAuth = useCallback(
    async (projectId: string) => {
      const project = projects.find((item) => item.id === projectId);
      if (!project || project.status !== 'Archivado') {
        log.warn('Archived project not found for restoration', { projectId });
        toast.error('No se encontró un proyecto archivado para restaurar.');
        return false;
      }

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
      }
    },
    [companyId, currentUserId, projects]
  );

  return {
    createProject: companyId && currentUserId ? createProjectWithAuth : createProject,
    updateProject: companyId && currentUserId ? updateProjectWithAuth : updateProject,
    archiveProject: companyId && currentUserId ? archiveProjectWithAuth : archiveProject,
    restoreProject: companyId && currentUserId ? restoreProjectWithAuth : restoreProject,
  };
}
