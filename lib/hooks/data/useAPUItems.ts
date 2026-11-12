'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { APUItem, Project } from '@/lib/types';
import {
  subscribeAPUItems,
  saveAPUItemsToFirestore,
  deleteAPUItemFromFirestore,
} from '@/lib/firebaseService';
import { toast } from 'react-hot-toast';
import { createLogger } from '@/lib/utils/logger';
import { queryCache, createCacheKey } from '@/lib/utils/cacheManager';
import { validateAPUItem } from '@/lib/utils/calculations';

const log = createLogger('useAPUItems');

export interface UseAPUItemsOptions {
  companyId?: string;
  currentUserId?: string;
  projects?: Project[];
}

export interface UseAPUItemsReturn {
  apuItems: APUItem[];
  loading: boolean;
  saveAPUItems: (items: APUItem[], projectId: string) => Promise<boolean>;
  deleteAPUItem: (itemId: string) => Promise<boolean>;
}

export function useAPUItems({ companyId, currentUserId, projects = [] }: UseAPUItemsOptions): UseAPUItemsReturn {
  const [apuItems, setApuItems] = useState<APUItem[]>([]);
  const [loading, setLoading] = useState(false);
  const hasInitializedRef = useRef(false);
  const lastCompanyIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!companyId || !currentUserId) {
      if (!hasInitializedRef.current) return;
      log.debug('Missing auth context, clearing APU items');
      setApuItems([]);
      setLoading(false);
      hasInitializedRef.current = false;
      lastCompanyIdRef.current = null;
      return;
    }

    if (hasInitializedRef.current && lastCompanyIdRef.current === companyId) return;

    hasInitializedRef.current = true;
    lastCompanyIdRef.current = companyId;

    log.info('Starting APU items subscription', { companyId });
    setLoading(true);

    const unsubAPUItems = subscribeAPUItems(companyId, (nextItems) => {
      log.debug('APU items updated', { count: nextItems.length });
      const cacheKey = createCacheKey('apuItems', { companyId });
      queryCache.set(cacheKey, nextItems, 5 * 60 * 1000);
      setApuItems(nextItems);
      setLoading(false);
    });

    return () => {
      log.info('Unsubscribing from APU items');
      unsubAPUItems();
    };
  }, [companyId, currentUserId]);

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
        const validatedItems = items.map((item) => {
          try {
            return validateAPUItem(item);
          } catch (err) {
            log.error('APU item validation failed', err as Error, { itemCode: item.code });
            throw err;
          }
        });

        log.info('Saving APU items', { projectId, count: validatedItems.length });
        const saved = await saveAPUItemsToFirestore(validatedItems, projectId, companyId, currentUserId);

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
    apuItems,
    loading,
    saveAPUItems,
    deleteAPUItem,
  };
}