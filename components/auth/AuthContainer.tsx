'use client';

import { useEffect, useState } from 'react';
import { useAuthSession } from '@/lib/hooks/useAuthSession';
import { hasRegisteredUsers } from '@/lib/firebaseAuth';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, LogIn, UserPlus } from 'lucide-react';
import { designTokens } from '@/lib/design-tokens';

type AuthMode = 'login' | 'register';

interface AuthContainerProps {
  className?: string;
}

export function AuthContainer({ className }: AuthContainerProps) {
  const { currentUser, status, register, signIn } = useAuthSession();
  const [mode, setMode] = useState<AuthMode>('login');
  const [isSetupMode, setIsSetupMode] = useState<boolean | null>(null);
  const [showBack, setShowBack] = useState(false);

  useEffect(() => {
    const checkSetup = async () => {
      const hasUsers = await hasRegisteredUsers();
      setIsSetupMode(!hasUsers);
      setShowBack(hasUsers);
    };
    void checkSetup();
  }, []);

  if (currentUser && status === 'authenticated') {
    return null;
  }

  const isLoading = status === 'loading' || isSetupMode === null;

  if (isLoading) {
    return (
      <div
        className={`${className} flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-950`}
      >
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-3 border-amber-500 border-t-transparent" />
          <p className="text-sm text-slate-400">Cargando autenticación...</p>
        </div>
      </div>
    );
  }

  const handleAuthenticated = () => {
    window.location.reload();
  };

  const handleBack = () => {
    setMode('login');
    setShowBack(false);
  };

  return (
    <div
      className={`${className} flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-950 px-4`}
    >
      <Card variant="overlay" padding="lg" className="mx-auto w-full max-w-md">
        {/* Header con navegación */}
        {showBack && (
          <div className="mb-6 flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="text-slate-400 hover:text-slate-200"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </div>
        )}

        <div className="mb-8 text-center">
          {isSetupMode ? (
            <>
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                <UserPlus className="h-6 w-6" />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-slate-100">Primera configuración</h2>
              <p className="text-sm text-slate-400">
                Crea tu cuenta de administrador para comenzar
              </p>
            </>
          ) : (
            <>
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
                <LogIn className="h-6 w-6" />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-slate-100">Iniciar sesión</h2>
              <p className="text-sm text-slate-400">Accede a tu panel de control de ConstructERP</p>
            </>
          )}
        </div>

        {mode === 'login' ? (
          <LoginForm
            onAuthenticated={handleAuthenticated}
            onRegister={() => {
              setMode('register');
              setShowBack(true);
            }}
          />
        ) : (
          <RegisterForm
            onAuthenticated={handleAuthenticated}
            onLogin={() => {
              setMode('login');
              setShowBack(false);
            }}
          />
        )}
      </Card>
    </div>
  );
}
