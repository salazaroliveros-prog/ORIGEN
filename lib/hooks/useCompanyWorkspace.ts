'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import type { CompanyMembership, CompanyWorkspace, CompanyWorkspaceOption } from '@/lib/types';
import { ensureCompanyWorkspace } from '@/lib/companyWorkspace';
import { acceptCompanyInvitation } from '@/lib/companyInvitations';

export function useCompanyWorkspace(user: User | null) {
  const [workspace, setWorkspace] = useState<CompanyWorkspace | null>(null);
  const [membership, setMembership] = useState<CompanyMembership | null>(null);
  const [availableWorkspaces, setAvailableWorkspaces] = useState<CompanyWorkspaceOption[]>([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState<string | null>(null);
  const selectionRequestId = useRef(0);

  const selectWorkspace = useCallback(
    async (companyId: string) => {
      if (!user) return false;
      const requestId = ++selectionRequestId.current;
      setLoading(true);
      setError(null);
      try {
        const result = await ensureCompanyWorkspace(user, companyId);
        if (requestId !== selectionRequestId.current) return true;
        try {
          window.localStorage.setItem(`origen.active-workspace.v1.${user.uid}`, companyId);
        } catch (storageError) {
          console.warn('No se pudo guardar la empresa activa en este navegador:', storageError);
        }
        setWorkspace(result.workspace);
        setMembership(result.membership);
        setAvailableWorkspaces(result.availableWorkspaces);
        return true;
      } catch (cause) {
        if (requestId !== selectionRequestId.current) return true;
        const message =
          cause instanceof Error
            ? cause.message
            : 'No se pudo cambiar el espacio de trabajo.';
        setError(message);
        return false;
      } finally {
        if (requestId === selectionRequestId.current) setLoading(false);
      }
    },
    [user]
  );

  useEffect(() => {
    let isCurrent = true;
    selectionRequestId.current += 1;
    if (!user) {
      setWorkspace(null);
      setMembership(null);
      setAvailableWorkspaces([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const parameters = new URLSearchParams(window.location.search);
    const invitationId = parameters.get('invite');
    const invitationCompanyId = parameters.get('company');
    const prepareWorkspace = async () => {
      if (invitationId || invitationCompanyId) {
        if (!invitationId || !invitationCompanyId) {
          throw new Error('El enlace de invitación está incompleto. Solicita uno nuevo al administrador.');
        }
        await acceptCompanyInvitation(invitationCompanyId, invitationId, user);
        parameters.delete('invite');
        parameters.delete('company');
        const remainingQuery = parameters.toString();
        const cleanedUrl = `${window.location.pathname}${remainingQuery ? `?${remainingQuery}` : ''}${window.location.hash}`;
        window.history.replaceState(window.history.state, '', cleanedUrl);
      }
      let preferredCompanyId = invitationCompanyId ?? undefined;
      if (!preferredCompanyId) {
        try {
          preferredCompanyId =
            window.localStorage.getItem(`origen.active-workspace.v1.${user.uid}`) ?? undefined;
        } catch (storageError) {
          console.warn('No se pudo leer la empresa activa guardada en este navegador:', storageError);
        }
      }
      let result: Awaited<ReturnType<typeof ensureCompanyWorkspace>>;
      try {
        result = await ensureCompanyWorkspace(user, preferredCompanyId);
      } catch (error) {
        if (!preferredCompanyId || invitationCompanyId) throw error;
        console.warn('La empresa activa guardada ya no está disponible; se usará otra membresía válida.', error);
        try {
          window.localStorage.removeItem(`origen.active-workspace.v1.${user.uid}`);
        } catch (storageError) {
          console.warn('No se pudo limpiar la empresa activa guardada:', storageError);
        }
        result = await ensureCompanyWorkspace(user);
      }
      try {
        window.localStorage.setItem(`origen.active-workspace.v1.${user.uid}`, result.workspace.id);
      } catch (storageError) {
        console.warn('No se pudo guardar la empresa activa en este navegador:', storageError);
      }
      return result;
    };

    void prepareWorkspace()
      .then((result) => {
        if (!isCurrent) return;
        setWorkspace(result.workspace);
        setMembership(result.membership);
        setAvailableWorkspaces(result.availableWorkspaces);
      })
      .catch((cause: unknown) => {
        if (!isCurrent) return;
        const message =
          cause instanceof Error
            ? cause.message
            : 'No se pudo cargar el espacio de trabajo de la empresa.';
        setError(message);
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [user]);

  return { workspace, membership, availableWorkspaces, loading, error, selectWorkspace };
}
