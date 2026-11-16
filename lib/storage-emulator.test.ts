import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteObject, getBytes, ref, uploadBytes } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const PROJECT_ID = 'demo-origen-erp-test';
const IMAGE_PATH = 'projects/project-1/progress/foto.jpg';
const imageBytes = () => new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

let testEnvironment: RulesTestEnvironment;

beforeAll(async () => {
  if (!process.env.FIREBASE_EMULATOR_HUB && !process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
    throw new Error('Estas pruebas requieren el emulador de Storage (npm run test:firebase).');
  }

  testEnvironment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8') },
    storage: { rules: readFileSync(resolve(process.cwd(), 'storage.rules'), 'utf8') },
  });
});

afterAll(async () => {
  await testEnvironment.cleanup();
});

beforeEach(async () => {
  await testEnvironment.clearStorage();
  await testEnvironment.clearFirestore();
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'projects', 'project-1'), {
      id: 'project-1',
      companyId: 'company-1',
      ownerId: 'uid-1',
    });
    await setDoc(doc(db, 'companies', 'company-1', 'members', 'uid-1'), {
      uid: 'uid-1',
      companyId: 'company-1',
      role: 'owner',
    });
  });
});

describe('storage.rules', () => {
  it('denies anonymous uploads', async () => {
    const storage = testEnvironment.unauthenticatedContext().storage();
    await assertFails(uploadBytes(ref(storage, IMAGE_PATH), imageBytes(), { contentType: 'image/jpeg' }));
  });

  it('denies authenticated users who are not members of the project company', async () => {
    const storage = testEnvironment.authenticatedContext('uid-2').storage();
    await assertFails(uploadBytes(ref(storage, IMAGE_PATH), imageBytes(), { contentType: 'image/jpeg' }));
  });

  it('allows a member of the project company to upload a valid image', async () => {
    const storage = testEnvironment.authenticatedContext('uid-1').storage();
    await assertSucceeds(uploadBytes(ref(storage, IMAGE_PATH), imageBytes(), { contentType: 'image/jpeg' }));
  });

  it('denies project-photo reads to users outside the company', async () => {
    const ownerStorage = testEnvironment.authenticatedContext('uid-1').storage();
    await assertSucceeds(uploadBytes(ref(ownerStorage, IMAGE_PATH), imageBytes(), { contentType: 'image/jpeg' }));
    const otherStorage = testEnvironment.authenticatedContext('uid-2').storage();
    await assertFails(getBytes(ref(otherStorage, IMAGE_PATH)));
  });

  it('rejects non-image content types', async () => {
    const storage = testEnvironment.authenticatedContext('uid-1').storage();
    await assertFails(uploadBytes(ref(storage, IMAGE_PATH), new Uint8Array([1, 2, 3]), { contentType: 'application/pdf' }));
  });

  it('denies deleting an uploaded photo from the client', async () => {
    const storage = testEnvironment.authenticatedContext('uid-1').storage();
    await assertSucceeds(uploadBytes(ref(storage, IMAGE_PATH), imageBytes(), { contentType: 'image/jpeg' }));
    await assertFails(deleteObject(ref(storage, IMAGE_PATH)));
  });

  it('keeps every other path in the bucket closed', async () => {
    const storage = testEnvironment.authenticatedContext('uid-1').storage();
    await assertFails(uploadBytes(ref(storage, 'private/foto.jpg'), imageBytes(), { contentType: 'image/jpeg' }));
    expect(true).toBe(true);
  });
});
