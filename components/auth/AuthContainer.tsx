/**
 * ORIGEN ERP - Authentication Container Component
 * Implementa el inicio de sesión seguro usando el hook useAuthSession
 *
 * Características:
 * - Integración con Firebase Authentication
 * - Validación de credenciales con Zod schemas
 * - Estados de carga y error
 * - Compartidos componentes UI (Input, Button, Card)
 * - Toast notifications para feedback al usuario
 */

'use client';

import React, { useState } from 'react';
import { AlertCircle, Loader, Eye, EyeOff } from 'lucide-react';
import { toast } from '@/lib/components/Toast';
import { Link } from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthSession } from '@/lib/hooks/useAuthSession';
import { validateLoginForm, LoginFormValues } from '@/lib/validation/auth.schema';

export function AuthContainer(): React.ReactElement {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const { signIn, status } = useAuthSession();
  const isAuthenticating = status === 'loading' || isLoading;

  const validateEmailFormat = (emailStr: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(emailStr);
  };

  const validateForm = (): boolean => {
    const validation = validateLoginForm({ email, password });
    if (!validation.success) {
      const newErrors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const path = issue.path[0] as string;
        newErrors[path] = issue.message;
      }
      setErrors(newErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);
      await signIn(email.trim(), password);
      // El hook useAuthSession manejará el redireccionamiento vía auth state change
    } catch {
      // El error ya se muestra vía toast en el hook
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setErrors({ email: 'Ingresa tu correo para resetear la contraseña' });
      return;
    }

    if (!validateEmailFormat(email)) {
      setErrors({ email: 'Ingresa un correo válido' });
      return;
    }

    try {
      setIsLoading(true);
      const { resetEmailPassword } = await import('@/lib/firebaseAuth');
      await resetEmailPassword(email);
      toast.success('Correo de reseteo enviado. Revisa tu bandeja de entrada.');
      setErrors({});
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al resetear contraseña';
      setErrors({ general: message });
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const getMinutesLeft = (): number => {
    const lockTime = localStorage.getItem('loginLockTime');
    if (!lockTime) return 0;

    const lockExpiry = parseInt(lockTime);
    const now = Date.now();
    const minutesLeft = Math.ceil((lockExpiry - now) / 60000);

    return Math.max(0, minutesLeft);
  };

  const minutesLeft = getMinutesLeft();
  const isLocked = minutesLeft > 0;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md">
        <Card variant="glass-l2" padding="lg" className="mx-auto w-full max-w-md shadow-glass-xl">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6"
              >
                <path d="M22 12V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" />
                <path d="M14 12V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v8" />
                <path d="M22 18V14a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v4" />
              </svg>
            </div>
            <h1 className="mb-2 text-3xl font-bold text-white">ORIGEN ERP</h1>
            <p className="text-slate-400">Sistema de Gestión de Proyectos</p>
          </div>

          {isLocked && (
            <div className="mb-6 flex gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
              <div>
                <p className="text-sm font-semibold text-red-500">Cuenta Bloqueada</p>
                <p className="mt-1 text-xs text-red-400">
                  Demasiados intentos fallidos. Intenta de nuevo en {minutesLeft} minuto
                  {minutesLeft !== 1 ? 's' : ''}.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              id="email"
              label="Correo Electrónico"
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors({ ...errors, email: '' });
              }}
              disabled={isLocked || isAuthenticating}
              required
              autoComplete="email"
              error={errors.email}
              aria-label="Correo electrónico"
              aria-describedby={errors.email ? 'email-error' : undefined}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p id="email-error" className="mt-1 flex items-center gap-1 text-xs text-red-400">
                <AlertCircle className="h-3 w-3" />
                {errors.email}
              </p>
            )}

            <Input
              id="password"
              label="Contraseña"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors({ ...errors, password: '' });
              }}
              disabled={isLocked || isAuthenticating}
              required
              autoComplete="current-password"
              minLength={6}
              error={errors.password}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLocked || isAuthenticating}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              }
              aria-label="Contraseña"
              aria-describedby={errors.password ? 'password-error' : undefined}
              aria-invalid={!!errors.password}
            />
            {errors.password && (
              <p id="password-error" className="mt-1 flex items-center gap-1 text-xs text-red-400">
                <AlertCircle className="h-3 w-3" />
                {errors.password}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isAuthenticating}
              disabled={isLocked || isAuthenticating}
              className="mt-2 w-full"
              aria-label="Iniciar sesión"
            >
              {isAuthenticating ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Iniciando sesión...
                </>
              ) : (
                <>
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Iniciar Sesión
                </>
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={!email || isLocked || isAuthenticating}
              className="text-sm text-amber-400 transition-colors hover:text-amber-300 disabled:cursor-not-allowed disabled:text-slate-500"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <div className="mt-6 border-t border-slate-700 pt-6">
            <p className="text-center text-sm text-slate-400">
              ¿No tienes cuenta?{' '}
              <Link
                href="/signup"
                className="font-medium text-amber-400 transition-colors hover:text-amber-300"
              >
                Regístrate aquí
              </Link>
            </p>
          </div>

          <div className="mt-4 rounded-lg bg-white/[0.05] p-3">
            <p className="text-center text-xs text-slate-400">
              🔒 Tu información está protegida. Se bloquearán intentos después de 5 fallos.
            </p>
          </div>
        </Card>
      </div>

      <p className="mt-6 text-center text-xs text-slate-500">
        © 2024 ORIGEN ERP. Todos los derechos reservados.
      </p>
    </div>
  );
}

export default AuthContainer;
