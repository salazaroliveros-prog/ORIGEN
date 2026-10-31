'use client';

import { useState } from 'react';
import { Mail, Lock, ArrowRight, AlertCircle, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { designTokens } from '@/lib/design-tokens';
import { useAuthSession } from '@/lib/hooks/useAuthSession';

interface RegisterFormProps {
  onAuthenticated: () => void;
  onLogin: () => void;
  className?: string;
}

export function RegisterForm({ onAuthenticated, onLogin, className }: RegisterFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { register, status } = useAuthSession();

  const isAuthenticating = status === 'loading' || isLoading;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Por favor completa todos los campos.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    try {
      setIsLoading(true);
      await register(email.trim(), password);
      onAuthenticated();
    } catch {
      setError('No se pudo crear la cuenta. Inténtalo con otro correo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    onLogin();
  };

  return (
    <Card variant="overlay" padding="lg" className={`${className} mx-auto w-full max-w-md`}>
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
          <UserPlus className="h-6 w-6" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-slate-100">Crear cuenta</h2>
        <p className="text-sm text-slate-400">Regístrate para acceder a ConstructERP Guatemala</p>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <Input
          label="Correo electrónico"
          type="email"
          placeholder="nombre@empresa.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail className="h-4 w-4" />}
          required
          autoComplete="email"
          disabled={isAuthenticating}
        />
        <Input
          label="Contraseña"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftIcon={<Lock className="h-4 w-4" />}
          required
          autoComplete="new-password"
          minLength={6}
          disabled={isAuthenticating}
        />
        <Input
          label="Confirmar contraseña"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          leftIcon={<Lock className="h-4 w-4" />}
          required
          autoComplete="new-password"
          disabled={isAuthenticating}
        />
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isAuthenticating}
          className="w-full"
          disabled={isAuthenticating}
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
              Creando cuenta...
            </>
          ) : (
            <>
              <ArrowRight className="mr-2 h-4 w-4" />
              Crear cuenta
            </>
          )}
        </Button>
      </form>

      <div className="mt-6 border-t border-white/10 pt-6">
        <p className="text-center text-sm text-slate-400">
          ¿Ya tienes una cuenta?{' '}
          <button
            onClick={handleLogin}
            className="font-medium text-amber-400 underline transition-colors hover:text-amber-300"
          >
            Inicia sesión
          </button>
        </p>
      </div>
    </Card>
  );
}
