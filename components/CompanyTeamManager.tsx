'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Check, Copy, Link2, LoaderCircle, Shield, Trash2, UserPlus, Users } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import {
  createCompanyInvitation,
  removeCompanyMember,
  revokeCompanyInvitation,
  subscribeCompanyInvitations,
  subscribeCompanyMembers,
} from '@/lib/companyInvitations';
import type {
  CompanyInvitation,
  CompanyMembership,
  CompanyRole,
  CompanySettings,
} from '@/lib/types';

const ROLE_LABELS: Record<CompanyRole, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  project_manager: 'Gerente de proyecto',
  finance: 'Finanzas',
  field_worker: 'Operaciones de campo',
  viewer: 'Solo lectura',
};

const INVITABLE_ROLES: Exclude<CompanyRole, 'owner'>[] = [
  'viewer',
  'field_worker',
  'finance',
  'project_manager',
  'admin',
];

interface CompanyTeamManagerProps {
  companyId: string;
  company?: CompanySettings;
  currentUserId: string;
  currentUserEmail?: string | null;
}

export function CompanyTeamManager({
  companyId,
  company,
  currentUserId,
  currentUserEmail,
}: CompanyTeamManagerProps) {
  const [members, setMembers] = useState<CompanyMembership[]>([]);
  const [invitations, setInvitations] = useState<CompanyInvitation[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Exclude<CompanyRole, 'owner'>>('viewer');
  const [inviteLink, setInviteLink] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    const unsubscribeMembers = subscribeCompanyMembers(companyId, setMembers, setError);
    const unsubscribeInvitations = subscribeCompanyInvitations(companyId, setInvitations, setError);
    return () => {
      unsubscribeMembers();
      unsubscribeInvitations();
    };
  }, [companyId]);

  const sendInvitation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const result = await createCompanyInvitation(companyId, email, role, currentUserId);
      setInviteLink(result.url);
      setEmail('');
      setCopySuccess(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear la invitación.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopySuccess(true);
      setError(null);
    } catch (cause) {
      console.error('No se pudo copiar el enlace de invitación:', cause);
      setError('El navegador no permitió copiar el enlace. Selecciónalo y cópialo manualmente.');
      setCopySuccess(false);
    }
  };

  const revokeInvite = async (invitationId: string) => {
    if (!window.confirm('¿Revocar esta invitación? El enlace dejará de funcionar.')) return;
    setPendingAction(invitationId);
    setError(null);
    try {
      await revokeCompanyInvitation(companyId, invitationId);
      if (inviteLink.includes(invitationId)) setInviteLink('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo revocar la invitación.');
    } finally {
      setPendingAction(null);
    }
  };

  const removeMember = async (member: CompanyMembership) => {
    if (member.uid === currentUserId) {
      setError('No puedes quitar tu propia cuenta desde esta pantalla.');
      return;
    }
    if (!window.confirm(`¿Quitar a ${member.email || member.uid} del espacio de trabajo?`)) return;
    setPendingAction(member.uid);
    setError(null);
    try {
      await removeCompanyMember(companyId, member.uid);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo quitar al miembro.');
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div className="responsive-container safe-area-top safe-area-bottom min-h-full space-y-5">
      <PageHeader
        title="Equipo de la empresa"
        subtitle="Invita personas al espacio compartido y asigna sólo los permisos que necesitan."
        logoUrl={company?.logoUrl}
        companyName={company?.companyName}
      />

      <Card variant="elevated" padding="lg">
        <div className="mb-4 flex items-start gap-3">
          <span className="rounded-xl bg-sky-500/10 p-2 text-sky-300">
            <UserPlus className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-semibold text-white">Invitar por correo</h2>
            <p className="mt-1 text-sm text-slate-400">
              El destinatario debe iniciar sesión con este mismo correo y verificarlo. Los enlaces
              vencen en 7 días y sólo se usan una vez.
            </p>
          </div>
        </div>
        <form
          onSubmit={(event) => void sendInvitation(event)}
          className="grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem_auto]"
        >
          <label className="space-y-1 text-sm text-slate-300">
            Correo electrónico
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="persona@empresa.com"
              required
              disabled={isLoading}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-500"
            />
          </label>
          <label className="space-y-1 text-sm text-slate-300">
            Rol inicial
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as Exclude<CompanyRole, 'owner'>)}
              disabled={isLoading}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            >
              {INVITABLE_ROLES.map((item) => (
                <option key={item} value={item}>
                  {ROLE_LABELS[item]}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isLoading}
            className="self-end"
          >
            {isLoading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            Crear invitación
          </Button>
        </form>

        {inviteLink && (
          <div className="mt-4 rounded-xl border border-sky-400/30 bg-sky-500/10 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-sky-100">
              <Link2 className="h-4 w-4" /> Enlace creado para compartir
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                readOnly
                aria-label="Enlace de invitación"
                value={inviteLink}
                onFocus={(event) => event.currentTarget.select()}
                className="min-w-0 flex-1 rounded-lg border border-sky-200/20 bg-slate-950 px-3 py-2 text-xs text-slate-200"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void copyInviteLink()}
              >
                {copySuccess ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copySuccess ? 'Copiado' : 'Copiar enlace'}
              </Button>
            </div>
            <p className="mt-2 text-xs text-slate-300">
              Comparte el enlace sólo con el destinatario. También puedes enviarlo con el módulo
              Correo &amp; Avisos.
            </p>
          </div>
        )}
        {error && (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
          >
            {error}
          </p>
        )}
        <p className="mt-3 text-xs text-slate-500">
          Administrador actual: {currentUserEmail || 'cuenta autenticada'}. Los enlaces incluyen un
          token de acceso privado.
        </p>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card variant="elevated" padding="lg">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-white">
            <Users className="h-5 w-5 text-sky-300" /> Miembros ({members.length})
          </h2>
          <ul className="divide-y divide-slate-800">
            {members.map((member) => (
              <li key={member.uid} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-100">
                    {member.email || member.uid}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                    <Shield className="h-3 w-3" /> {ROLE_LABELS[member.role]}
                    {member.uid === currentUserId && ' · Tú'}
                  </p>
                </div>
                {member.role !== 'owner' && member.uid !== currentUserId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pendingAction === member.uid}
                    onClick={() => void removeMember(member)}
                    aria-label={`Quitar a ${member.email || member.uid}`}
                  >
                    {pendingAction === member.uid ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-rose-300" />
                    )}
                  </Button>
                )}
              </li>
            ))}
            {members.length === 0 && (
              <li className="py-4 text-sm text-slate-400">No se encontraron miembros.</li>
            )}
          </ul>
        </Card>

        <Card variant="elevated" padding="lg">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-white">
            <Link2 className="h-5 w-5 text-amber-300" /> Invitaciones pendientes (
            {invitations.length})
          </h2>
          <ul className="divide-y divide-slate-800">
            {invitations.map((invitation) => (
              <li key={invitation.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-100">{invitation.email}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {ROLE_LABELS[invitation.role]} · vence{' '}
                    {invitation.expiresAt.toDate().toLocaleDateString('es-GT')}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pendingAction === invitation.id}
                  onClick={() => void revokeInvite(invitation.id)}
                  aria-label={`Revocar invitación para ${invitation.email}`}
                >
                  {pendingAction === invitation.id ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-rose-300" />
                  )}
                </Button>
              </li>
            ))}
            {invitations.length === 0 && (
              <li className="py-4 text-sm text-slate-400">No hay invitaciones pendientes.</li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
