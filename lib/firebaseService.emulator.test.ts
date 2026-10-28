import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import type { APUItem, EmployeeDirectoryEntry } from './types';

const projectId = 'demo-origen-e2e';
const companyId = 'company-directory-backfill-test';

process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = projectId;
process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??= 'demo-api-key';
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??= `${projectId}.firebaseapp.com`;
process.env.NEXT_PUBLIC_FIREBASE_APP_ID ??= '1:123456789:web:demo';
process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

const { auth, db } = await import('./firebaseService');
const {
  deleteAPUItemFromFirestore,
  saveAPUItemsToFirestore,
  saveMachineryToFirestore,
  subscribeAPUItems,
  subscribeEmployeeDirectory,
  subscribeEmployees,
  testConnection,
  updateMachineryStatusInFirestore,
} = await import('./firebaseService');
const { ensureCompanyWorkspace } = await import('./companyWorkspace');

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
});

afterAll(async () => {
  if (auth.currentUser) await deleteUser(auth.currentUser);
  await testEnv.cleanup();
});

describe('Firestore service emulator integration', () => {
  it('authenticates with the Auth emulator and reaches Firestore', async () => {
    const result = await createUserWithEmailAndPassword(
      auth,
      `connection-check-${Date.now()}@example.test`,
      'test-password-123'
    );

    try {
      expect(auth.currentUser?.uid).toBe(result.user.uid);
      await expect(testConnection()).resolves.toBe(true);
    } finally {
      await deleteUser(result.user);
    }
  });

  it('creates, reads, updates, and deletes an APU item through the Firestore service', async () => {
    const user = await createUserWithEmailAndPassword(
      auth,
      `apu-crud-${Date.now()}@example.test`,
      'test-password-123'
    );
    const companyId = user.user.uid;
    const projectId = 'apu-crud-project';
    const itemId = 'apu-crud-item';

    try {
      await ensureCompanyWorkspace(user.user);
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'projects', projectId), {
          id: projectId,
          companyId,
        });
      });

      const item = {
        id: itemId,
        companyId,
        projectId,
        createdBy: user.user.uid,
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

      await expect(
        saveAPUItemsToFirestore([item], projectId, companyId, user.user.uid)
      ).resolves.toBe(true);

      let unsubscribe = () => {};
      const listedItems = await new Promise<APUItem[]>((resolve, reject) => {
        const timeout = setTimeout(() => {
          unsubscribe();
          reject(new Error('Timeout waiting for the created APU item subscription.'));
        }, 10_000);
        unsubscribe = subscribeAPUItems(companyId, (items) => {
          if (items.some((entry) => entry.id === itemId)) {
            clearTimeout(timeout);
            unsubscribe();
            resolve(items);
          }
        });
      });
      expect(listedItems.find((entry) => entry.id === itemId)).toMatchObject({
        description: 'Concreto de prueba',
      });

      const updatedItem = { ...item, description: 'Concreto actualizado' };
      await expect(
        saveAPUItemsToFirestore([updatedItem], projectId, companyId, user.user.uid)
      ).resolves.toBe(true);

      const updated = await getDoc(doc(db, 'apuItems', itemId));
      expect(updated.data()).toMatchObject({ description: 'Concreto actualizado' });

      await expect(deleteAPUItemFromFirestore(itemId)).resolves.toBe(true);
      let itemStillExists = true;
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const deleted = await getDoc(doc(context.firestore(), 'apuItems', itemId));
        itemStillExists = deleted.exists();
      });
      expect(itemStillExists).toBe(false);
    } finally {
      if (auth.currentUser?.uid === user.user.uid) await deleteUser(user.user);
    }
  });

  it('creates, updates, and deletes machinery records with real ERP field values', async () => {
    const user = await createUserWithEmailAndPassword(
      auth,
      `machinery-crud-${Date.now()}@example.test`,
      'test-password-123'
    );
    const companyId = user.user.uid;
    const machineryId = 'machinery-crud-item';
    const machinery = {
      id: machineryId,
      companyId,
      name: 'Excavadora de prueba',
      model: '2026',
      plateOrCode: 'EQ-E2E-01',
      hourlyRateGTQ: 300,
      currentHorometer: 0,
      status: 'Disponible' as const,
    };

    try {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'companies', companyId), {
          id: companyId,
          name: 'Empresa de prueba',
          ownerId: user.user.uid,
          createdAt: new Date().toISOString(),
          dataSchemaVersion: 1,
        });
        await setDoc(doc(context.firestore(), 'companies', companyId, 'members', user.user.uid), {
          companyId,
          uid: user.user.uid,
          email: user.user.email ?? 'machinery@example.test',
          role: 'owner',
          joinedAt: new Date().toISOString(),
        });
      });
      await expect(saveMachineryToFirestore(machinery, companyId, user.user.uid)).resolves.toBe(
        true
      );

      let savedData: Record<string, unknown> | undefined;
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const saved = await getDoc(doc(context.firestore(), 'machinery', machineryId));
        savedData = saved.data() as Record<string, unknown> | undefined;
      });
      expect(savedData).toMatchObject({ name: 'Excavadora de prueba', status: 'Disponible' });

      await expect(
        updateMachineryStatusInFirestore(
          { ...machinery, status: 'En Obra' },
          'En Obra',
          companyId,
          user.user.uid
        )
      ).resolves.toBe(true);

      let updatedData: Record<string, unknown> | undefined;
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const updated = await getDoc(doc(context.firestore(), 'machinery', machineryId));
        updatedData = updated.data() as Record<string, unknown> | undefined;
      });
      expect(updatedData).toMatchObject({ status: 'En Obra' });

      await deleteDoc(doc(db, 'machinery', machineryId));
      let deletedExists = true;
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const deleted = await getDoc(doc(context.firestore(), 'machinery', machineryId));
        deletedExists = deleted.exists();
      });
      expect(deletedExists).toBe(false);
    } finally {
      if (auth.currentUser?.uid === user.user.uid) await deleteUser(user.user);
    }
  });

  it('backfills only the minimum directory fields for legacy employees', async () => {
    const user = await createUserWithEmailAndPassword(
      auth,
      `directory-backfill-${Date.now()}@example.test`,
      'test-password-123'
    );
    const companyId = user.user.uid;

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'employees', 'legacy-employee'), {
        id: 'legacy-employee',
        ownerId: user.user.uid,
        name: 'Trabajador heredado de prueba',
        role: 'Albañil',
        dailyRateGTQ: 250,
        phone: '00000000',
        igssAffiliated: true,
      });
      await setDoc(doc(adminDb, 'attendance', 'legacy-attendance'), {
        id: 'legacy-attendance',
        authorId: user.user.uid,
        projectId: 'legacy-project',
        date: '2026-10-25',
        employeeId: 'legacy-employee',
        employeeName: 'Trabajador heredado de prueba',
        status: 'Presente',
      });
    });

    const workspace = await ensureCompanyWorkspace(user.user);
    expect(workspace.workspace.id).toBe(user.user.uid);
    expect((await getDoc(doc(db, 'attendance', 'legacy-attendance'))).data()?.companyId).toBe(
      companyId
    );

    const employeesLoaded = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        unsubscribe();
        reject(new Error('Timeout waiting for the legacy employee subscription.'));
      }, 10_000);
      const unsubscribe = subscribeEmployees(companyId, (employees) => {
        if (employees.some((employee) => employee.id === 'legacy-employee')) {
          clearTimeout(timeout);
          unsubscribe();
          resolve();
        }
      });
    });

    await employeesLoaded;

    const directoryLoaded = new Promise<EmployeeDirectoryEntry[]>((resolve, reject) => {
      let unsubscribe = () => {};
      const timeout = setTimeout(() => {
        unsubscribe();
        reject(new Error('Timeout waiting for the backfilled employee directory entry.'));
      }, 10_000);
      unsubscribe = subscribeEmployeeDirectory(companyId, (entries) => {
        if (entries.some((entry) => entry.id === 'legacy-employee')) {
          clearTimeout(timeout);
          unsubscribe();
          resolve(entries);
        }
      });
    });

    const directoryEntries = await directoryLoaded;
    const directoryEntry = directoryEntries.find((entry) => entry.id === 'legacy-employee');

    expect(directoryEntry).toMatchObject({
      id: 'legacy-employee',
      companyId,
      name: 'Trabajador heredado de prueba',
      role: 'Albañil',
    });
    expect(directoryEntry).not.toHaveProperty('dailyRateGTQ');
    expect(directoryEntry).not.toHaveProperty('phone');
    expect(directoryEntry).not.toHaveProperty('igssAffiliated');
  });
});
