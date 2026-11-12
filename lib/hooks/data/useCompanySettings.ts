'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CompanySettings } from '@/lib/types';
import {
  subscribeCompanySettings,
  saveCompanySettingsToFirestore,
} from '@/lib/firebaseService';
import { toast } from 'react-hot-toast';
import { createLogger } from '@/lib/utils/logger';
import { queryCache, createCacheKey } from '@/lib/utils/cacheManager';

const log = createLogger('useCompanySettings');

export interface UseCompanySettingsOptions {
  companyId?: string;
}

export interface UseCompanySettingsReturn {
  company: CompanySettings | null;
  loading: boolean;
  saveCompanySettings: (settings: CompanySettings) => Promise<boolean>;
}

export function useCompanySettings({ companyId }: UseCompanySettingsOptions): UseCompanySettingsReturn {
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(false);
  const hasInitializedRef = useRef(false);
  const lastCompanyIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      if (!hasInitializedRef.current) return;
      log.debug('Missing companyId, clearing company settings');
      setCompany(null);
      setLoading(false);
      hasInitializedRef.current = false;
      lastCompanyIdRef.current = null;
      return;
    }

    if (hasInitializedRef.current && lastCompanyIdRef.current === companyId) return;

    hasInitializedRef.current = true;
    lastCompanyIdRef.current = companyId;

    log.info('Starting company settings subscription', { companyId });
    setLoading(true);

    const unsubCompany = subscribeCompanySettings(companyId, (data) => {
      log.debug('Company settings updated', { companyId });
      const cacheKey = createCacheKey('companySettings', { companyId });
      queryCache.set(cacheKey, data, 10 * 60 * 1000);
      setCompany(data ?? null);
      setLoading(false);
    });

    return () => {
      log.info('Unsubscribing from company settings');
      unsubCompany();
    };
  }, [companyId]);

  const saveCompanySettings = useCallback(
    async (settings: CompanySettings) => {
      if (!companyId) {
        toast.error('No hay empresa seleccionada.');
        return false;
      }

      try {
        log.info('Saving company settings', { companyId });
        const saved = await saveCompanySettingsToFirestore(settings, companyId);
        if (!saved) {
          log.error('Company settings save failed', { companyId });
          toast.error('No se pudo guardar la configuración de empresa.');
          return false;
        }

        log.info('Company settings saved successfully', { companyId });
        toast.success('Configuración guardada correctamente.');
        const cacheKey = createCacheKey('companySettings', { companyId });
        queryCache.clear(cacheKey);
        return true;
      } catch (err) {
        log.error('Company settings save error', err as Error, { companyId });
        toast.error('Error al guardar la configuración de empresa.');
        return false;
      }
    },
    [companyId]
  );

  return {
    company,
    loading,
    saveCompanySettings,
  };
}