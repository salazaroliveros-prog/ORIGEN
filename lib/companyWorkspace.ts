import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '@/lib/firebaseService';
import type { CompanyMembership, CompanyWorkspace, CompanyWorkspaceOption } from '@/lib/types';
import { notifySyncEnd } from './hooks/useFirebaseSyncStatus';

const LEGACY_COLLECTIONS = [
  { name: 'projects', ownerField: 'ownerId' },
  { name: 'expenses', ownerField: 'authorId' },
  { name: 'fieldVisits', ownerField: 'authorId' },
  { name: 'attendance', ownerField: 'authorId' },
  { name: 'employees', ownerField: 'ownerId' },
  { name: 'companySettings', ownerField: 'ownerId' },
] as const;

/**
 * Adds companyId to legacy owner-scoped documents.
 *
 * Migration is best-effort: a document that cannot be updated (for example a
 * legacy record that no longer passes the security rules) is skipped and
 * reported, but it never prevents the workspace from loading.
 */
async function migrateLegacyCompanyData(ownerId: string): Promise<boolean> {
  let migrated = 0;
  let failed = 0;

  for (const legacyCollection of LEGACY_COLLECTIONS) {
    let legacyRecords;
    try {
      legacyRecords = await getDocs(
        query(
          collection(db, legacyCollection.name),
          where(legacyCollection.ownerField, '==', ownerId)
        )
      );
    } catch (error) {
      console.warn(`No se pudo leer ${legacyCollection.name} para migrar a la empresa:`, error);
      failed += 1;
      continue;
    }

    let batch = writeBatch(db);
    let batchSize = 0;

    const commitBatch = async () => {
      if (batchSize === 0) return;
      try {
        await batch.commit();
        migrated += batchSize;
      } catch (error) {
        console.warn(`No se pudo migrar un lote de ${legacyCollection.name}; se omite:`, error);
        failed += batchSize;
      }
      batch = writeBatch(db);
      batchSize = 0;
    };

    for (const record of legacyRecords.docs) {
      const originalData = record.data();
      if (originalData.companyId === ownerId) continue;

      batch.set(record.ref, { companyId: ownerId }, { merge: true });
      batchSize += 1;

      if (batchSize === 450) await commitBatch();
    }
    await commitBatch();
  }

  if (failed > 0) {
    console.warn(
      `Migración de empresa incompleta: ${migrated} documentos migrados, ${failed} omitidos.`
    );
  }
  notifySyncEnd();
  return failed === 0;
}

async function loadDirectWorkspace(
  user: User,
  preferredCompanyId?: string
): Promise<{
  workspace: CompanyWorkspace;
  membership: CompanyMembership;
  availableWorkspaces: CompanyWorkspaceOption[];
} | null> {
  const companyId = preferredCompanyId ?? user.uid;
  const membershipSnapshot = await getDoc(doc(db, 'companies', companyId, 'members', user.uid));
  if (!membershipSnapshot.exists()) return null;

  const companySnapshot = await getDoc(doc(db, 'companies', companyId));
  if (!companySnapshot.exists()) return null;

  const workspace = {
    ...companySnapshot.data(),
    id: companySnapshot.id,
  } as CompanyWorkspace;
  const membership = membershipSnapshot.data() as CompanyMembership;

  if (membership.role === 'owner' && workspace.dataSchemaVersion !== 1) {
    const migrationCompleted = await migrateLegacyCompanyData(workspace.ownerId);
    if (migrationCompleted) {
      await setDoc(doc(db, 'companies', workspace.id), { dataSchemaVersion: 1 }, { merge: true });
      workspace.dataSchemaVersion = 1;
    }
  }

  return { workspace, membership, availableWorkspaces: [{ workspace, membership }] };
}

