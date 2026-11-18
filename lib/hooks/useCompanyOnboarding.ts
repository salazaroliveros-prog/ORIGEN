'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CompanySettings } from '@/lib/types';
import {
  getAuthOrThrow,
  subscribeCompanySettings,
  saveCompanySettingsToFirestore,
} from '@/lib/firebaseService';
import { subscribeToAuthState } from '@/lib/firebaseAuth';
import { ensureCompanyWorkspace } from '@/lib/companyWorkspace';
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
  /** Error recuperable al comprobar la empresa. */
  error: string | null;
  /** Crea la empresa inicial para el usuario autenticado */
  createCompany: (
    settings: Omit<
      CompanySettings,
      'companyId' | 'ownerId' | 'logoUrl' | 'logoSmallUrl' | 'logoSquareUrl' | 'bannerUrl'
    >
  ) => Promise<boolean>;
}

function describeCompanyLookupError(error: Error): string {
  const message = error.message.toLowerCase();
  if (message.includes('permission-denied') || message.includes('missing or insufficient permissions')) {
    return 'No se pudo verificar el acceso a tu empresa. Revisa tus permisos o inicia sesión de nuevo.';
  }
  if (message.includes('unavailable') || message.includes('network') || message.includes('offline')) {
    return 'No se pudo conectar con Firebase para verificar tu empresa. Revisa tu conexión e inténtalo de nuevo.';
  }
  return 'No se pudo consultar la configuración de tu empresa. Inténtalo de nuevo.';
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
        unsubscribeSettings = subscribeCompanySettings(
          userId,
          (data) => {
            // Evita que una notificación pendiente de una sesión anterior
            // sobrescriba la empresa del usuario autenticado actual.
            if (activeUserId !== userId) return;

            setLoading(false);
            setError(null);
            if (data && data.legalName) {
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

  const createCompany = useCallback(
    async (
      settings: Omit<
        CompanySettings,
        'companyId' | 'ownerId' | 'logoUrl' | 'logoSmallUrl' | 'logoSquareUrl' | 'bannerUrl'
      >
    ): Promise<boolean> => {
      const user = getAuthOrThrow().currentUser;
      if (!user) {
        toast.error('Inicia sesión para crear una empresa.');
        return false;
      }

      setLoading(true);
      setError(null);
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

        // Crear primero el workspace y la membresía owner: las reglas de
        // Firestore exigen ambos registros antes de guardar la configuración.
        await ensureCompanyWorkspace(user);

        const saved = await saveCompanySettingsToFirestore(companyData, companyId);
        if (saved) {
          setCompany(companyData);
          setHasCompany(true);
          setError(null);
          toast.success('Empresa creada correctamente.');
          return true;
        }

        setError('No se pudo guardar la configuración de empresa. Inténtalo de nuevo.');
        toast.error('No se pudo crear la empresa.');
        return false;
      } catch (createError) {
        log.error('Error creating company', createError as Error);
        setError('Ocurrió un error al crear la empresa. Inténtalo de nuevo.');
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
    error,
    createCompany,
  };
}
