import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/apiAuth', () => ({
  requireApiUser: vi.fn(),
  canReadDocumentAsUser: vi.fn(),
}));

vi.mock('@/lib/storageRest', () => ({
  StorageUploadError: class StorageUploadError extends Error {
    constructor(message: string, readonly status: number) {
      super(message);
      this.name = 'StorageUploadError';
    }
  },
  downloadStorageObjectAsUser: vi.fn(),
}));

import { GET } from './route';
import { canReadDocumentAsUser, requireApiUser } from '@/lib/apiAuth';
import { downloadStorageObjectAsUser, StorageUploadError } from '@/lib/storageRest';

const AUTH_OK = {
  ok: true as const,
  idToken: 'project-photo-id-token',
  user: {
    uid: 'member-1',
    email: 'member@origen.gt',
    emailVerified: true,
    displayName: 'Project Member',
  },
};

const PHOTO_PARAMS = {
  projectId: 'project-1',
  photoId: 'photo-1',
};

const PHOTO_METADATA = {
  fields: {
    projectId: { stringValue: 'project-1' },
    filename: { stringValue: 'photo.jpg' },
    storagePath: { stringValue: 'projects/project-1/progress/photo.jpg' },
  },
};

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost/api/project-photos/project-1/photo-1');
}

function makeContext(overrides: Partial<typeof PHOTO_PARAMS> = {}) {
  return {
    params: Promise.resolve({ ...PHOTO_PARAMS, ...overrides }),
  };
}

describe('GET /api/project-photos/[projectId]/[photoId]', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'origen-test');
    vi.stubEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', 'origen-test.appspot.com');
    vi.stubEnv('NEXT_PUBLIC_FIRESTORE_DATABASE_ID', '(default)');
    vi.stubEnv('NEXT_PUBLIC_USE_FIREBASE_EMULATORS', 'false');
    vi.stubGlobal('fetch', fetchMock);

    vi.mocked(requireApiUser).mockResolvedValue(AUTH_OK);
    vi.mocked(canReadDocumentAsUser).mockResolvedValue('allowed');
    vi.mocked(downloadStorageObjectAsUser).mockResolvedValue({
      data: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
      contentType: 'image/jpeg',
    });
    fetchMock.mockResolvedValue(new Response(JSON.stringify(PHOTO_METADATA), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('requires an authenticated session before accessing metadata or Storage', async () => {
    vi.mocked(requireApiUser).mockResolvedValue({
      ok: false,
      status: 401,
      message: 'Debes iniciar sesión.',
    });

    const response = await GET(makeRequest(), makeContext());

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(downloadStorageObjectAsUser).not.toHaveBeenCalled();
  });

  it('rejects users who cannot read the project', async () => {
    vi.mocked(canReadDocumentAsUser).mockResolvedValue('denied');

    const response = await GET(makeRequest(), makeContext());

    expect(response.status).toBe(403);
    expect(canReadDocumentAsUser).toHaveBeenCalledWith(
      AUTH_OK.idToken,
      'projects',
      PHOTO_PARAMS.projectId
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(downloadStorageObjectAsUser).not.toHaveBeenCalled();
  });

  it('returns 503 when project access cannot be verified', async () => {
    vi.mocked(canReadDocumentAsUser).mockResolvedValue('unavailable');

    const response = await GET(makeRequest(), makeContext());

    expect(response.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(downloadStorageObjectAsUser).not.toHaveBeenCalled();
  });

  it('rejects malformed project and photo identifiers before external requests', async () => {
    const response = await GET(
      makeRequest(),
      makeContext({ photoId: '../private-photo' })
    );

    expect(response.status).toBe(400);
    expect(canReadDocumentAsUser).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(downloadStorageObjectAsUser).not.toHaveBeenCalled();
  });

  it('returns 404 when the Firestore photo metadata does not exist', async () => {
    fetchMock.mockResolvedValueOnce(new Response('not found', { status: 404 }));

    const response = await GET(makeRequest(), makeContext());

    expect(response.status).toBe(404);
    expect(downloadStorageObjectAsUser).not.toHaveBeenCalled();
  });

  it('rejects metadata that points outside the requested project path', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      fields: {
        projectId: { stringValue: 'project-1' },
        filename: { stringValue: 'photo.jpg' },
        storagePath: { stringValue: 'projects/another-project/progress/photo.jpg' },
      },
    }), { status: 200 }));

    const response = await GET(makeRequest(), makeContext());

    expect(response.status).toBe(403);
    expect(downloadStorageObjectAsUser).not.toHaveBeenCalled();
  });

  it('downloads the image with the authenticated token and returns a private response', async () => {
    const response = await GET(makeRequest(), makeContext());

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/jpeg');
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(Array.from(new Uint8Array(await response.arrayBuffer()))).toEqual([
      0xff, 0xd8, 0xff, 0xe0,
    ]);

    const [metadataUrl, metadataInit] = fetchMock.mock.calls[0];
    expect(String(metadataUrl)).toContain('/documents/projects/project-1/photos/photo-1');
    expect((metadataInit as RequestInit).headers).toEqual({
      Authorization: `Bearer ${AUTH_OK.idToken}`,
    });
    expect(downloadStorageObjectAsUser).toHaveBeenCalledWith({
      idToken: AUTH_OK.idToken,
      bucket: 'origen-test.appspot.com',
      storagePath: 'projects/project-1/progress/photo.jpg',
    });
  });

  it('propagates Storage permission denial without exposing a download token', async () => {
    vi.mocked(downloadStorageObjectAsUser).mockRejectedValueOnce(
      new StorageUploadError('No tienes permiso para ver esta foto del proyecto.', 403)
    );

    const response = await GET(makeRequest(), makeContext());

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(JSON.stringify(body)).not.toContain('downloadTokens');
    expect(JSON.stringify(body)).not.toContain('token-a');
  });
});
