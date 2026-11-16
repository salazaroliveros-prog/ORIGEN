'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CompanySettings } from '@/lib/types';
import { subscribeCompanySettings, saveCompanySettingsToFirestore } from '@/lib/firebaseService';
import { subscribeToAuthState } from '@/lib/firebaseAuth';
import { toast } from 'react-hot-toast';
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('useCompanyOnboarding');

export interface UseCompanyOnboardingReturn {
  /** Compañía del usuario actual (null si no tiene una creada) */
  company: CompanySettings | null;
  /** Indica si se está consultando/creando */
  loading: boolean;
  /** Indica si el usuario tiene empresa creada */
  hasCompany: boolean;
  /** Crea la empresa inicial para el usuario autenticado */
  createCompany: (
    settings: Omit<
      CompanySettings,
      'companyId' | 'ownerId' | 'logoUrl' | 'logoSmallUrl' | 'logoSquareUrl' | 'bannerUrl'
    >
  ) => Promise<boolean>;
}

export function useCompanyOnboarding(): UseCompanyOnboardingReturn {
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCompany, setHasCompany] = useState(false);

  useEffect(() => {
    let unsubscribeSettings: (() => void) | null = null;
    let activeUserId: string | null = null;

    const unsubscribeAuth = subscribeToAuthState(
      (user) => {
        // Al cambiar o cerrar sesión, primero se cierra la suscripción anterior.
        unsubscribeSettings?.();
        unsubscribeSettings = null;
        activeUserId = user?.uid ?? null;

        if (!user) {
          setCompany(null);
          setHasCompany(false);
          setLoading(false);
          return;
        }

        setLoading(true);
        const userId = user.uid;
        unsubscribeSettings = subscribeCompanySettings(userId, (data) => {
          // Evita que una notificación pendiente de una sesión anterior
          // sobrescriba la empresa del usuario autenticado actual.
          if (activeUserId !== userId) return;

          setLoading(false);
          if (data && data.legalName) {
            setCompany(data);
            setHasCompany(true);
          } else {
            setCompany(null);
            setHasCompany(false);
          }
        });
      },
      (error) => {
        log.error('No se pudo comprobar la sesión para el onboarding de empresa.', error);
        unsubscribeSettings?.();
        unsubscribeSettings = null;
        activeUserId = null;
        setCompany(null);
        setHasCompany(false);
        setLoading(false);
      }
    );

    return () => {
      activeUserId = null;
      unsubscribeSettings?.();
      unsubscribeAuth();
    };
  }, []);

  const createCompany = useCallback(
    async (
      settings: Omit<
        CompanySettings,
        'companyId' | 'ownerId' | 'logoUrl' | 'logoSmallUrl' | 'logoSquareUrl' | 'bannerUrl'
      >
    ): Promise<boolean> => {
      const { getAuthOrThrow } = await import('@/lib/firebaseService');
      const user = getAuthOrThrow().currentUser;
      if (!user) {
        toast.error('Inicia sesión para crear una empresa.');
        return false;
      }

      setLoading(true);
      try {
        const companyId = user.uid;
        const companyData: CompanySettings = {
          ...settings,
          companyId,
          ownerId: user.uid,
          logoUrl: undefined,
          logoSmallUrl: undefined,
          logoSquareUrl: undefined,
          bannerUrl: undefined,
        };

        const saved = await saveCompanySettingsToFirestore(companyData, companyId);
        if (saved) {
          setCompany(companyData);
          setHasCompany(true);
          toast.success('Empresa creada correctamente.');
          return true;
        }

        toast.error('No se pudo crear la empresa.');
        return false;
      } catch (error) {
        log.error('Error creating company', error as Error);
        toast.error('Error al crear la empresa.');
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    company,
    loading,
    hasCompany,
    createCompany,
  };
}