export async function ensureCompanyWorkspace(
  user: User,
  preferredCompanyId?: string
): Promise<{
  workspace: CompanyWorkspace;
  membership: CompanyMembership;
  availableWorkspaces: CompanyWorkspaceOption[];
}> {
  let membershipSnapshots: QueryDocumentSnapshot<DocumentData>[] = [];

  try {
    const memberships = await getDocs(
      query(collectionGroup(db, 'members'), where('uid', '==', user.uid))
    );
    membershipSnapshots = memberships.docs;
  } catch (error) {
    console.warn(
      'No se pudo consultar la colección global de miembros; se intentará el acceso directo a la empresa.',
      error
    );
    const directWorkspace = await loadDirectWorkspace(user, preferredCompanyId);
    if (directWorkspace) return directWorkspace;
  }

  if (membershipSnapshots.length > 0) {
    const membershipSnapshot =
      membershipSnapshots.find((item) => item.data().companyId === preferredCompanyId) ??
      (preferredCompanyId ? undefined : membershipSnapshots[0]);
    if (!membershipSnapshot) {
      throw new Error('Tu cuenta no tiene acceso al espacio de trabajo seleccionado.');
    }
    const membership = membershipSnapshot.data() as CompanyMembership;
    const availableWorkspaces = (
      await Promise.all(
        membershipSnapshots.map(async (snapshot) => {
          const candidateMembership = snapshot.data() as CompanyMembership;
          const candidateWorkspace = await getDoc(
            doc(db, 'companies', candidateMembership.companyId)
          );
          if (!candidateWorkspace.exists()) return null;
          return {
            workspace: {
              ...candidateWorkspace.data(),
              id: candidateWorkspace.id,
            } as CompanyWorkspace,
            membership: candidateMembership,
          };
        })
      )
    ).filter((option): option is CompanyWorkspaceOption => option !== null);
    const selectedOption = availableWorkspaces.find(
      (option) => option.membership.companyId === membership.companyId
    );
    if (!selectedOption) {
      throw new Error('La empresa asociada a esta cuenta ya no está disponible.');
    }
    const { workspace } = selectedOption;
    if (membership.role === 'owner' && workspace.dataSchemaVersion !== 1) {
      const migrationCompleted = await migrateLegacyCompanyData(workspace.ownerId);
      if (migrationCompleted) {
        await setDoc(doc(db, 'companies', workspace.id), { dataSchemaVersion: 1 }, { merge: true });
        workspace.dataSchemaVersion = 1;
      }
    }
    return {
      workspace,
      membership,
      availableWorkspaces,
    };
  }

  if (preferredCompanyId) {
    throw new Error('Tu cuenta no tiene acceso al espacio de trabajo seleccionado.');
  }

  const companyRef = doc(db, 'companies', user.uid);
  const membershipRef = doc(db, 'companies', user.uid, 'members', user.uid);
  const existingCompany = await getDoc(companyRef);
  const workspace: CompanyWorkspace = existingCompany.exists()
    ? ({ ...existingCompany.data(), id: existingCompany.id } as CompanyWorkspace)
    : {
        id: user.uid,
        name: user.displayName?.trim() || 'Mi empresa',
        ownerId: user.uid,
        createdAt: new Date().toISOString(),
      };

  if (!existingCompany.exists()) {
    await setDoc(companyRef, workspace);
  } else if (workspace.ownerId !== user.uid) {
    throw new Error('No se encontró una membresía válida para esta empresa.');
  }

  const membership: CompanyMembership = {
    companyId: workspace.id,
    uid: user.uid,
    email: user.email ?? '',
    role: 'owner',
    joinedAt: new Date().toISOString(),
  };

  await setDoc(membershipRef, membership, { merge: true });
  if (workspace.dataSchemaVersion !== 1) {
    const migrationCompleted = await migrateLegacyCompanyData(user.uid);
    if (migrationCompleted) {
      await setDoc(companyRef, { dataSchemaVersion: 1 }, { merge: true });
      workspace.dataSchemaVersion = 1;
    }
  }

  return {
    workspace,
    membership,
    availableWorkspaces: [{ workspace, membership }],
  };
}
