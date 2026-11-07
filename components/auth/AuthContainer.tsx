/**
 * ORIGEN ERP - Authentication Container Component
 * Implements secure login with rate limiting and enhanced UX
 *
 * Features:
 * - 5-attempt rate limiting with 15-minute lockout
 * - Password visibility toggle with eye icon
 * - Form validation with zod schemas
 * - Loading states during authentication
 * - Firebase Authentication integration
 * - Shared UI components (Input, Button) for design system consistency
 */

'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { signInWithEmail, resetEmailPassword } from '@/lib/firebaseAuth';
import { Eye, EyeOff, AlertCircle, Loader } from 'lucide-react';
import { toast } from '@/lib/components/Toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { validateLoginForm, LoginFormValues } from '@/lib/validation/auth.schema';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface AuthError {
  email?: string;
  password?: string;
  general?: string;
}

export function AuthContainer(): React.ReactElement {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<AuthError>({});

  // Rate limiting state
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState<NodeJS.Timeout | null>(null);
  const lockTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Router
  const router = useRouter();

  // Load rate limiting state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('loginAttempts');
    const lockTime = localStorage.getItem('loginLockTime');

    if (saved) {
      const attempts = parseInt(saved);
      setLoginAttempts(attempts);

      if (lockTime) {
        const now = Date.now();
        const lockExpiry = parseInt(lockTime);

        if (now < lockExpiry) {
          setIsLocked(true);
          const timeLeft = lockExpiry - now;
          setupLockTimer(timeLeft);
        } else {
          localStorage.removeItem('loginAttempts');
          localStorage.removeItem('loginLockTime');
          setLoginAttempts(0);
        }
      }
    }

    return () => {
      if (lockTimerRef.current) {
        clearTimeout(lockTimerRef.current);
      }
    };
  }, []);

  const setupLockTimer = (duration: number) => {
    if (lockTimerRef.current) {
      clearTimeout(lockTimerRef.current);
    }

    lockTimerRef.current = setTimeout(() => {
      setIsLocked(false);
      setLoginAttempts(0);
      localStorage.removeItem('loginAttempts');
      localStorage.removeItem('loginLockTime');
      toast.success('Intento bloqueado expirado. Puedes intentar de nuevo.');
    }, duration);

    setLockTimer(lockTimerRef.current);
  };

  const validateEmailFormat = (emailStr: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(emailStr);
  };

  const validateForm = useCallback((): boolean => {
    const validation = validateLoginForm({ email, password });
    if (!validation.success) {
      const newErrors: AuthError = {};
      for (const issue of validation.error.issues) {
        const path = issue.path[0] as keyof LoginFormValues;
        newErrors[path] = issue.message;
      }
      setErrors(newErrors);
      return false;
    }
    setErrors({});
    return true;
  }, [email, password]);

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (isLocked) {
        toast.error('Cuenta temporalmente bloqueada. Intenta de nuevo en 15 minutos.');
        return;
      }

      if (!validateForm()) {
        return;
      }

      if (loginAttempts >= 5) {
        setIsLocked(true);
        const lockDuration = 15 * 60 * 1000;
        const lockExpiry = Date.now() + lockDuration;

        localStorage.setItem('loginAttempts', '5');
        localStorage.setItem('loginLockTime', lockExpiry.toString());

        setupLockTimer(lockDuration);

        toast.error('Demasiados intentos fallidos. Cuenta bloqueada por 15 minutos.');
        return;
      }

      try {
        setLoading(true);
        setErrors({});

        await signInWithEmail(email, password);
        setLoginAttempts(0);
        localStorage.removeItem('loginAttempts');
        localStorage.removeItem('loginLockTime');
        setIsLocked(false);
        toast.success('Sesión iniciada correctamente.');
      } catch (error) {
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        localStorage.setItem('loginAttempts', newAttempts.toString());

        const attemptsLeft = 5 - newAttempts;

        if (newAttempts >= 5) {
          setIsLocked(true);
          const lockDuration = 15 * 60 * 1000;
          const lockExpiry = Date.now() + lockDuration;

          localStorage.setItem('loginAttempts', '5');
          localStorage.setItem('loginLockTime', lockExpiry.toString());

          setupLockTimer(lockDuration);

          setErrors({ general: 'Demasiados intentos fallidos. Cuenta bloqueada 15 min.' });
          toast.error('Cuenta bloqueada por demasiados intentos fallidos.');
        } else {
          setErrors({ general: `Correo o contraseña incorrectos. ${attemptsLeft} intentos restantes.` });
          toast.error(`Credenciales inválidas. ${attemptsLeft} intentos restantes.`);
        }
      } finally {
        setLoading(false);
      }
    },
    [loginAttempts, router, rememberMe, email, isLocked, password, validateForm]
  );

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
      setLoading(true);
      await resetEmailPassword(email);
      toast.success('Correo de reseteo enviado. Revisa tu bandeja de entrada.');
      setErrors({});
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al resetear contraseña';
      setErrors({ general: message });
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const remembered = localStorage.getItem('rememberEmail');
    if (remembered) {
      setEmail(remembered);
      setRememberMe(true);
    }
  }, []);

  const getMinutesLeft = (): number => {
    const lockTime = localStorage.getItem('loginLockTime');
    if (!lockTime) return 0;

    const lockExpiry = parseInt(lockTime);
    const now = Date.now();
    const minutesLeft = Math.ceil((lockExpiry - now) / 60000);

    return Math.max(0, minutesLeft);
  };

  const minutesLeft = getMinutesLeft();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md">
        <Card variant="glass-l2" padding="lg" className="mx-auto w-full max-w-md shadow-glass-xl">
          <div className="mb-8 text-center">
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

          {errors.general && !isLocked && (
            <div className="mb-6 flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
              <div>
                <p className="text-xs text-amber-600">{errors.general}</p>
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
              onBlur={() => {
                if (email && !validateEmailFormat(email)) {
                  setErrors({ ...errors, email: 'Ingresa un correo válido' });
                }
              }}
              disabled={isLocked || loading}
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
              disabled={isLocked || loading}
              required
              autoComplete="current-password"
              minLength={6}
              error={errors.password}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLocked || loading}
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

            <div className="flex items-center gap-2">
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isLocked || loading}
                className="h-4 w-4 rounded border-white/10 bg-white/[0.03] text-amber-500 focus:ring-2 focus:ring-brand-secondary/50 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Recuérdame"
              />
              <label
                htmlFor="rememberMe"
                className="cursor-pointer text-sm text-slate-400 transition-colors hover:text-slate-300"
              >
                Recuérdame
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loading}
              disabled={isLocked || loading}
              className="w-full mt-2"
              aria-label="Iniciar sesión"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={!email || isLocked || loading}
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
