import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageUploadError, downloadStorageObjectAsUser, uploadImageAsUser } from './storageRest';

const params = {
  idToken: 'id-token',
  bucket: 'origen-erp.appspot.com',
  storagePath: 'projects/OBRA-001/progress/123-abc.jpg',
  contentType: 'image/jpeg',
  data: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
};

describe('uploadImageAsUser', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_USE_FIREBASE_EMULATORS', 'false');
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('uploads with the user ID token and returns a download URL with the token', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          name: 'projects/OBRA-001/progress/123-abc.jpg',
          downloadTokens: 'token-a,token-b',
        }),
        { status: 200 }
      )
    );

    const result = await uploadImageAsUser(params);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('https://firebasestorage.googleapis.com/v0/b/');
    expect(String(url)).toContain('uploadType=media');
    expect((init as RequestInit).method).toBe('POST');
    expect((init as RequestInit).headers).toEqual({
      Authorization: 'Bearer id-token',
      'Content-Type': 'image/jpeg',
    });
    expect(result.downloadUrl).toContain('token-a');
    expect(result.downloadUrl).not.toContain('token-b');
    expect(result.storagePath).toBe('projects/OBRA-001/progress/123-abc.jpg');
  });

  it('never places the raw path unencoded in the URL', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));

    await uploadImageAsUser({ ...params, storagePath: 'projects/OBRA 001/progress/a.jpg' });

    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('projects%2FOBRA%20001%2Fprogress%2Fa.jpg');
  });

  it('uses the storage emulator when enabled', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_FIREBASE_EMULATORS', 'true');
    vi.stubEnv('NEXT_PUBLIC_FIREBASE_EMULATOR_HOST', '127.0.0.1');
    fetchMock.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));

    const result = await uploadImageAsUser(params);

    expect(String(fetchMock.mock.calls[0][0])).toContain('http://127.0.0.1:9199/v0/b/');
    expect(result.downloadUrl).toContain('http://127.0.0.1:9199');
  });

  it('throws StorageUploadError with a clear message when rules deny the write', async () => {
    fetchMock.mockResolvedValue(new Response('forbidden', { status: 403 }));

    await expect(uploadImageAsUser(params)).rejects.toMatchObject({
      name: 'StorageUploadError',
      status: 403,
    });
  });

  it('throws StorageUploadError on other storage failures', async () => {
    fetchMock.mockResolvedValue(new Response('boom', { status: 500 }));

    await expect(uploadImageAsUser(params)).rejects.toBeInstanceOf(StorageUploadError);
  });
});


describe('downloadStorageObjectAsUser', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_USE_FIREBASE_EMULATORS', 'false');
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('downloads project photos with the authenticated user token and verifies image MIME', async () => {
    fetchMock.mockResolvedValue(
      new Response(new Uint8Array([0xff, 0xd8, 0xff]), {
        status: 200,
        headers: { 'content-type': 'image/jpeg' },
      })
    );
    const result = await downloadStorageObjectAsUser(params);
    expect(String(fetchMock.mock.calls[0][0])).toContain('alt=media');
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toEqual({
      Authorization: 'Bearer id-token',
    });
    expect(result.contentType).toBe('image/jpeg');
    expect(Array.from(result.data)).toEqual([0xff, 0xd8, 0xff]);
  });

  it('rejects downloads denied by Storage rules', async () => {
    fetchMock.mockResolvedValue(new Response('forbidden', { status: 403 }));
    await expect(downloadStorageObjectAsUser(params)).rejects.toMatchObject({
      name: 'StorageUploadError',
      status: 403,
    });
  });

  it('rejects non-image content', async () => {
    fetchMock.mockResolvedValue(
      new Response('not an image', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      })
    );
    await expect(downloadStorageObjectAsUser(params)).rejects.toMatchObject({
      name: 'StorageUploadError',
      status: 415,
    });
  });
});
