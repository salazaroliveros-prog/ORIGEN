'use client';

import { useAuthSession } from '@/lib/hooks/useAuthSession';
import { useCompanyWorkspace } from '@/lib/hooks/useCompanyWorkspace';
import type { AuthSessionStatus } from '@/lib/firebaseAuth';
import type { CompanyRole } from '@/lib/types';

export interface UseActiveWorkspaceReturn {
  /** Estado de la sesión de Firebase Auth. */
  status: AuthSessionStatus;
  /** Empresa activa real del usuario (cadena vacía mientras se resuelve). */
  companyId: string;
  /** UID del usuario autenticado (cadena vacía mientras se resuelve). */
  currentUserId: string;
  /** Rol del usuario en la empresa activa. */
  role?: CompanyRole;
  /** `true` cuando ya se conocen empresa y usuario. */
  ready: boolean;
  /** `true` mientras se resuelve sesión o empresa. */
  loading: boolean;
  /** Error legible al cargar el espacio de trabajo, si lo hay. */
  error: string | null;
}

/**
 * Resuelve el contexto real (empresa activa + usuario) de una página que vive
 * fuera de `MainApp` (FEL, cierre de proyecto, etc.).
 *
 * Esas páginas no heredan el `companyId` de la app principal. Sin este hook
 * terminaban llamando a los hooks de datos con `companyId: ''` y
 * `currentUserId: ''`: no se suscribían a nada y todas las escrituras
 * respondían "Usuario no autenticado".
 */
export function useActiveWorkspace(): UseActiveWorkspaceReturn {
  const { currentUser, status } = useAuthSession();
  const { workspace, membership, loading, error } = useCompanyWorkspace(currentUser);

  const companyId = workspace?.id ?? '';
  const currentUserId = currentUser?.uid ?? '';
  const ready = companyId !== '' && currentUserId !== '';

  return {
    status,
    companyId,
    currentUserId,
    role: membership?.role,
    ready,
    loading: status === 'loading' || (Boolean(currentUser) && loading),
    error,
  };
}
