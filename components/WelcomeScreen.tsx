'use client';

import { Building2, Mail, Clock, CheckCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TouchTarget } from '@/components/ui/TouchTarget';
import { signOutUser } from '@/lib/firebaseAuth';
import type { User } from 'firebase/auth';
import toast from 'react-hot-toast';

interface WelcomeScreenProps {
  user: User;
  pendingInvitations?: number;
}

export function WelcomeScreen({ user, pendingInvitations = 0 }: WelcomeScreenProps) {
  const handleSignOut = async () => {
    try {
      await signOutUser();
      toast.success('Sesión cerrada');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cerrar sesión';
      toast.error(message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-primary/20 text-brand-primary">
          <Building2 className="h-10 w-10" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Bienvenido a ORIGEN ERP</h1>
          <p className="text-slate-400">
            Tu cuenta está lista, pero aún no tienes acceso a ninguna empresa
          </p>
        </div>

        <div className="space-y-4 rounded-lg border border-white/10 bg-white/[0.02] p-6 text-left">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-300">
            ¿Qué sigue?
          </h2>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
                <Mail className="h-3 w-3" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Espera una invitación</p>
                <p className="mt-1 text-xs text-slate-400">
                  Un administrador debe enviarte una invitación para unirte a una empresa
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sky-400">
                <Clock className="h-3 w-3" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Verifica tu correo</p>
                <p className="mt-1 text-xs text-slate-400">
                  Las invitaciones se envían a {user.email}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                <CheckCircle className="h-3 w-3" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Acepta la invitación</p>
                <p className="mt-1 text-xs text-slate-400">
                  Haz clic en el enlace del correo para aceptar y comenzar
                </p>
              </div>
            </div>
          </div>
        </div>

        {pendingInvitations > 0 && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="text-sm font-medium text-emerald-400">
              Tienes {pendingInvitations} invitación{pendingInvitations > 1 ? 'es' : ''} pendiente
              {pendingInvitations > 1 ? 's' : ''}
            </p>
            <p className="mt-1 text-xs text-emerald-300">
              Revisa tu correo para aceptar y comenzar a usar ORIGEN ERP
            </p>
          </div>
        )}

        <div className="space-y-3 pt-4">
          <Button onClick={() => window.location.reload()} className="w-full">
            Verificar Invitaciones
          </Button>

          <TouchTarget>
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="w-full text-slate-400 hover:text-white"
            >
              <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
              Cerrar Sesión
            </Button>
          </TouchTarget>
        </div>

        <div className="text-xs text-slate-500">
          <p>¿Eres el administrador principal?</p>
          <p className="mt-1">
            Si creaste la primera empresa, deberías tener acceso automáticamente. Si no, contacta al
            soporte técnico.
          </p>
        </div>
      </div>
    </div>
  );
}
