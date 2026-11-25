import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/security', () => ({
  rateLimitMiddleware: vi.fn(() => Promise.resolve(null)),
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(() => ({
    models: {
      generateContent: vi.fn(() => ({ text: '{}' })),
    },
  })),
}));

vi.mock('@/lib/apiAuth', () => ({
  requireApiUser: vi.fn(),
  requireAppCheck: vi.fn(),
}));

import type { NextRequest } from 'next/server';
import { POST, GET } from './safety-alerts/route';
import { rateLimitMiddleware } from '@/lib/security';
import { requireApiUser, requireAppCheck } from '@/lib/apiAuth';

const AUTH_OK = {
  ok: true as const,
  idToken: 'id-token',
  user: { uid: 'uid-1', email: 'user@origen.gt', emailVerified: true, displayName: null },
};

describe('app/api/weather/safety-alerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireApiUser).mockResolvedValue(AUTH_OK);
    vi.mocked(requireAppCheck).mockResolvedValue(null);
    vi.mocked(rateLimitMiddleware).mockReturnValue(Promise.resolve(null));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return 401 without an authenticated session', async () => {
    vi.mocked(requireApiUser).mockResolvedValue({
      ok: false,
      status: 401,
      message: 'Debes iniciar sesión para usar este servicio.',
    });

    const req = new Request(
      'http://localhost/api/weather/safety-alerts?lat=14.6349&lng=-90.5069'
    ) as unknown as NextRequest;
    const res = await GET(req);
    expect(res.status).toBe(401);
    expect(rateLimitMiddleware).not.toHaveBeenCalled();
  });

  describe('GET', () => {
    it('should return 400 for invalid coordinates', async () => {
      const req = new Request(
        'http://localhost/api/weather/safety-alerts?lat=invalid&lng=-90'
      ) as unknown as NextRequest;
      const res = await GET(req);
      expect(res.status).toBe(400);
    });

    it('should return 400 for missing coordinates', async () => {
      const req = new Request(
        'http://localhost/api/weather/safety-alerts?projectName=Test'
      ) as unknown as NextRequest;
      const res = await GET(req);
      expect(res.status).toBe(400);
    });

    it('should return 200 for valid coordinates', async () => {
      const req = new Request(
        'http://localhost/api/weather/safety-alerts?lat=14.6349&lng=-90.5069&projectName=Test&municipality=Guatemala'
      ) as unknown as NextRequest;
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it('should apply rate limiting', async () => {
      const rateLimitResponse = new Response('Too many', { status: 429 }) as any;
      vi.mocked(rateLimitMiddleware).mockReturnValue(Promise.resolve(rateLimitResponse));

      const req = new Request(
        'http://localhost/api/weather/safety-alerts?lat=14.6349&lng=-90.5069'
      ) as unknown as NextRequest;
      const res = await GET(req);
      expect(res.status).toBe(429);
    });
  });

  describe('POST', () => {
    it('should return 400 for invalid JSON', async () => {
      const req = new Request('http://localhost/api/weather/safety-alerts', {
        method: 'POST',
        body: 'not json',
      }) as unknown as NextRequest;
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid coordinates', async () => {
      const req = new Request('http://localhost/api/weather/safety-alerts', {
        method: 'POST',
        body: JSON.stringify({ lat: 'invalid', lng: -90 }),
      }) as unknown as NextRequest;
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('should return 400 for missing body', async () => {
      const req = new Request('http://localhost/api/weather/safety-alerts', {
        method: 'POST',
        body: JSON.stringify({}),
      }) as unknown as NextRequest;
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('should return 200 for valid request', async () => {
      const req = new Request('http://localhost/api/weather/safety-alerts', {
        method: 'POST',
        body: JSON.stringify({
          lat: 14.6349,
          lng: -90.5069,
          projectName: 'Test',
          municipality: 'Guatemala',
        }),
      }) as unknown as NextRequest;
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it('should return fallback when API call fails', async () => {
      const req = new Request('http://localhost/api/weather/safety-alerts', {
        method: 'POST',
        body: JSON.stringify({
          lat: 14.6349,
          lng: -90.5069,
          projectName: 'Test',
          municipality: 'Guatemala',
        }),
      }) as unknown as NextRequest;
      const res = await POST(req);
      expect(res.status).toBe(200);
    });
  });
});
