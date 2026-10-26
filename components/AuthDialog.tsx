'use client';

import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { FocusTrap } from '@/components/a11y/FocusTrap';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getAuthErrorMessageForMethod } from '@/lib/authErrors';
import type { EmailAccountCreationResult } from '@/lib/firebaseAuth';

type AuthMode = 'sign-in' | 'sign-up' | 'reset-password';

interface AuthDialogProps {
  onClose: () => void;
  onSignInWithGoogle: () => Promise<unknown>;
  onSignInWithEmail: (email: string, password: string) => Promise<unknown>;
  onCreateAccount: (email: string, password: string) => Promise<EmailAccountCreationResult>;
  onResetPassword: (email: string) => Promise<void>;
}

export function AuthDialog({
  onClose,
  onSignInWithGoogle,
  onSignInWithEmail,
  onCreateAccount,
  onResetPassword,
}: AuthDialogProps) {
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setErrorMessage(null);
    setNotice(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setNotice(null);

    if (mode === 'sign-up' && password !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'reset-password') {
        await onResetPassword(email.trim());
        setNotice('Te enviamos un enlace para restablecer la contraseña. Revisa tu correo.');
        return;
      }

      if (mode === 'sign-up') {
        const result = await onCreateAccount(email.trim(), password);
        setPassword('');
        setConfirmPassword('');
        if (result.verificationEmailSent) {
          toast.success(
            'Cuenta creada y sesión iniciada. Revisa tu correo para verificar la dirección.'
          );
        } else {
          const verificationError = getAuthErrorMessageForMethod(
            result.verificationEmailError,
            'email'
          );
          toast.error(
            `Cuenta creada y sesión iniciada, pero no se envió el correo de verificación: ${verificationError}`
          );
        }
        onClose();
        return;
      } else {
        await onSignInWithEmail(email.trim(), password);
        toast.success('Sesión iniciada correctamente.');
      }
      onClose();
    } catch (error) {
      setErrorMessage(getAuthErrorMessageForMethod(error, 'email'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const user = await onSignInWithGoogle();
      if (user === null) return;
      toast.success('Sesión iniciada con Google.');
      onClose();
    } catch (error) {
      setErrorMessage(getAuthErrorMessageForMethod(error, 'google'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const title =
    mode === 'sign-up'
      ? 'Crear una cuenta'
      : mode === 'reset-password'
        ? 'Restablecer contraseña'
        : 'Iniciar sesión';

  return (
    <FocusTrap onEscape={onClose}>
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-dialog-title"
          className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-900 p-6 shadow-2xl sm:p-8"
        >
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 id="auth-dialog-title" className="text-xl font-bold text-white">
                {title}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Accede a ORIGEN para sincronizar tus proyectos y guardar cambios.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Cerrar ventana de autenticación"
              className="shrink-0 p-2"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          {mode !== 'reset-password' && (
            <>
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => void handleGoogleSignIn()}
                isLoading={isSubmitting}
                className="w-full gap-2"
              >
                <span aria-hidden="true" className="text-lg font-bold">
                  G
                </span>
                Continuar con Google
              </Button>

              <div className="my-5 flex items-center gap-3 text-xs text-slate-500">
                <span className="h-px flex-1 bg-white/10" />
                o con correo electrónico
                <span className="h-px flex-1 bg-white/10" />
              </div>
            </>
          )}

          <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
            <Input
              id="auth-email"
              label="Correo electrónico"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nombre@empresa.com"
              required
              disabled={isSubmitting}
            />

            {mode !== 'reset-password' && (
              <Input
                id="auth-password"
                label="Contraseña"
                type="password"
                autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
                disabled={isSubmitting}
              />
            )}

            {mode === 'sign-up' && (
              <Input
                id="auth-confirm-password"
                label="Confirmar contraseña"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={6}
                required
                disabled={isSubmitting}
              />
            )}

            {errorMessage && (
              <p
                role="alert"
                className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
              >
                {errorMessage}
              </p>
            )}
            {notice && (
              <p
                role="status"
                className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200"
              >
                {notice}
              </p>
            )}

            <Button type="submit" size="md" isLoading={isSubmitting} className="w-full">
              {mode === 'sign-up'
                ? 'Crear cuenta con correo'
                : mode === 'reset-password'
                  ? 'Enviar enlace de recuperación'
                  : 'Iniciar sesión con correo'}
            </Button>
          </form>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
            {mode === 'sign-in' && (
              <>
                <button
                  type="button"
                  onClick={() => changeMode('reset-password')}
                  className="text-sky-300 underline-offset-4 hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
                <button
                  type="button"
                  onClick={() => changeMode('sign-up')}
                  className="text-slate-300 underline-offset-4 hover:underline"
                >
                  Crear cuenta
                </button>
              </>
            )}
            {mode === 'sign-up' && (
              <button
                type="button"
                onClick={() => changeMode('sign-in')}
                className="text-sky-300 underline-offset-4 hover:underline"
              >
                Ya tengo una cuenta
              </button>
            )}
            {mode === 'reset-password' && (
              <button
                type="button"
                onClick={() => changeMode('sign-in')}
                className="text-sky-300 underline-offset-4 hover:underline"
              >
                Volver a iniciar sesión
              </button>
            )}
          </div>
        </section>
      </div>
    </FocusTrap>
  );
}
