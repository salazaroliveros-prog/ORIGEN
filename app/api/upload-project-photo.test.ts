import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/security', () => ({
  rateLimitMiddleware: vi.fn(() => null),
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/firebaseService', () => ({
  storage: {},
}));

vi.mock('firebase/storage', () => ({
  ref: vi.fn(),
  uploadBytes: vi.fn(() => Promise.resolve({})),
  getDownloadURL: vi.fn(() => Promise.resolve('https://storage.googleapis.com/test/photo.jpg')),
}));

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: any, init?: any) => ({ status: init?.status ?? 200, body, json: async () => body })),
  },
}));

import { POST } from './upload-project-photo/route';
import { rateLimitMiddleware, getClientIp } from '@/lib/security';

const mockFile = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });

function makeMockRequest(formDataValues: Record<string, any>) {
  return {
    formData: async () => ({
      get: (key: string) => formDataValues[key] ?? null,
    }),
  } as any;
}

describe('app/api/upload-project-photo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rateLimitMiddleware).mockReturnValue(null);
    vi.mocked(getClientIp).mockReturnValue('127.0.0.1');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return 429 when rate limited', async () => {
    const rateLimitResponse = new Response('Too many', { status: 429 }) as any;
    vi.mocked(rateLimitMiddleware).mockReturnValue(rateLimitResponse);

    const req = makeMockRequest({});
    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  it('should return 400 for missing file', async () => {
    const req = makeMockRequest({
      file: null,
      projectId: 'proj-1',
      projectCode: 'OBRA-001',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('should return 400 for missing projectId', async () => {
    const req = makeMockRequest({
      file: mockFile,
      projectId: null,
      projectCode: 'OBRA-001',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('should return 400 for invalid MIME type', async () => {
    const req = makeMockRequest({
      file: new File(['test'], 'doc.pdf', { type: 'application/pdf' }),
      projectId: 'proj-1',
      projectCode: 'OBRA-001',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('should return 400 for empty file', async () => {
    const emptyFile = new File([], 'photo.jpg', { type: 'image/jpeg' });
    Object.defineProperty(emptyFile, 'size', { value: 0, configurable: true });
    const req = makeMockRequest({
      file: emptyFile,
      projectId: 'proj-1',
      projectCode: 'OBRA-001',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('should return 200 for valid upload', async () => {
    const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
    (file as any).arrayBuffer = async () => new Uint8Array([1, 2, 3]).buffer as any;
    const req = makeMockRequest({
      file,
      projectId: 'proj-1',
      projectCode: 'OBRA-001',
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.url).toBe('https://storage.googleapis.com/test/photo.jpg');
  });
});
