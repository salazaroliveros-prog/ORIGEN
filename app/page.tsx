/**
 * ORIGEN ERP - Página raíz
 * Redirige al usuario según su estado de autenticación:
 * - Autenticado → muestra la aplicación (ClientOnlyApp)
 * - No autenticado → redirige a la página dedicada de login (/login)
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthSession } from '@/lib/hooks/useAuthSession';
import { ClientOnlyApp } from '@/components/ClientOnlyApp';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

export default function Page() {
  const router = useRouter();
  const { currentUser, status } = useAuthSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redireccionar a /login cuando no haya sesión activa y no se esté cargando
  useEffect(() => {
    if (!mounted || status === 'loading') return;
    if (status === 'unauthenticated' || status === 'error') {
      router.replace('/login');
    }
  }, [status, mounted, router]);

  // Mientras se resuelve el estado de auth, mostrar esqueleto ligero
  if (!mounted || status === 'loading') {
    return <LoadingScreen message="Cargando ConstructERP Guatemala…" />;
  }

  if (status === 'authenticated' && currentUser) {
    return <ClientOnlyApp />;
  }

  // No autenticado: se redirige a /login en el effect de arriba
  return null;
}
