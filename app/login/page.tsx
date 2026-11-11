/**
 * ORIGEN ERP - Página de inicio de sesión dedicada
 * Diseño moderno ERP 2025-2026: glassmorphism, gradientes mesh,
 * micro-animaciones, autenticación social y branding dinámico.
 *
 * Flujo:
 * - Usuario no autenticado → muestra el formulario de login
 * - Usuario autenticado → redirecta al tablero (/)
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthSession } from '@/lib/hooks/useAuthSession';
import { LoginForm } from '@/components/auth/LoginForm';
import { LoginBackground } from '@/components/auth/LoginBackground';
import { Logo, LoginBrandingHeader } from '@/components/auth/LoginBranding';

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
      <main className="relative z-10 flex w-full flex-col items-center justify-center max-w-4xl">
        <LoginBrandingHeader />
        <div className="flex w-full flex-col lg:flex-row gap-8">
          {/* Panel de bienvenida (solo desktop) */}
          <div className="hidden lg:flex lg:flex-col lg:items-center lg:w-1/2">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
              <Logo className="h-7 w-7" />
            </div>
            <div className="mt-6 text-center">
              <h2 className="text-2xl font-bold tracking-tight text-slate-50">ConstructERP Guatemala</h2>
              <p className="mt-2 text-sm text-slate-400">
                Acceso seguro a tu panel de control de obras, presupuestos APU y planillas IGSS.
              </p>
            </div>
            <div className="mt-10 flex flex-col gap-4 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
                </span>
                Autenticación de dos factores opcional
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
                </span>
                Sesiones cifradas con Firebase
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
                </span>
                Cumplimiento normativo Guatemala (IGSS, COGUANOR)
              </div>
            </div>
          </div>

          {/* Formulario de login */}
          <div className="w-full lg:w-1/2 max-w-md">
            <LoginForm />
          </div>
        </div>

        <div className="mt-8 flex items-center gap-2 text-xs text-slate-500">
          <span className="relative">
            <span className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10"></span>
            </span>
            <span className="px-2">© 2024-2026 ORIGEN ERP</span>
          </span>
          <a
            href="/signup"
            className="font-medium text-brand-secondary hover:text-brand-secondary-hover transition-colors"
          >
            Crear cuenta
          </a>
        </div>
      </main>
    </div>
  );
}
