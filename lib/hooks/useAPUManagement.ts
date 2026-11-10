'use client';

/**
 * Hook de gestión de Partidas APU.
 * Encapsula guardar y eliminar partidas de presupuesto APU.
 */
import { useCallback } from 'react';
import type { APUItem, Project } from '@/lib/types';
import {
  saveAPUItemsToFirestore,
  deleteAPUItemFromFirestore,
} from '@/lib/firebaseService';
import { validateAPUItem } from '@/lib/utils/calculations';
import { createLogger } from '@/lib/utils/logger';
import { createCacheKey, queryCache } from '@/lib/utils/cacheManager';
import { toast } from 'react-hot-toast';

const log = createLogger('useAPUManagement');

interface UseAPUManagementParams {
  companyId: string;
  currentUserId: string;
  projects: Project[];
  apuItems: APUItem[];
}

export function useAPUManagement({
  companyId,
  currentUserId,
  projects,
  apuItems,
}: UseAPUManagementParams) {
  const saveAPUItems = useCallback(
    async (items: APUItem[], projectId: string) => {
      toast.error('Inicia sesión en una empresa para guardar el presupuesto APU.');
      return false;
    },
    []
  );

  const saveAPUItemsWithAuth = useCallback(
    async (items: APUItem[], projectId: string) => {
      if (!projectId || !projects.some((project) => project.id === projectId)) {
        log.warn('Invalid project for APU save', { projectId });
        toast.error('Selecciona un proyecto válido para guardar las partidas APU.');
        return false;
      }

      try {
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
      toast.error('Inicia sesión en una empresa para eliminar partidas APU.');
      return false;
    },
    []
  );

  const deleteAPUItemWithAuth = useCallback(
    async (itemId: string) => {
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

  return {
    saveAPUItems: companyId && currentUserId ? saveAPUItemsWithAuth : saveAPUItems,
    deleteAPUItem: companyId && currentUserId ? deleteAPUItemWithAuth : deleteAPUItem,
  };
}
