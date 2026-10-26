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
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '@/lib/firebaseService';
import type { CompanyMembership, CompanyWorkspace, CompanyWorkspaceOption } from '@/lib/types';

const LEGACY_COLLECTIONS = [
  { name: 'projects', ownerField: 'ownerId' },
  { name: 'expenses', ownerField: 'authorId' },
  { name: 'fieldVisits', ownerField: 'authorId' },
  { name: 'attendance', ownerField: 'authorId' },
  { name: 'employees', ownerField: 'ownerId' },
  { name: 'companySettings', ownerField: 'ownerId' },
] as const;

interface MigrationRecord {
  collection: string;
  docId: string;
  originalData: Record<string, unknown>;
}

async function migrateLegacyCompanyData(ownerId: string): Promise<void> {
  const migrations: MigrationRecord[] = [];

  try {
    for (const legacyCollection of LEGACY_COLLECTIONS) {
      const legacyRecords = await getDocs(
        query(
          collection(db, legacyCollection.name),
          where(legacyCollection.ownerField, '==', ownerId)
        )
      );

      let batch = writeBatch(db);
      let batchSize = 0;

      for (const record of legacyRecords.docs) {
        const originalData = record.data();
        if (originalData.companyId === ownerId) continue;

        // Save original data for potential rollback
        migrations.push({
          collection: legacyCollection.name,
          docId: record.id,
          originalData,
        });

        batch.set(record.ref, { companyId: ownerId }, { merge: true });
        batchSize += 1;

        if (batchSize === 450) {
          await batch.commit();
          batch = writeBatch(db);
          batchSize = 0;
        }
      }
      if (batchSize > 0) await batch.commit();
    }
  } catch (error) {
    // Rollback in case of failure
    console.error('Migration failed, attempting rollback:', error);
    for (const migration of migrations) {
      try {
        await setDoc(doc(db, migration.collection, migration.docId), migration.originalData, {
          merge: true,
        });
      } catch (rollbackError) {
        console.error('Rollback failed for', migration, rollbackError);
      }
    }
    throw error;
  }
}

export async function ensureCompanyWorkspace(
  user: User,
  preferredCompanyId?: string
): Promise<{
  workspace: CompanyWorkspace;
  membership: CompanyMembership;
  availableWorkspaces: CompanyWorkspaceOption[];
}> {
  const memberships = await getDocs(
    query(collectionGroup(db, 'members'), where('uid', '==', user.uid))
  );

  if (memberships.size > 0) {
    const membershipSnapshot =
      memberships.docs.find((item) => item.data().companyId === preferredCompanyId) ??
      (preferredCompanyId ? undefined : memberships.docs[0]);
    if (!membershipSnapshot) {
      throw new Error('Tu cuenta no tiene acceso al espacio de trabajo seleccionado.');
    }
    const membership = membershipSnapshot.data() as CompanyMembership;
    const availableWorkspaces = (
      await Promise.all(
        memberships.docs.map(async (snapshot) => {
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
      await migrateLegacyCompanyData(workspace.ownerId);
      await setDoc(doc(db, 'companies', workspace.id), { dataSchemaVersion: 1 }, { merge: true });
      workspace.dataSchemaVersion = 1;
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
    await migrateLegacyCompanyData(user.uid);
    await setDoc(companyRef, { dataSchemaVersion: 1 }, { merge: true });
    workspace.dataSchemaVersion = 1;
  }

  return {
    workspace,
    membership,
    availableWorkspaces: [{ workspace, membership }],
  };
}
