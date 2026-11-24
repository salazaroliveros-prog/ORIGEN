'use client';

import { useCallback, useEffect, useState } from 'react';

import type { CompanySettings, CompanyWorkspace } from '@/lib/types';
import {
  getAuthOrThrow,
  subscribeCompany,
  saveCompanySettingsToFirestore,
} from '@/lib/firebaseService';
import { subscribeToAuthState } from '@/lib/firebaseAuth';
import { ensureCompanyWorkspace } from '@/lib/companyWorkspace';
import { toast } from 'react-hot-toast';
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('useCompanyOnboarding');

export interface UseCompanyOnboardingReturn {
  company: CompanySettings | null;
  loading: boolean;
  hasCompany: boolean;
  error: string | null;
  createCompany: (
    settings: Omit<
      CompanySettings,
      'companyId' | 'ownerId' | 'logoUrl' | 'logoSmallUrl' | 'logoSquareUrl' | 'bannerUrl'
    >
  ) => Promise<boolean>;
}

function describeCompanyLookupError(error: Error): string {
  const message = error.message.toLowerCase();
  if (
    message.includes('permission-denied') ||
    message.includes('missing or insufficient permissions')
  ) {
    return 'No se pudo verificar el acceso a tu empresa. Revisa tus permisos o inicia sesión de nuevo.';
  }
  if (
    message.includes('unavailable') ||
    message.includes('network') ||
    message.includes('offline')
  ) {
    return 'No se pudo conectar con Firebase para verificar tu empresa. Revisa tu conexión e inténtalo de nuevo.';
  }
  return 'No se pudo Consultar la configuración de tu empresa. Inténtalo de nuevo.';
}

export function useCompanyOnboarding(): UseCompanyOnboardingReturn {
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCompany, setHasCompany] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeSettings: (() => void) | null = null;
    let activeUserId: string | null = null;

    const unsubscribeAuth = subscribeToAuthState(
      (user) => {
        // Al cambiar o cerrar sesión, primero se cierra la suscripción anterior.
        unsubscribeSettings?.();
        unsubscribeSettings = null;
        activeUserId = user?.uid ?? null;
        setCompany(null);
        setHasCompany(false);
        setError(null);

        if (!user) {
          setLoading(false);
          return;
        }

        setLoading(true);
        const userId = user.uid;
        // Changed from subscribeCompanySettings to subscribeCompany to read from companies collection
        // This aligns with the seed script which creates data in companies/{uid}
        unsubscribeSettings = subscribeCompany(
          userId,
          (data) => {
            // Evita que una notificación pendiente de una sesión anterior
            // sobrescriba la empresa del usuario autenticado actual.
            if (activeUserId !== userId) return;

            setLoading(false);
            setError(null);

            const record = data as (CompanySettings & Partial<CompanyWorkspace>) | null;
            const hasCompanyIdentity = Boolean(
              record &&
              [record.legalName, record.companyName, record.commercialName, record.name].some(
                (value) => typeof value === 'string' && value.trim().length > 0
              )
            );

            if (record && hasCompanyIdentity) {
              setCompany(data);
              setHasCompany(true);
            } else {
              setCompany(null);
              setHasCompany(false);
            }
          },
          (settingsError) => {
            if (activeUserId !== userId) return;
            log.error('No se pudo consultar la configuración de empresa.', settingsError);
            setLoading(false);
            setError(describeCompanyLookupError(settingsError));
          }
        );
      },
      (authError) => {
        log.error('No se pudo comprobar la sesión para el onboarding de empresa.', authError);
        unsubscribeSettings?.();
        unsubscribeSettings = null;
        activeUserId = null;
        setCompany(null);
        setHasCompany(false);
        setError('No se pudo comprobar la sesión. Recarga la página e inténtalo de nuevo.');
        setLoading(false);
      }
    );

    return () => {
      activeUserId = null;
      unsubscribeSettings?.();
      unsubscribeAuth();
    };
  }, []);

  return {
    company,
    loading,
    hasCompany,
    error,
    createCompany: async (settings: CompanySettings): Promise<boolean> => {
      // Placeholder implementation - pass companyId separately as required by the function signature
      const companyId = settings.companyId || '';
      return saveCompanySettingsToFirestore(settings, companyId)
        .then(() => true)
        .catch(() => false);
    },
  } as UseCompanyOnboardingReturn;
}
