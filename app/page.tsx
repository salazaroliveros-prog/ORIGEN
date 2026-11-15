/**
 * ORIGEN ERP - Página raíz
 * Redirige al usuario según su estado de autenticación y onboarding:
 * - No autenticado → /login
 * - Autenticado sin empresa → /onboarding/empresa
 * - Autenticado con empresa → ClientOnlyApp (aplicación principal)
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthSession } from '@/lib/hooks/useAuthSession';
import { useCompanyOnboarding } from '@/lib/hooks/useCompanyOnboarding';
import { ClientOnlyApp } from '@/components/ClientOnlyApp';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

export default function Page() {
  const router = useRouter();
  const { currentUser, status } = useAuthSession();
  const { hasCompany, loading: checkingCompany } = useCompanyOnboarding();
  const mounted = typeof window !== 'undefined';

  // Redireccionar a /login cuando no haya sesión activa y no se esté cargando
  useEffect(() => {
    if (!mounted || status === 'loading') return;
    if (status === 'unauthenticated' || status === 'error') {
      router.replace('/login');
    }
  }, [status, mounted, router]);

  // Redireccionar a onboarding cuando hay sesión pero no hay empresa
  useEffect(() => {
    if (!mounted || status !== 'authenticated' || !currentUser) return;
    if (checkingCompany) return;
    if (!hasCompany) {
      router.replace('/onboarding/empresa');
    }
  }, [status, currentUser, hasCompany, checkingCompany, mounted, router]);

  // Mientras se resuelve el estado de auth o onboarding, mostrar esqueleto ligero
  if (!mounted || status === 'loading' || checkingCompany) {
    return <LoadingScreen message="Cargando ConstructERP Guatemala…" />;
  }

  if (status === 'authenticated' && currentUser && hasCompany) {
    return <ClientOnlyApp />;
  }

  // No autenticado o sin empresa: se redirige en los effects de arriba
  return null;
}
