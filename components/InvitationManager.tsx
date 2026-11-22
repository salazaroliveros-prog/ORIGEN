'use client';

import { useState, useEffect } from 'react';
import { UserPlus, X, Copy, Mail, Clock, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TouchTarget } from '@/components/ui/TouchTarget';
import {
  createCompanyInvitation,
  revokeCompanyInvitation,
  subscribeCompanyInvitations,
} from '@/lib/companyInvitations';
import type { CompanyInvitation, CompanyRole } from '@/lib/types';
import { INVITABLE_COMPANY_ROLES, roleLabel } from '@/lib/permissions';
import toast from 'react-hot-toast';

interface InvitationManagerProps {
  companyId: string;
  currentUserId: string;
}

export function InvitationManager({ companyId, currentUserId }: InvitationManagerProps) {
  const [invitations, setInvitations] = useState<CompanyInvitation[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Exclude<CompanyRole, 'owner'>>('viewer');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeCompanyInvitations(
      companyId,
      (data) => setInvitations(data),
      (err) => {
        console.error('Error loading invitations:', err);
        toast.error('Error al cargar invitaciones');
      }
    );

    return () => unsubscribe();
  }, [companyId]);

  const handleCreateInvitation = async () => {
    setError(null);
    try {
      const result = await createCompanyInvitation(companyId, email, role, currentUserId);

      // Copy URL to clipboard
      await navigator.clipboard.writeText(result.url);

      toast.success('Invitación creada y enlace copiado al portapapeles');
      setEmail('');
      setRole('viewer');
      setIsCreating(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear invitación';
      setError(message);
      toast.error(message);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      await revokeCompanyInvitation(companyId, invitationId);
      toast.success('Invitación revocada');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al revocar invitación';
      toast.error(message);
    }
  };

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Enlace copiado al portapapeles');
    } catch (err) {
      toast.error('Error al copiar enlace');
    }
  };

  const getDaysUntilExpiry = (expiresAt: any) => {
    const now = Date.now();
    const expiry = expiresAt.toDate().getTime();
    const days = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Invitaciones Pendientes</h3>
          <p className="text-sm text-slate-400">
            Invita a miembros del equipo a colaborar en esta empresa
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)} className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Nueva Invitación
        </Button>
      </div>

      {isCreating && (
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-base font-semibold text-white">Crear Nueva Invitación</h4>
            <button
              onClick={() => setIsCreating(false)}
              className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-300">
                Correo Electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@correo.com"
                className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>

            <div>
              <label htmlFor="role" className="mb-2 block text-sm font-medium text-slate-300">
                Rol
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as Exclude<CompanyRole, 'owner'>)}
                className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2.5 text-white focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              >
                {INVITABLE_COMPANY_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {roleLabel(r)}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-rose-500/10 p-3 text-rose-400">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleCreateInvitation}
                disabled={!email || isCreating}
                className="flex-1"
              >
                {isCreating ? 'Creando...' : 'Crear Invitación'}
              </Button>
              <Button variant="ghost" onClick={() => setIsCreating(false)} className="flex-1">
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {invitations.length === 0 && !isCreating && (
        <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
          <Mail className="mx-auto mb-4 h-12 w-12 text-slate-500" aria-hidden="true" />
          <p className="text-slate-400">No hay invitaciones pendientes</p>
          <p className="mt-1 text-sm text-slate-500">
            Crea una invitación para agregar nuevos miembros al equipo
          </p>
        </div>
      )}

      {invitations.length > 0 && (
        <div className="space-y-3">
          {invitations.map((invitation) => (
            <div
              key={invitation.id}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] p-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary/20 text-brand-primary">
                    <Mail className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{invitation.email}</p>
                    <p className="text-sm text-slate-400">{roleLabel(invitation.role)}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  <span>Expira en {getDaysUntilExpiry(invitation.expiresAt)} días</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <TouchTarget>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const url = new URL(window.location.origin);
                      url.searchParams.set('company', companyId);
                      url.searchParams.set('invite', invitation.id);
                      handleCopyLink(url.toString());
                    }}
                    aria-label="Copiar enlace de invitación"
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </TouchTarget>
                <TouchTarget>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevokeInvitation(invitation.id)}
                    aria-label="Revocar invitación"
                    className="text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </TouchTarget>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
