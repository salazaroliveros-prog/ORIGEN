import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/config', () => ({
  getFirebaseConfig: vi.fn(),
  hasFirebaseRuntimeConfig: vi.fn(() => true),
}));

vi.mock('@/lib/security', () => ({
  rateLimitMiddleware: vi.fn(() => null),
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

import { GET } from './firebase-config.js/route';
import { hasFirebaseRuntimeConfig, getFirebaseConfig } from '@/lib/config';
import { rateLimitMiddleware, getClientIp } from '@/lib/security';

describe('app/api/firebase-config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hasFirebaseRuntimeConfig).mockReturnValue(true);
    vi.mocked(rateLimitMiddleware).mockReturnValue(null);
    vi.mocked(getClientIp).mockReturnValue('127.0.0.1');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return Firebase config JavaScript when configured', async () => {
    vi.mocked(getFirebaseConfig).mockReturnValue({
      apiKey: 'test-key',
      authDomain: 'test.firebaseapp.com',
      projectId: 'test-project',
      storageBucket: 'test.appspot.com',
      messagingSenderId: '123456',
      appId: '1:123456:web:abc',
      measurementId: 'G-XXXX',
      firestoreDatabaseId: '(default)',
      appCheckRecaptchaKey: '',
    });

    const req = new Request('http://localhost/api/firebase-config.js');
    const res = await GET(req);
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(text).toContain('firebase.initializeApp');
    expect(text).toContain('test-key');
    expect(text).toContain('test-project');
    expect(getClientIp).toHaveBeenCalledWith(req);
    expect(rateLimitMiddleware).toHaveBeenCalledWith('firebase-config:127.0.0.1');
  });

  it('should return 500 when Firebase config is incomplete', async () => {
    vi.mocked(hasFirebaseRuntimeConfig).mockReturnValue(false);

    const req = new Request('http://localhost/api/firebase-config.js');
    const res = await GET(req);
    const text = await res.text();

    expect(res.status).toBe(500);
    expect(text).toContain('Firebase configuration is incomplete');
  });

  it('should return 429 when rate limited', async () => {
    const rateLimitResponse = new Response('Too many requests', { status: 429 }) as any;
    vi.mocked(rateLimitMiddleware).mockReturnValue(rateLimitResponse);

    const req = new Request('http://localhost/api/firebase-config.js');
    const res = await GET(req);

    expect(res.status).toBe(429);
  });

  it('should return 500 on error', async () => {
    vi.mocked(getClientIp).mockImplementation(() => {
      throw new Error('IP error');
    });

    const req = new Request('http://localhost/api/firebase-config.js');
    const res = await GET(req);
    const text = await res.text();

    expect(res.status).toBe(500);
    expect(text).toContain('Firebase configuration error');
  });
});
