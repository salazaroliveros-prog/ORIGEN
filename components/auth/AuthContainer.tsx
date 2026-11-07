/**
 * ORIGEN ERP - Authentication Container Component
 * Implements secure login with rate limiting and enhanced UX
 *
 * Features:
 * - 5-attempt rate limiting with 15-minute lockout
 * - Password visibility toggle with eye icon
 * - Form validation with error messages
 * - Loading states during authentication
 * - Firebase Authentication integration
 */

'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { signInWithEmail, resetEmailPassword } from '@/lib/firebaseAuth';
import { Eye, EyeOff, AlertCircle, Loader } from 'lucide-react';
import { toast } from '@/lib/components/Toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface AuthError {
  email?: string;
  password?: string;
  general?: string;
}

export function AuthContainer(): React.ReactElement {
  // Form state
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
          // Still locked
          setIsLocked(true);
          const timeLeft = lockExpiry - now;
          setupLockTimer(timeLeft);
        } else {
          // Lock expired
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

  // Setup lock timer
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

  // Validate email format
  const validateEmailFormat = (emailStr: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(emailStr);
  };

  // Validate form helper
  const validateForm = useCallback((): boolean => {
    const newErrors: AuthError = {};

    if (!email.trim()) {
      newErrors.email = 'El correo es requerido';
    } else if (!validateEmailFormat(email)) {
      newErrors.email = 'Ingresa un correo válido';
    }

    if (!password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [email, password]);

  // Handle login
  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Check if locked
      if (isLocked) {
        toast.error('Cuenta temporalmente bloqueada. Intenta de nuevo en 15 minutos.');
        return;
      }

      // Validate form
      if (!validateForm()) {
        return;
      }

      // Check attempts
      if (loginAttempts >= 5) {
        setIsLocked(true);
        const lockDuration = 15 * 60 * 1000; // 15 minutes
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

        // Call Firebase authentication
        await signInWithEmail(email, password);
        // Success - reset attempts
        setLoginAttempts(0);
        localStorage.removeItem('loginAttempts');
        localStorage.removeItem('loginLockTime');
        setIsLocked(false);
        toast.success('Sesión iniciada correctamente.');
      } catch (error) {
        // Failed login - increment attempts
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        localStorage.setItem('loginAttempts', newAttempts.toString());

        const attemptsLeft = 5 - newAttempts;

        if (newAttempts >= 5) {
          // Lock on 5th failure
          setIsLocked(true);
          const lockDuration = 15 * 60 * 1000;
          const lockExpiry = Date.now() + lockDuration;

          localStorage.setItem('loginAttempts', '5');
          localStorage.setItem('loginLockTime', lockExpiry.toString());

          setupLockTimer(lockDuration);

          setErrors({
            general: 'Demasiados intentos fallidos. Cuenta bloqueada 15 min.',
          });
          toast.error('Cuenta bloqueada por demasiados intentos fallidos.');
        } else {
          setErrors({
            general: `Correo o contraseña incorrectos. ${attemptsLeft} intentos restantes.`,
          });
          toast.error(`Credenciales inválidas. ${attemptsLeft} intentos restantes.`);
        }
      } finally {
        setLoading(false);
      }
      // eslint-disable react-hooks/exhaustive-deps
    },
    [loginAttempts, router, rememberMe, email, isLocked, password, validateForm]
  );

  // Handle forgot password
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

  // Load remembered email on mount
  useEffect(() => {
    const remembered = localStorage.getItem('rememberEmail');
    if (remembered) {
      setEmail(remembered);
      setRememberMe(true);
    }
  }, []);

  // Calculate minutes left if locked
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
        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-md p-8 shadow-2xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-white">ORIGEN ERP</h1>
            <p className="text-slate-400">Sistema de Gestión de Proyectos</p>
          </div>

          {/* Account Locked Alert */}
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

          {/* General Error Alert */}
          {errors.general && !isLocked && (
            <div className="mb-6 flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
              <div>
                <p className="text-xs text-amber-600">{errors.general}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-300">
                Correo Electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: '' });
                }}
                onBlur={() => {
                  if (email && !validateEmailFormat(email)) {
                    setErrors({
                      ...errors,
                      email: 'Ingresa un correo válido',
                    });
                  }
                }}
                disabled={isLocked || loading}
                placeholder="tu@correo.com"
                className={`w-full rounded-lg border px-4 py-2 ${
                  errors.email ? 'border-red-500 bg-red-500/5' : 'border-white/10 bg-white/[0.03]'
                } text-white placeholder-slate-500 transition-all focus:border-transparent focus:ring-2 focus:outline-none focus:ring-brand-secondary/50 disabled:cursor-not-allowed disabled:opacity-50`}
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
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-300">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors({ ...errors, password: '' });
                  }}
                  disabled={isLocked || loading}
                  placeholder="••••••••"
                  className={`w-full rounded-lg border px-4 py-2 pr-12 ${
                    errors.password
                      ? 'border-red-500 bg-red-500/5'
                      : 'border-white/10 bg-white/[0.03]'
                  } text-white placeholder-slate-500 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-secondary/50 disabled:cursor-not-allowed disabled:opacity-50`}
                  aria-label="Contraseña"
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLocked || loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  title={showPassword ? 'Ocultar' : 'Mostrar'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p
                  id="password-error"
                  className="mt-1 flex items-center gap-1 text-xs text-red-400"
                >
                  <AlertCircle className="h-3 w-3" />
                  {errors.password}
                </p>
              )}
            </div>

            {/* Remember Me */}
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

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLocked || loading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 transition-all hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:opacity-50"
              aria-label="Iniciar sesión"
            >
              {loading ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          {/* Forgot Password Link */}
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

          {/* Divider */}
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

          {/* Security Notice */}
          <div className="mt-4 rounded-lg bg-white/[0.05] p-3">
            <p className="text-center text-xs text-slate-400">
              🔒 Tu información está protegida. Se bloquearán intentos después de 5 fallos.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-500">
          © 2024 ORIGEN ERP. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}

export default AuthContainer;
