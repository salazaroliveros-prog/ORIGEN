import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

const projectId = 'origen-erp-guatemala';
const companyId = 'company-apu-test';
const projectIdInCompany = 'project-apu-test';
const apuItem = {
  id: 'apu-item-test',
  companyId,
  projectId: projectIdInCompany,
  createdBy: 'finance-user',
  code: '03.01',
  description: 'Concreto de prueba',
  unit: 'm3',
  quantity: 1,
  materialUnitCostGTQ: 200,
  laborUnitCostGTQ: 100,
  equipmentUnitCostGTQ: 50,
  totalUnitCostGTQ: 350,
  totalPriceGTQ: 350,
};

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8'),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'companies', companyId), {
      id: companyId,
      ownerId: 'owner-user',
      name: 'Test company',
    });
    await setDoc(doc(db, 'companies', companyId, 'members', 'owner-user'), {
      uid: 'owner-user',
      companyId,
      email: 'owner@example.com',
      role: 'owner',
    });
    await setDoc(doc(db, 'companies', companyId, 'members', 'finance-user'), {
      uid: 'finance-user',
      companyId,
      email: 'finance@example.com',
      role: 'finance',
    });
    await setDoc(doc(db, 'companies', companyId, 'members', 'viewer-user'), {
      uid: 'viewer-user',
      companyId,
      email: 'viewer@example.com',
      role: 'viewer',
    });
    await setDoc(doc(db, 'companies', companyId, 'members', 'project-manager-user'), {
      uid: 'project-manager-user',
      companyId,
      email: 'manager@example.com',
      role: 'project_manager',
    });
    await setDoc(doc(db, 'companies', companyId, 'members', 'field-worker-user'), {
      uid: 'field-worker-user',
      companyId,
      email: 'worker@example.com',
      role: 'field_worker',
    });
    await setDoc(doc(db, 'projects', projectIdInCompany), { id: projectIdInCompany, companyId });
    await setDoc(doc(db, 'companies', 'another-company', 'members', 'finance-user'), {
      uid: 'finance-user',
      companyId: 'another-company',
      email: 'finance@example.com',
      role: 'finance',
    });
    await setDoc(doc(db, 'projects', 'foreign-project'), {
      id: 'foreign-project',
      companyId: 'another-company',
    });
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('Firestore APU permissions', () => {
  it('allows a new authenticated owner to create their initial workspace', async () => {
    const ownerDb = testEnv.authenticatedContext('new-owner-user').firestore();
    const companyRef = doc(ownerDb, 'companies', 'new-owner-user');

    const missingCompany = await assertSucceeds(getDoc(companyRef));
    expect(missingCompany.exists()).toBe(false);

    await assertSucceeds(
      setDoc(companyRef, {
        id: 'new-owner-user',
        ownerId: 'new-owner-user',
        name: 'Empresa nueva de prueba',
        createdAt: new Date().toISOString(),
      })
    );
    await assertSucceeds(
      setDoc(doc(ownerDb, 'companies', 'new-owner-user', 'members', 'new-owner-user'), {
        uid: 'new-owner-user',
        companyId: 'new-owner-user',
        email: 'new-owner@example.test',
        role: 'owner',
        joinedAt: new Date().toISOString(),
      })
    );
  });

  it('allows users to check only their own missing company settings document', async () => {
    const ownerDb = testEnv.authenticatedContext('new-owner-user').firestore();
    const missingOwnSettings = await assertSucceeds(
      getDoc(doc(ownerDb, 'companySettings', 'new-owner-user'))
    );
    expect(missingOwnSettings.exists()).toBe(false);

    await assertFails(getDoc(doc(ownerDb, 'companySettings', 'another-user')));
  });

  it('allows owners to create and read their own company settings document', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'companies', 'new-owner-user'), {
        id: 'new-owner-user',
        ownerId: 'new-owner-user',
        name: 'Empresa de prueba',
      });
      await setDoc(doc(db, 'companies', 'new-owner-user', 'members', 'new-owner-user'), {
        uid: 'new-owner-user',
        companyId: 'new-owner-user',
        email: 'new-owner@example.test',
        role: 'owner',
      });
    });

    const ownerDb = testEnv.authenticatedContext('new-owner-user').firestore();
    const settingsRef = doc(ownerDb, 'companySettings', 'new-owner-user');

    await assertSucceeds(
      setDoc(settingsRef, {
        legalName: 'Empresa de prueba S.A.',
        commercialName: 'Empresa de prueba',
        companyId: 'new-owner-user',
        ownerId: 'new-owner-user',
      })
    );

    const savedSettings = await assertSucceeds(getDoc(settingsRef));
    expect(savedSettings.data()).toMatchObject({
      legalName: 'Empresa de prueba S.A.',
      commercialName: 'Empresa de prueba',
      companyId: 'new-owner-user',
      ownerId: 'new-owner-user',
    });
  });

  it('allows owners to list only their own legacy records while migrating them', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'companies', 'owner-user'), {
        id: 'owner-user',
        ownerId: 'owner-user',
        name: 'Legacy owner company',
      });
      await setDoc(doc(db, 'companies', 'owner-user', 'members', 'owner-user'), {
        uid: 'owner-user',
        companyId: 'owner-user',
        email: 'owner@example.com',
        role: 'owner',
      });
      await setDoc(doc(db, 'attendance', 'legacy-attendance'), {
        id: 'legacy-attendance',
        authorId: 'owner-user',
      });
      await setDoc(doc(db, 'employees', 'legacy-employee'), {
        id: 'legacy-employee',
        ownerId: 'owner-user',
        name: 'Trabajador heredado',
      });
    });

    const ownerDb = testEnv.authenticatedContext('owner-user').firestore();
    const financeDb = testEnv.authenticatedContext('finance-user').firestore();

    await assertSucceeds(
      getDocs(query(collection(ownerDb, 'attendance'), where('authorId', '==', 'owner-user')))
    );
    await assertSucceeds(
      getDocs(query(collection(ownerDb, 'employees'), where('ownerId', '==', 'owner-user')))
    );
    await assertSucceeds(
      updateDoc(doc(ownerDb, 'attendance', 'legacy-attendance'), { companyId: 'owner-user' })
    );
    await assertSucceeds(
      updateDoc(doc(ownerDb, 'employees', 'legacy-employee'), { companyId: 'owner-user' })
    );
    await assertFails(
      getDocs(query(collection(financeDb, 'attendance'), where('authorId', '==', 'owner-user')))
    );
    await assertFails(
      getDocs(query(collection(financeDb, 'employees'), where('ownerId', '==', 'owner-user')))
    );
  });

  it('protects full employee records while allowing field roles to read the minimal directory', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'employees', 'employee-private'), {
        id: 'employee-private',
        companyId,
        ownerId: companyId,
        name: 'Persona de prueba',
        role: 'Albañil',
        dailyRateGTQ: 250,
        igssAffiliated: true,
        phone: '+502 0000-0000',
      });
      await setDoc(doc(db, 'employeeDirectory', 'employee-private'), {
        id: 'employee-private',
        companyId,
        name: 'Persona de prueba',
        role: 'Albañil',
      });
      await setDoc(doc(db, 'attendance', 'attendance-private'), {
        id: 'attendance-private',
        companyId,
        projectId: projectIdInCompany,
        employeeId: 'employee-private',
        employeeName: 'Persona de prueba',
      });
    });

    const financeDb = testEnv.authenticatedContext('finance-user').firestore();
    const managerDb = testEnv.authenticatedContext('project-manager-user').firestore();
    const fieldDb = testEnv.authenticatedContext('field-worker-user').firestore();
    const viewerDb = testEnv.authenticatedContext('viewer-user').firestore();

    await assertSucceeds(getDoc(doc(financeDb, 'employees', 'employee-private')));
    await assertSucceeds(
      getDocs(query(collection(financeDb, 'employees'), where('companyId', '==', companyId)))
    );
    await assertFails(getDoc(doc(managerDb, 'employees', 'employee-private')));
    await assertFails(getDoc(doc(fieldDb, 'employees', 'employee-private')));
    await assertFails(
      getDocs(query(collection(viewerDb, 'employees'), where('companyId', '==', companyId)))
    );
    await assertSucceeds(getDoc(doc(managerDb, 'employeeDirectory', 'employee-private')));
    await assertSucceeds(getDoc(doc(fieldDb, 'employeeDirectory', 'employee-private')));
    await assertSucceeds(
      getDocs(query(collection(fieldDb, 'employeeDirectory'), where('companyId', '==', companyId)))
    );
    await assertFails(getDoc(doc(viewerDb, 'employeeDirectory', 'employee-private')));
    await assertFails(getDoc(doc(viewerDb, 'attendance', 'attendance-private')));
    await assertFails(
      setDoc(doc(financeDb, 'employeeDirectory', 'leaky-directory-entry'), {
        id: 'leaky-directory-entry',
        companyId,
        name: 'Persona de prueba',
        role: 'Albañil',
        dailyRateGTQ: 250,
      })
    );
  });

  it('allows privileged personnel writes to create the full record and minimal directory atomically', async () => {
    const financeDb = testEnv.authenticatedContext('finance-user').firestore();
    const batch = writeBatch(financeDb);
    batch.set(doc(financeDb, 'employees', 'employee-write-test'), {
      id: 'employee-write-test',
      companyId,
      ownerId: companyId,
      name: 'Persona nueva',
      role: 'Albañil',
      dailyRateGTQ: 250,
      igssAffiliated: true,
      phone: '+502 0000-0000',
    });
    batch.set(doc(financeDb, 'employeeDirectory', 'employee-write-test'), {
      id: 'employee-write-test',
      companyId,
      name: 'Persona nueva',
      role: 'Albañil',
    });
    await assertSucceeds(batch.commit());

    const fieldDb = testEnv.authenticatedContext('field-worker-user').firestore();
    const fieldBatch = writeBatch(fieldDb);
    fieldBatch.set(doc(fieldDb, 'employees', 'employee-field-test'), {
      id: 'employee-field-test',
      companyId,
      ownerId: companyId,
      name: 'No autorizado',
      role: 'Ayudante',
    });
    fieldBatch.set(doc(fieldDb, 'employeeDirectory', 'employee-field-test'), {
      id: 'employee-field-test',
      companyId,
      name: 'No autorizado',
      role: 'Ayudante',
    });
    await assertFails(fieldBatch.commit());
  });

  it('allows archiving a project without deleting its linked operational records', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'projects', projectIdInCompany), {
        id: projectIdInCompany,
        companyId,
        ownerId: companyId,
        code: 'P-001',
        name: 'Proyecto de prueba',
        client: 'Cliente de prueba',
        budgetTotal: 1000,
        spentTotal: 100,
        status: 'En Ejecución',
      });
      await setDoc(doc(db, 'expenses', 'expense-archive-test'), {
        id: 'expense-archive-test',
        companyId,
        projectId: projectIdInCompany,
        authorId: 'owner-user',
      });
    });

    const db = testEnv.authenticatedContext('owner-user').firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'projects', projectIdInCompany), {
        status: 'Archivado',
        archivedAt: new Date().toISOString(),
        archivedFromStatus: 'En Ejecución',
      })
    );
    await assertSucceeds(getDoc(doc(db, 'expenses', 'expense-archive-test')));
    const archivedProject = await assertSucceeds(getDoc(doc(db, 'projects', projectIdInCompany)));
    expect(archivedProject.data()?.status).toBe('Archivado');
  });

  it('allows a member to discover only their own memberships across companies', async () => {
    const db = testEnv.authenticatedContext('finance-user').firestore();
    const memberships = await assertSucceeds(
      getDocs(query(collectionGroup(db, 'members'), where('uid', '==', 'finance-user')))
    );
    expect(memberships.docs.map((membership) => membership.data().companyId).sort()).toEqual([
      'another-company',
      companyId,
    ]);
    await assertFails(getDocs(collectionGroup(db, 'members')));
    await assertFails(
      getDocs(query(collectionGroup(db, 'members'), where('uid', '==', 'owner-user')))
    );
  });

  it('allows finance members to create a valid APU item for their company project', async () => {
    const db = testEnv.authenticatedContext('finance-user').firestore();
    await assertSucceeds(setDoc(doc(db, 'apuItems', apuItem.id), apuItem));
  });

  it('denies viewers permission to create APU items', async () => {
    const db = testEnv.authenticatedContext('viewer-user').firestore();
    await assertFails(setDoc(doc(db, 'apuItems', apuItem.id), apuItem));
  });

  it('denies assigning an APU item to a project owned by another company', async () => {
    const db = testEnv.authenticatedContext('finance-user').firestore();
    await assertFails(
      setDoc(doc(db, 'apuItems', apuItem.id), {
        ...apuItem,
        projectId: 'foreign-project',
      })
    );
  });

  it('denies unauthenticated reads of company APU items', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'apuItems', apuItem.id), apuItem);
    });
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'apuItems', apuItem.id)));
  });

  it('allows finance members to update but not move an APU item to another project', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'apuItems', apuItem.id), apuItem);
    });
    const db = testEnv.authenticatedContext('finance-user').firestore();
    await assertSucceeds(
      setDoc(doc(db, 'apuItems', apuItem.id), {
        ...apuItem,
        description: 'Concreto actualizado',
      })
    );
    await assertFails(
      setDoc(doc(db, 'apuItems', apuItem.id), {
        ...apuItem,
        projectId: 'foreign-project',
      })
    );
  });

  it('allows administrators to create invitations for assignable roles, but never owner invitations', async () => {
    const db = testEnv.authenticatedContext('owner-user').firestore();
    const invitation = {
      id: 'invite-valid',
      companyId,
      email: 'invitee@example.com',
      role: 'viewer',
      status: 'pending',
      createdBy: 'owner-user',
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 3 * 24 * 60 * 60 * 1000),
    };
    await assertSucceeds(
      setDoc(doc(db, 'companies', companyId, 'invitations', invitation.id), invitation)
    );
    await assertFails(
      setDoc(doc(db, 'companies', companyId, 'invitations', 'invite-owner'), {
        ...invitation,
        id: 'invite-owner',
        role: 'owner',
      })
    );
  });

  it('lets only the verified invited email read an unexpired invitation', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'companies', companyId, 'invitations', 'invite-read'), {
        id: 'invite-read',
        companyId,
        email: 'invitee@example.com',
        role: 'viewer',
        status: 'pending',
        createdBy: 'owner-user',
        expiresAt: Timestamp.fromMillis(Date.now() + 3 * 24 * 60 * 60 * 1000),
      });
    });
    const invitedDb = testEnv
      .authenticatedContext('invitee-user', {
        email: 'invitee@example.com',
        email_verified: true,
      })
      .firestore();
    const wrongEmailDb = testEnv
      .authenticatedContext('other-user', {
        email: 'other@example.com',
        email_verified: true,
      })
      .firestore();
    const unverifiedDb = testEnv
      .authenticatedContext('invitee-unverified', {
        email: 'invitee@example.com',
        email_verified: false,
      })
      .firestore();
    const invitePath = doc(invitedDb, 'companies', companyId, 'invitations', 'invite-read');
    await assertSucceeds(getDoc(invitePath));
    await assertFails(
      getDoc(doc(wrongEmailDb, 'companies', companyId, 'invitations', 'invite-read'))
    );
    await assertFails(
      getDoc(doc(unverifiedDb, 'companies', companyId, 'invitations', 'invite-read'))
    );
  });

  it('accepts a valid invitation atomically and prevents changing its assigned role', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'companies', companyId, 'invitations', 'invite-accept'),
        {
          id: 'invite-accept',
          companyId,
          email: 'invitee@example.com',
          role: 'finance',
          status: 'pending',
          createdBy: 'owner-user',
          expiresAt: Timestamp.fromMillis(Date.now() + 3 * 24 * 60 * 60 * 1000),
        }
      );
    });
    const db = testEnv
      .authenticatedContext('invitee-user', {
        email: 'invitee@example.com',
        email_verified: true,
      })
      .firestore();
    const batch = writeBatch(db);
    batch.set(doc(db, 'companies', companyId, 'members', 'invitee-user'), {
      companyId,
      uid: 'invitee-user',
      email: 'invitee@example.com',
      role: 'finance',
      joinedAt: new Date().toISOString(),
      invitationId: 'invite-accept',
    });
    batch.update(doc(db, 'companies', companyId, 'invitations', 'invite-accept'), {
      status: 'accepted',
      acceptedBy: 'invitee-user',
      acceptedAt: serverTimestamp(),
    });
    await assertSucceeds(batch.commit());
  });

  it('rejects invitation acceptance from another email and rejects promotion during acceptance', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'companies', companyId, 'invitations', 'invite-mismatch'),
        {
          id: 'invite-mismatch',
          companyId,
          email: 'invitee@example.com',
          role: 'viewer',
          status: 'pending',
          createdBy: 'owner-user',
          expiresAt: Timestamp.fromMillis(Date.now() + 3 * 24 * 60 * 60 * 1000),
        }
      );
    });
    const db = testEnv
      .authenticatedContext('other-user', {
        email: 'other@example.com',
        email_verified: true,
      })
      .firestore();
    const batch = writeBatch(db);
    batch.set(doc(db, 'companies', companyId, 'members', 'other-user'), {
      companyId,
      uid: 'other-user',
      email: 'other@example.com',
      role: 'admin',
      joinedAt: new Date().toISOString(),
      invitationId: 'invite-mismatch',
    });
    batch.update(doc(db, 'companies', companyId, 'invitations', 'invite-mismatch'), {
      status: 'accepted',
      acceptedBy: 'other-user',
      acceptedAt: serverTimestamp(),
    });
    await assertFails(batch.commit());
  });

  it('prevents administrators from promoting members to owner', async () => {
    const db = testEnv.authenticatedContext('owner-user').firestore();
    await assertFails(
      setDoc(doc(db, 'companies', companyId, 'members', 'viewer-user'), {
        uid: 'viewer-user',
        companyId,
        email: 'viewer@example.com',
        role: 'owner',
      })
    );
  });
});
