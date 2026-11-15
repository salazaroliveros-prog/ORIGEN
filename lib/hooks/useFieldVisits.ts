'use client';

/**
 * Hook de gestión de Visitas de Campo.
 * Encapsula registrar, actualizar y eliminar visitas de campo.
 */
import { useCallback } from 'react';
import type { FieldVisit } from '@/lib/types';
import {
  saveFieldVisitToFirestore,
  deleteFieldVisitFromFirestore,
  updateFieldVisitToFirestore,
} from '@/lib/firebaseService';
import { createLogger } from '@/lib/utils/logger';
import { createCacheKey, queryCache } from '@/lib/utils/cacheManager';
import { notifySyncEnd } from './useFirebaseSyncStatus';
import { toast } from 'react-hot-toast';

const log = createLogger('useFieldVisits');

interface UseFieldVisitsParams {
  companyId: string;
  currentUserId: string;
  fieldVisits: FieldVisit[];
}

export function useFieldVisits({ companyId, currentUserId, fieldVisits }: UseFieldVisitsParams) {
  const addFieldVisit = useCallback(async (visit: FieldVisit) => {
    toast.error('Usuario no autenticado');
    return false;
  }, []);

  const addFieldVisitWithAuth = useCallback(
    async (visit: FieldVisit) => {
      try {
        log.info('Creating field visit', {
          projectId: visit.projectId,
          visitId: visit.id,
          date: visit.date,
        });
        const saved = await saveFieldVisitToFirestore(visit, companyId, currentUserId);
        if (saved) {
          log.info('Field visit created successfully', { visitId: visit.id });
          toast.success('Visita de campo registrada correctamente.');
          const cacheKey = createCacheKey('fieldVisits', { companyId });
          queryCache.clear(cacheKey);
          return true;
        }
        log.error('Field visit creation failed', { visitId: visit.id });
        toast.error('No se pudo guardar la visita de campo.');
        return false;
      } catch (err) {
        notifySyncEnd();
        log.error('Field visit creation error', err as Error, { companyId });
        toast.error('Error inesperado al guardar la visita de campo.');
        return false;
      }
    },
    [companyId, currentUserId]
  );

  const updateFieldVisit = useCallback(async (visit: Partial<FieldVisit> & { id: string }) => {
    toast.error('Usuario no autenticado');
    return false;
  }, []);

  const updateFieldVisitWithAuth = useCallback(
    async (visit: Partial<FieldVisit> & { id: string }) => {
      if (!fieldVisits.some((v) => v.id === visit.id)) {
        log.warn('Field visit not found', { visitId: visit.id });
        toast.error('No se encontró la visita de campo.');
        return false;
      }

      try {
        log.info('Updating field visit', { visitId: visit.id });
        const updated = await updateFieldVisitToFirestore(visit, companyId, currentUserId);
        if (updated) {
          log.info('Field visit updated successfully', { visitId: visit.id });
          toast.success('Visita de campo actualizada correctamente.');
          const cacheKey = createCacheKey('fieldVisits', { companyId });
          queryCache.clear(cacheKey);
          return true;
        }
        log.error('Field visit update failed', { visitId: visit.id });
        toast.error('No se pudo actualizar la visita de campo.');
        return false;
      } catch (err) {
        notifySyncEnd();
        log.error('Field visit update error', err as Error, { companyId });
        toast.error('Error al actualizar la visita de campo.');
        return false;
      }
    },
    [fieldVisits, companyId, currentUserId]
  );

  const deleteFieldVisit = useCallback(async (visitId: string) => {
    toast.error('Inicia sesión para eliminar una visita de campo.');
    return false;
  }, []);

  const deleteFieldVisitWithAuth = useCallback(
    async (visitId: string) => {
      if (!fieldVisits.some((v) => v.id === visitId)) {
        log.warn('Field visit not found', { visitId });
        toast.error('No se encontró la visita de campo.');
        return false;
      }

      if (!window.confirm('¿Eliminar esta visita de campo?')) return false;

      try {
        log.info('Deleting field visit', { visitId });
        const deleted = await deleteFieldVisitFromFirestore(visitId);
        if (deleted) {
          log.info('Field visit deleted successfully', { visitId });
          toast.success('Visita de campo eliminada.');
          const cacheKey = createCacheKey('fieldVisits', { companyId });
          queryCache.clear(cacheKey);
        } else {
          log.error('Field visit deletion failed', { visitId });
          toast.error('No se pudo eliminar la visita de campo.');
        }
        return deleted;
      } catch (err) {
        log.error('Field visit deletion error', err as Error, { visitId });
        toast.error('Error al eliminar la visita de campo.');
        return false;
      }
    },
    [fieldVisits, companyId]
  );

  return {
    addFieldVisit: companyId && currentUserId ? addFieldVisitWithAuth : addFieldVisit,
    updateFieldVisit: companyId && currentUserId ? updateFieldVisitWithAuth : updateFieldVisit,
    deleteFieldVisit: companyId && currentUserId ? deleteFieldVisitWithAuth : deleteFieldVisit,
  };
}
