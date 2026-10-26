import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '@/lib/firebaseService';
import type { CompanyInvitation, CompanyMembership, CompanyRole } from '@/lib/types';

const INVITATION_ROLES: Exclude<CompanyRole, 'owner'>[] = [
  'admin',
  'project_manager',
  'finance',
  'field_worker',
  'viewer',
];

export function subscribeCompanyMembers(
  companyId: string,
  callback: (members: CompanyMembership[]) => void,
  onError?: (error: string) => void
): Unsubscribe {
  const path = `companies/${companyId}/members`;
  try {
    return onSnapshot(
      collection(db, 'companies', companyId, 'members'),
      (snapshot) => callback(snapshot.docs.map((item) => item.data() as CompanyMembership)),
      (error) => onError?.(handleFirestoreError(error, OperationType.LIST, path).message)
    );
  } catch (error) {
    const firestoreError = handleFirestoreError(error, OperationType.LIST, path);
    onError?.(firestoreError.message);
    return () => {};
  }
}

export function subscribeCompanyInvitations(
  companyId: string,
  callback: (invitations: CompanyInvitation[]) => void,
  onError?: (error: string) => void
): Unsubscribe {
  const path = `companies/${companyId}/invitations`;
  try {
    return onSnapshot(
      query(
        collection(db, 'companies', companyId, 'invitations'),
        where('status', '==', 'pending')
      ),
      (snapshot) => callback(snapshot.docs.map((item) => item.data() as CompanyInvitation)),
      (error) => onError?.(handleFirestoreError(error, OperationType.LIST, path).message)
    );
  } catch (error) {
    const firestoreError = handleFirestoreError(error, OperationType.LIST, path);
    onError?.(firestoreError.message);
    return () => {};
  }
}

export async function createCompanyInvitation(
  companyId: string,
  email: string,
  role: Exclude<CompanyRole, 'owner'>,
  userId: string
): Promise<{ id: string; url: string }> {
  if (!INVITATION_ROLES.includes(role)) throw new Error('El rol seleccionado no se puede asignar por invitación.');
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error('Escribe una dirección de correo válida.');
  }
  if (!globalThis.crypto?.randomUUID) {
    throw new Error('Este navegador no permite generar un enlace seguro de invitación.');
  }

  const id = globalThis.crypto.randomUUID();
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  try {
    await setDoc(doc(db, 'companies', companyId, 'invitations', id), {
      id,
      companyId,
      email: normalizedEmail,
      role,
      status: 'pending',
      createdBy: userId,
      createdAt: serverTimestamp(),
      expiresAt,
    });
  } catch (error) {
    throw handleFirestoreError(error, OperationType.CREATE, `companies/${companyId}/invitations/${id}`);
  }

  const inviteUrl = new URL(window.location.origin);
  inviteUrl.searchParams.set('company', companyId);
  inviteUrl.searchParams.set('invite', id);
  return { id, url: inviteUrl.toString() };
}

export async function revokeCompanyInvitation(companyId: string, invitationId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'companies', companyId, 'invitations', invitationId));
  } catch (error) {
    throw handleFirestoreError(
      error,
      OperationType.DELETE,
      `companies/${companyId}/invitations/${invitationId}`
    );
  }
}

export async function removeCompanyMember(companyId: string, memberId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'companies', companyId, 'members', memberId));
  } catch (error) {
    throw handleFirestoreError(error, OperationType.DELETE, `companies/${companyId}/members/${memberId}`);
  }
}

export async function acceptCompanyInvitation(
  companyId: string,
  invitationId: string,
  user: User
): Promise<void> {
  if (!user.email || !user.emailVerified) {
    throw new Error('Verifica tu correo electrónico antes de aceptar la invitación.');
  }

  const invitationRef = doc(db, 'companies', companyId, 'invitations', invitationId);
  const memberRef = doc(db, 'companies', companyId, 'members', user.uid);
  let invitationSnapshot: Awaited<ReturnType<typeof getDoc>>;
  try {
    invitationSnapshot = await getDoc(invitationRef);
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'permission-denied'
    ) {
      throw new Error('No se pudo abrir la invitación. Verifica tu correo e inicia sesión con la dirección invitada.');
    }
    throw error;
  }
  if (!invitationSnapshot.exists()) throw new Error('La invitación no existe o fue revocada.');

  const invitation = invitationSnapshot.data() as CompanyInvitation;
  if (invitation.companyId !== companyId) throw new Error('La invitación no corresponde a esta empresa.');
  if (invitation.email !== user.email.trim().toLowerCase()) {
    throw new Error(`Inicia sesión con ${invitation.email} para aceptar esta invitación.`);
  }
  if (invitation.status !== 'pending') throw new Error('Esta invitación ya fue utilizada.');
  if (invitation.expiresAt.toDate().getTime() <= Date.now()) {
    throw new Error('La invitación venció. Solicita a un administrador que envíe otra.');
  }
  if (!INVITATION_ROLES.includes(invitation.role)) throw new Error('La invitación contiene un rol no válido.');

  const batch = writeBatch(db);
  batch.set(memberRef, {
    companyId,
    uid: user.uid,
    email: user.email.trim().toLowerCase(),
    role: invitation.role,
    joinedAt: new Date().toISOString(),
    invitationId,
  });
  batch.update(invitationRef, {
    status: 'accepted',
    acceptedBy: user.uid,
    acceptedAt: serverTimestamp(),
  });
  try {
    await batch.commit();
  } catch (error) {
    throw handleFirestoreError(error, OperationType.WRITE, `companies/${companyId}/invitations/${invitationId}`);
  }
}
