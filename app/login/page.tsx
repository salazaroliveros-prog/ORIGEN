/**
 * ORIGEN ERP - Página de inicio de sesión
 * Formulario limpio y enfocado para autenticación.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthSession } from '@/lib/hooks/useAuthSession';
import { LoginForm } from '@/components/auth/LoginForm';
import { LoginBackground } from '@/components/auth/LoginBackground';
import { LoginBrandingHeader } from '@/components/auth/LoginBranding';

export default function LoginPage() {
  const router = useRouter();
  const { currentUser, status } = useAuthSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redireccionar si ya hay sesión activa
  useEffect(() => {
    if (!mounted) return;
    if (status === 'authenticated' && currentUser) {
      router.replace('/');
    }
  }, [status, currentUser, mounted, router]);

  // Mientras se resuelve el estado de auth, mostrar esqueleto ligero
  if (!mounted || status === 'loading') {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-full border-4 border-brand-primary/30 border-t-brand-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-ambient text-slate-100 px-4 pb-12">
      <LoginBackground />
      <main className="relative z-10 flex w-full flex-col items-center justify-center max-w-md">
        <LoginBrandingHeader />
        <LoginForm />
        <p className="mt-8 text-center text-xs text-slate-500">
          ¿No tienes una cuenta?{' '}
          <a href="/signup" className="font-medium text-brand-secondary hover:text-brand-secondary-hover transition-colors underline underline-offset-2">
            Regístrate
          </a>
        </p>
      </main>
    </div>
  );
}
