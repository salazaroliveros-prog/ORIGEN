import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/security', () => ({
  rateLimitMiddleware: vi.fn(() => null),
}));

vi.mock('@/lib/apiAuth', () => ({
  requireApiUser: vi.fn(),
  canReadDocumentAsUser: vi.fn(),
}));

vi.mock('@/lib/storageRest', () => ({
  StorageUploadError: class StorageUploadError extends Error {
    status = 500;
  },
  uploadImageAsUser: vi.fn(),
}));

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: any, init?: any) => ({
      status: init?.status ?? 200,
      body,
      json: async () => body,
    })),
  },
}));

import { POST } from './upload-project-photo/route';
import { rateLimitMiddleware } from '@/lib/security';
import { canReadDocumentAsUser, requireApiUser } from '@/lib/apiAuth';
import { uploadImageAsUser } from '@/lib/storageRest';

const AUTH_OK = {
  ok: true as const,
  idToken: 'id-token',
  user: { uid: 'uid-1', email: 'user@origen.gt', emailVerified: true, displayName: null },
};

const STORAGE_RESULT = {
  storagePath: 'projects/proj-1/progress/photo.jpg',
};

const JPEG_BYTES = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10];
const PNG_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00];

function makeFile(bytes: number[], name = 'photo.jpg', type = 'image/jpeg'): File {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: bytes.length, configurable: true });
  (file as any).arrayBuffer = async () => new Uint8Array(bytes).buffer;
  return file;
}

function makeMockRequest(formDataValues: Record<string, any>) {
  return {
    headers: new Headers(),
    formData: async () => ({
      get: (key: string) => formDataValues[key] ?? null,
    }),
  } as any;
}

function validForm(overrides: Record<string, any> = {}) {
  return {
    file: makeFile(JPEG_BYTES),
    projectId: 'proj-1',
    projectCode: 'OBRA-001',
    ...overrides,
  };
}

describe('app/api/upload-project-photo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', 'test-bucket');
    vi.mocked(requireApiUser).mockResolvedValue(AUTH_OK);
    vi.mocked(canReadDocumentAsUser).mockResolvedValue('allowed');
    vi.mocked(rateLimitMiddleware).mockReturnValue(null);
    vi.mocked(uploadImageAsUser).mockResolvedValue(STORAGE_RESULT);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('should return 401 without an authenticated session', async () => {
    vi.mocked(requireApiUser).mockResolvedValue({
      ok: false,
      status: 401,
      message: 'Debes iniciar sesión para usar este servicio.',
    });

    const res = await POST(makeMockRequest(validForm()));
    expect(res.status).toBe(401);
    expect(uploadImageAsUser).not.toHaveBeenCalled();
  });

  it('should return 429 when rate limited', async () => {
    const rateLimitResponse = new Response('Too many', { status: 429 }) as any;
    vi.mocked(rateLimitMiddleware).mockReturnValue(rateLimitResponse);

    const res = await POST(makeMockRequest(validForm()));
    expect(res.status).toBe(429);
  });

  it('should return 400 for missing file', async () => {
    const res = await POST(makeMockRequest(validForm({ file: null })));
    expect(res.status).toBe(400);
  });

  it('should return 400 for missing projectId', async () => {
    const res = await POST(makeMockRequest(validForm({ projectId: null })));
    expect(res.status).toBe(400);
  });

  it('should return 400 for invalid declared MIME type', async () => {
    const res = await POST(
      makeMockRequest(validForm({ file: makeFile(JPEG_BYTES, 'doc.pdf', 'application/pdf') }))
    );
    expect(res.status).toBe(400);
  });

  it('should return 400 for empty file', async () => {
    const emptyFile = makeFile([]);
    const res = await POST(makeMockRequest(validForm({ file: emptyFile })));
    expect(res.status).toBe(400);
  });

  it('should reject content that does not match the declared type (magic bytes)', async () => {
    // Archivo declarado como JPEG pero con contenido PNG.
    const res = await POST(makeMockRequest(validForm({ file: makeFile(PNG_BYTES) })));
    expect(res.status).toBe(400);
    expect(uploadImageAsUser).not.toHaveBeenCalled();
  });

  it('should reject a non-image payload renamed as an image', async () => {
    const pdfBytes = [...'%PDF-1.7'].map((char) => char.charCodeAt(0));
    const res = await POST(makeMockRequest(validForm({ file: makeFile(pdfBytes) })));
    expect(res.status).toBe(400);
    expect(uploadImageAsUser).not.toHaveBeenCalled();
  });

  it('should return 403 when the user cannot read the project', async () => {
    vi.mocked(canReadDocumentAsUser).mockResolvedValue('denied');

    const res = await POST(makeMockRequest(validForm()));
    expect(res.status).toBe(403);
    expect(canReadDocumentAsUser).toHaveBeenCalledWith('id-token', 'projects', 'proj-1');
    expect(uploadImageAsUser).not.toHaveBeenCalled();
  });

  it('should return 503 when project access cannot be verified', async () => {
    vi.mocked(canReadDocumentAsUser).mockResolvedValue('unavailable');

    const res = await POST(makeMockRequest(validForm()));
    expect(res.status).toBe(503);
  });

  it('should return 200 for a valid upload with the authenticated user token', async () => {
    const res = await POST(makeMockRequest(validForm()));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.storagePath).toBe(STORAGE_RESULT.storagePath);
    expect(data).not.toHaveProperty('url');
    expect(data).not.toHaveProperty('downloadUrl');
    expect(data.filename).toMatch(/\.jpg$/);

    expect(uploadImageAsUser).toHaveBeenCalledWith(
      expect.objectContaining({
        idToken: 'id-token',
        contentType: 'image/jpeg',
        storagePath: expect.stringMatching(/^projects\/proj-1\/progress\//),
      })
    );
  });
});
