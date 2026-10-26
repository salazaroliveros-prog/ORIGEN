import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { EmployeeDirectoryEntry } from './types';

const projectId = 'demo-origen-e2e';
const companyId = 'company-directory-backfill-test';

process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = projectId;
process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

const { auth, db } = await import('./firebaseService');
const { subscribeEmployeeDirectory, subscribeEmployees } = await import('./firebaseService');
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
    expect((await getDoc(doc(db, 'attendance', 'legacy-attendance'))).data()?.companyId).toBe(companyId);

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
