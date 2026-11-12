'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FieldVisit } from '@/lib/types';
import {
  subscribeFieldVisits,
  saveFieldVisitToFirestore,
} from '@/lib/firebaseService';
import { toast } from 'react-hot-toast';
import { createLogger } from '@/lib/utils/logger';
import { queryCache, createCacheKey } from '@/lib/utils/cacheManager';

const log = createLogger('useFieldVisits');

export interface UseFieldVisitsOptions {
  companyId?: string;
  currentUserId?: string;
}

export interface UseFieldVisitsReturn {
  fieldVisits: FieldVisit[];
  loading: boolean;
  saveFieldVisit: (visit: FieldVisit) => Promise<boolean>;
}

export function useFieldVisits({ companyId, currentUserId }: UseFieldVisitsOptions): UseFieldVisitsReturn {
  const [fieldVisits, setFieldVisits] = useState<FieldVisit[]>([]);
  const [loading, setLoading] = useState(false);
  const hasInitializedRef = useRef(false);
  const lastCompanyIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!companyId || !currentUserId) {
      if (!hasInitializedRef.current) return;
      log.debug('Missing auth context, clearing field visits');
      setFieldVisits([]);
      setLoading(false);
      hasInitializedRef.current = false;
      lastCompanyIdRef.current = null;
      return;
    }

    if (hasInitializedRef.current && lastCompanyIdRef.current === companyId) return;

    hasInitializedRef.current = true;
    lastCompanyIdRef.current = companyId;

    log.info('Starting field visits subscription', { companyId });
    setLoading(true);

    const unsubFieldVisits = subscribeFieldVisits(companyId, (data) => {
      log.debug('Field visits updated', { count: data.length });
      const cacheKey = createCacheKey('fieldVisits', { companyId });
      queryCache.set(cacheKey, data, 5 * 60 * 1000);
      setFieldVisits(data);
      setLoading(false);
    });

    return () => {
      log.info('Unsubscribing from field visits');
      unsubFieldVisits();
    };
  }, [companyId, currentUserId]);

  const saveFieldVisit = useCallback(
    async (visit: FieldVisit) => {
      if (!companyId || !currentUserId) {
        log.warn('Field visit creation attempted without auth');
        toast.error('Usuario no autenticado');
        return false;
      }

      try {
        log.info('Saving field visit', { visitId: visit.id, projectId: visit.projectId });
        const saved = await saveFieldVisitToFirestore(visit, companyId, currentUserId);
        if (saved) {
          log.info('Field visit saved successfully', { visitId: visit.id });
          toast.success('Visita de campo guardada correctamente.');
          return true;
        }

        log.error('Field visit save failed in Firestore', { visitId: visit.id });
        toast.error('Error al guardar la visita de campo');
        return false;
      } catch (err) {
        log.error('Field visit save error', err as Error, { companyId });
        toast.error('Error inesperado al guardar la visita de campo');
        return false;
      }
    },
    [companyId, currentUserId]
  );

  return {
    fieldVisits,
    loading,
    saveFieldVisit,
  };
}