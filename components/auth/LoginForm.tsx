/**
 * ORIGEN ERP - Login Form (rediseño moderno ERP 2025-2026)
 * Glassmorphism, validación en tiempo real, Google Auth, "Recordarme",
 * toggle claro/oscuro y animaciones con framer-motion.
 */

'use client';

import { useEffect, useState } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Sun, Moon, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useAuthSession } from '@/lib/hooks/useAuthSession';
import { signInWithPopup } from 'firebase/auth';
import { GoogleAuthProvider } from 'firebase/auth';
import { getAuthOrThrow } from '@/lib/firebaseService';
import { getAuthErrorMessageForMethod } from '@/lib/authErrors';
import { validateLoginForm, LoginFormValues } from '@/lib/validation/auth.schema';

const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
} as const;

export function LoginForm({ className }: { className?: string }) {
  const { signIn, status } = useAuthSession();
  const [theme, setThemeLocal] = useState<'dark' | 'light'>('dark');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof LoginFormValues, string>>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isAuthenticating = status === 'loading' || isLoading;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('constructerp_theme') as 'dark' | 'light' | null;
    if (saved === 'light' || saved === 'dark') setThemeLocal(saved);
    const remembered = localStorage.getItem('constructerp_remember_email');
    if (remembered) setEmail(remembered);
  }, []);

  const onEmailChange = (value: string) => {
    setEmail(value);
    setFieldErrors((prev) => ({ ...prev, email: '' }));
    setGeneralError(null);
  };

  const onPasswordChange = (value: string) => {
    setPassword(value);
    setFieldErrors((prev) => ({ ...prev, password: '' }));
    setGeneralError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setGeneralError(null);

    const validation = validateLoginForm({ email, password });
    if (!validation.success) {
      for (const issue of validation.error.issues) {
        const path = issue.path[0] as keyof LoginFormValues;
        setFieldErrors((prev) => ({ ...prev, [path]: issue.message }));
      }
      return;
    }

    try {
      setIsLoading(true);
      if (rememberMe) localStorage.setItem('constructerp_remember_email', email.trim());
      else localStorage.removeItem('constructerp_remember_email');
      await signIn(email.trim(), password);
    } catch (error) {
      const message = getAuthErrorMessageForMethod(error);
      setGeneralError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGeneralError(null);
    try {
      setIsLoading(true);
      const auth = getAuthOrThrow();
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      const message = getAuthErrorMessageForMethod(error, 'google');
      setGeneralError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setFieldErrors((prev) => ({ ...prev, email: 'Ingresa tu correo para restablecer la contraseña' }));
      return;
    }
    try {
      setIsLoading(true);
      const { resetEmailPassword } = await import('@/lib/firebaseAuth');
      await resetEmailPassword(email.trim());
      toast.success('Correo de restablecimiento enviado.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo restablecer la contraseña';
      setGeneralError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setThemeLocal(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('constructerp_theme', next);
      const root = document.documentElement;
      if (next === 'light') {
        root.classList.add('theme-light'); root.classList.remove('dark'); root.setAttribute('data-theme', 'light');
      } else {
        root.classList.remove('theme-light'); root.classList.add('dark'); root.setAttribute('data-theme', 'dark');
      }
    }
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeInUp} className={`${className} mx-auto w-full max-w-md`}>
      <div className="mb-8 flex flex-col items-start gap-3">
        <Badge variant="success" size="sm">Sin auto-login · Credenciales propias</Badge>
        <Badge variant="secondary" size="sm">Sesiones cifradas · Firebase Auth</Badge>
      </div>

      {generalError && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
          <AlertCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
          <span>{generalError}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-5">
        <Input
          label="Correo electrónico"
          type="email"
          placeholder="nombre@empresa.com"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          leftIcon={<Mail className="h-4 w-4" />}
          autoComplete={rememberMe ? 'email' : 'off'}
          autoCapitalize="none"
          error={fieldErrors.email}
          disabled={isAuthenticating}
          required
        />
        <div className="relative">
          <Input
            label="Contraseña"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            leftIcon={<Lock className="h-4 w-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                disabled={isAuthenticating}
                className="pointer-events-auto absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 transition-colors hover:text-slate-300 disabled:opacity-50"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            autoComplete={rememberMe ? 'current-password' : 'off'}
            error={fieldErrors.password}
            disabled={isAuthenticating}
            required
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            id="remember-me"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={isAuthenticating}
            className="h-4 w-4 rounded border-white/10 bg-white/[0.03] text-brand-secondary focus:ring-2 focus:ring-brand-secondary/50"
          />
          <label htmlFor="remember-me" className="text-sm text-slate-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            Recordarme
          </label>
        </div>

        <Button type="submit" variant="primary" size="lg" isLoading={isAuthenticating} className="w-full" disabled={isAuthenticating}>
          {isAuthenticating ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Accediendo…
            </>
          ) : (
            <>
              <ArrowRight className="mr-2 h-4 w-4" aria-hidden="true" />
              Iniciar sesión
            </>
          )}
        </Button>

        <div className="mt-6 border-t border-white/10 pt-6">
          <p className="mb-4 text-sm text-slate-400">
            ¿No tienes una cuenta?{' '}
            <Link href="/signup" className="font-medium text-brand-secondary underline underline-offset-4 hover:text-brand-secondary-hover transition-colors">
              Regístrate ahora
            </Link>
          </p>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10" /></div>
            <span className="relative flex -mx-3 items-center rounded-full bg-slate-950 px-3 text-xs text-slate-500">o continúa con</span>
          </div>

          <Button type="button" variant="outline" size="lg" onClick={handleGoogleLogin} disabled={isAuthenticating} className="w-full" leftIcon={<svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path d="M5.84 14.09c-.22-.66-.36-1.39-.36-2.19 0-.78.15-1.53.4-2.25H2.18v2.84c0 .81.17 1.56.45 2.19.47.99 1.45 1.69 2.67 1.98V19.6c-1.8-.39-3.04-1.57-3.48-3.48z" /><path d="M12 5.39c1.61 0 3.04.4 4.21 1.15l3.58-2.77C17.46 2.12 14.76 1 12 1 7.7 1 3.99 3.47 2.18 6.81l3.57 2.77c.76-.61 1.71-.98 2.72-.98.78 0 1.53.19 2.21.56V5.39z" /><path d="M12 1.5c-3.31 0-6.35 1.3-8.49 3.47l3.57 2.77c.97-.78 2.23-1.22 3.7-1.22.97 0 1.88.26 2.67.72V1.5z" /></svg>}>
            Continuar con Google
          </Button>

          <div className="mt-6 flex items-center justify-between">
            <button type="button" onClick={handleForgotPassword} disabled={!email.trim() || isAuthenticating} className="text-sm text-brand-secondary hover:text-brand-secondary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              ¿Olvidaste tu contraseña?
            </button>
            <button type="button" onClick={toggleTheme} className="text-sm text-slate-400 hover:text-slate-200 transition-colors" aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
              {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
          </div>

          <p className="mt-4 text-center text-xs text-slate-500">🔒 Tus datos están protegidos. Se bloquearán los intentos tras 5 fallos.</p>
        </div>
      </form>

      <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500">
        <span className="h-3 w-3 rounded-full bg-emerald-500" />
        <span>Sesión lista</span>
      </div>
    </motion.div>
  );
}

