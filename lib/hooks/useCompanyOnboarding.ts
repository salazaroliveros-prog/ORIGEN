'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CompanySettings } from '@/lib/types';
import { subscribeCompanySettings, saveCompanySettingsToFirestore } from '@/lib/firebaseService';
import { getAuthOrThrow } from '@/lib/firebaseService';
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
  const [loading, setLoading] = useState(false);
  const [hasCompany, setHasCompany] = useState(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    const auth = getAuthOrThrow();
    const user = auth.currentUser;
    if (!user) {
      setHasCompany(false);
      setCompany(null);
      checkedRef.current = true;
      return;
    }

    // companyId es el uid del usuario (según reglas de Firestore: companies/{companyId} con ownerId == auth.uid)
    const companyId = user.uid;
    setLoading(true);

    const unsubscribe = subscribeCompanySettings(
      companyId,
      (data) => {
        setLoading(false);
        checkedRef.current = true;
        if (data && data.legalName) {
          setCompany(data);
          setHasCompany(true);
        } else {
          setCompany(null);
          setHasCompany(false);
        }
      },
      (error) => {
        log.error('Company settings subscription failed', error);
        setLoading(false);
        checkedRef.current = true;
      }
    );

    return () => unsubscribe();
  }, []);

  const createCompany = useCallback(
    async (
      settings: Omit<
        CompanySettings,
        'companyId' | 'ownerId' | 'logoUrl' | 'logoSmallUrl' | 'logoSquareUrl' | 'bannerUrl'
      >
    ): Promise<boolean> => {
      const auth = getAuthOrThrow();
      const user = auth.currentUser;
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

        // Orden obligatorio para que `firestore.rules` lo permita:
        // 1) `companies/{uid}` (la regla de creación exige ownerId == auth.uid)
        // 2) `companies/{uid}/members/{uid}` con rol owner (la creación del
        //    perfil de empresa exige que ya exista una membresía con rol).
        // Sin este paso el registro falla siempre con `permission-denied`.
        await ensureCompanyWorkspace(user);

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
