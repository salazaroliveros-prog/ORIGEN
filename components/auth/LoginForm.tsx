'use client';

import { useState } from 'react';
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { designTokens } from '@/lib/design-tokens';
import { useAuthSession } from '@/lib/hooks/useAuthSession';

interface LoginFormProps {
  onAuthenticated: () => void;
  onRegister: () => void;
  className?: string;
}

export function LoginForm({ onAuthenticated, onRegister, className }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, register, status } = useAuthSession();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError('Por favor completa correo electrónico y contraseña.');
      return;
    }
    try {
      setIsLoading(true);
      await signIn(email.trim(), password);
      onAuthenticated();
    } catch {
      setError('Correo o contraseña incorrectos. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = () => {
    onRegister();
  };

  const isAuthenticating = status === 'loading' || isLoading;

  return (
    <Card variant="overlay" padding="lg" className={`${className} mx-auto w-full max-w-md`}>
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
          <Building2 className="h-6 w-6" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-slate-100">Iniciar sesión</h2>
        <p className="text-sm text-slate-400">Accede a tu panel de control de ConstructERP</p>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
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
          autoComplete="current-password"
          minLength={6}
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
              Accediendo...
            </>
          ) : (
            <>
              <ArrowRight className="mr-2 h-4 w-4" />
              Iniciar sesión
            </>
          )}
        </Button>
      </form>

      <div className="mt-6 border-t border-white/10 pt-6">
        <p className="mb-4 text-sm text-slate-400">
          ¿No tienes una cuenta?{' '}
          <button
            onClick={handleRegister}
            className="font-medium text-amber-400 underline transition-colors hover:text-amber-300"
          >
            Regístrate ahora
          </button>
        </p>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" size="sm">
            Sin auto-login
          </Badge>
          <Badge variant="success" size="sm">
            Credenciales propias
          </Badge>
        </div>
      </div>
    </Card>
  );
}

function Building2({ className }: { className?: string }) {
  return (
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
      className={className}
    >
      <path d="M22 12V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" />
      <path d="M14 12V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v8" />
      <path d="M22 18V14a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v4" />
    </svg>
  );
}
