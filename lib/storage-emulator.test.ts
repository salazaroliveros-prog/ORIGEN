import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteObject, ref, uploadBytes } from 'firebase/storage';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

/**
 * Pruebas de `storage.rules` contra el emulador de Storage.
 *
 * Se ejecutan con `npm run test:firebase` (levantan Firestore + Storage). No
 * tocan el proyecto real: el projectId es `demo-origen-erp-test`.
 */
const PROJECT_ID = 'demo-origen-erp-test';
const IMAGE_PATH = 'projects/OBRA-001/progress/foto.jpg';

let testEnvironment: RulesTestEnvironment;

const imageBytes = () =>
  new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

beforeAll(async () => {
  if (!process.env.FIREBASE_EMULATOR_HUB && !process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
    throw new Error('Estas pruebas requieren el emulador de Storage (npm run test:firebase).');
  }

  testEnvironment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    storage: {
      rules: readFileSync(resolve(process.cwd(), 'storage.rules'), 'utf8'),
    },
  });
});

afterAll(async () => {
  await testEnvironment.cleanup();
});

beforeEach(async () => {
  await testEnvironment.clearStorage();
});

describe('storage.rules', () => {
  it('denies anonymous uploads', async () => {
    const storage = testEnvironment.unauthenticatedContext().storage();

    await assertFails(
      uploadBytes(ref(storage, IMAGE_PATH), imageBytes(), { contentType: 'image/jpeg' })
    );
  });

  it('denies authenticated users uploading outside the progress folder', async () => {
    const storage = testEnvironment.authenticatedContext('uid-1').storage();

    await assertFails(
      uploadBytes(ref(storage, 'private/foto.jpg'), imageBytes(), { contentType: 'image/jpeg' })
    );
  });

  it('rejects non-image content types even when authenticated', async () => {
    const storage = testEnvironment.authenticatedContext('uid-1').storage();

    await assertFails(
      uploadBytes(ref(storage, IMAGE_PATH), new Uint8Array([1, 2, 3]), {
        contentType: 'application/pdf',
      })
    );
  });

  it('allows an authenticated user to upload an image to a project progress folder', async () => {
    const storage = testEnvironment.authenticatedContext('uid-1').storage();

    await assertSucceeds(
      uploadBytes(ref(storage, IMAGE_PATH), imageBytes(), { contentType: 'image/jpeg' })
    );
  });

  it('denies deleting an uploaded photo from the client', async () => {
    const storage = testEnvironment.authenticatedContext('uid-1').storage();
    await assertSucceeds(
      uploadBytes(ref(storage, IMAGE_PATH), imageBytes(), { contentType: 'image/jpeg' })
    );

    await assertFails(deleteObject(ref(storage, IMAGE_PATH)));
  });

  it('keeps every other path in the bucket closed', async () => {
    const storage = testEnvironment.authenticatedContext('uid-1').storage();

    await assertFails(
      uploadBytes(ref(storage, 'plans/plano.pdf'), imageBytes(), { contentType: 'image/jpeg' })
    );
    expect(true).toBe(true);
  });
});
