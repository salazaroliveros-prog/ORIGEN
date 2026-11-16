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
const imagePath = (caseName: string) => `projects/project-1/progress/${caseName}.jpg`;
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
    await assertFails(uploadBytes(ref(storage, imagePath('anonymous')), imageBytes(), { contentType: 'image/jpeg' }));
  });

  it('denies authenticated users who are not members of the project company', async () => {
    const storage = testEnvironment.authenticatedContext('uid-2').storage();
    await assertFails(uploadBytes(ref(storage, imagePath('outsider-upload')), imageBytes(), { contentType: 'image/jpeg' }));
  });

  it('allows a member of the project company to upload a valid image', async () => {
    const storage = testEnvironment.authenticatedContext('uid-1').storage();
    await assertSucceeds(uploadBytes(ref(storage, imagePath('member-upload')), imageBytes(), { contentType: 'image/jpeg' }));
  });

  it('denies project-photo reads to users outside the company', async () => {
    const ownerStorage = testEnvironment.authenticatedContext('uid-1').storage();
    await assertSucceeds(uploadBytes(ref(ownerStorage, imagePath('private-read')), imageBytes(), { contentType: 'image/jpeg' }));
    const otherStorage = testEnvironment.authenticatedContext('uid-2').storage();
    await assertFails(getBytes(ref(otherStorage, imagePath('private-read'))));
  });

  it('rejects non-image content types', async () => {
    const storage = testEnvironment.authenticatedContext('uid-1').storage();
    await assertFails(uploadBytes(ref(storage, imagePath('invalid-type')), new Uint8Array([1, 2, 3]), { contentType: 'application/pdf' }));
  });

  it('rejects empty and oversized image uploads', async () => {
    const storage = testEnvironment.authenticatedContext('uid-1').storage();
    await assertFails(uploadBytes(ref(storage, imagePath('empty-and-oversized')), new Uint8Array(0), { contentType: 'image/jpeg' }));
    await assertFails(
      uploadBytes(
        ref(storage, 'projects/project-1/progress/oversized.jpg'),
        new Uint8Array(10 * 1024 * 1024 + 1),
        { contentType: 'image/jpeg' }
      )
    );
  });

  it('does not allow replacing an existing project photo', async () => {
    const storage = testEnvironment.authenticatedContext('uid-1').storage();
    const photoRef = ref(storage, imagePath('immutable-photo'));
    await assertSucceeds(uploadBytes(photoRef, imageBytes(), { contentType: 'image/jpeg' }));
    await assertFails(uploadBytes(photoRef, imageBytes(), { contentType: 'image/jpeg' }));
  });

  it('denies deleting an uploaded photo from the client', async () => {
    const storage = testEnvironment.authenticatedContext('uid-1').storage();
    await assertSucceeds(uploadBytes(ref(storage, imagePath('no-delete')), imageBytes(), { contentType: 'image/jpeg' }));
    await assertFails(deleteObject(ref(storage, imagePath('no-delete'))));
  });

  it('keeps every other path in the bucket closed', async () => {
    const storage = testEnvironment.authenticatedContext('uid-1').storage();
    await assertFails(uploadBytes(ref(storage, 'private/foto.jpg'), imageBytes(), { contentType: 'image/jpeg' }));
    expect(true).toBe(true);
  });
});
