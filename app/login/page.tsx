/**
 * ORIGEN ERP - Página de inicio de sesión
 * Formulario limpio y enfocado para autenticación.
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthSession } from '@/lib/hooks/useAuthSession';
import { LoginForm } from '@/components/auth/LoginForm';
import { LoginBackground } from '@/components/auth/LoginBackground';
import { LoginBrandingHeader } from '@/components/auth/LoginBranding';

export default function LoginPage() {
  const router = useRouter();
  const { currentUser, status } = useAuthSession();
  const mounted = typeof window !== 'undefined';

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
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
        <div className="flex h-8 w-8 animate-spin items-center justify-center rounded-full border-4 border-brand-primary/30 border-t-brand-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-ambient px-4 pb-12 text-slate-100">
      <LoginBackground />
      <main className="relative z-10 flex w-full max-w-md flex-col items-center justify-center">
        <LoginBrandingHeader />
        <LoginForm />
        <p className="mt-8 text-center text-xs text-slate-500">
          ¿No tienes una cuenta?{' '}
          <a
            href="/signup"
            className="font-medium text-brand-secondary underline underline-offset-2 transition-colors hover:text-brand-secondary-hover"
          >
            Regístrate
          </a>
        </p>
      </main>
      <footer className="absolute bottom-0 left-0 right-0 z-10 py-4 text-center text-[11px] text-slate-500">
        ORIGEN ERP Guatemala ·{' '}
        <a href="/privacy" className="underline hover:text-slate-300">
          Política de Privacidad
        </a>{' '}
        ·{' '}
        <a href="/terms" className="underline hover:text-slate-300">
          Términos y Condiciones
        </a>
      </footer>
    </div>
  );
}
