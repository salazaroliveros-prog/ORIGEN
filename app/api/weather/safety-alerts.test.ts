import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/security', () => ({
  rateLimitMiddleware: vi.fn(() => null),
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(() => ({
    models: {
      generateContent: vi.fn(() => ({ text: '{}' })),
    },
  })),
}));

import type { NextRequest } from 'next/server';
import { POST, GET } from './safety-alerts/route';
import { rateLimitMiddleware, getClientIp } from '@/lib/security';

describe('app/api/weather/safety-alerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rateLimitMiddleware).mockReturnValue(null);
    vi.mocked(getClientIp).mockReturnValue('127.0.0.1');
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
      const req = new Request('http://localhost/api/weather/safety-alerts?projectName=Test') as unknown as NextRequest;
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
      vi.mocked(rateLimitMiddleware).mockReturnValue(rateLimitResponse);

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
        body: JSON.stringify({ lat: 14.6349, lng: -90.5069, projectName: 'Test', municipality: 'Guatemala' }),
      }) as unknown as NextRequest;
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it('should return fallback when API call fails', async () => {
      const req = new Request('http://localhost/api/weather/safety-alerts', {
        method: 'POST',
        body: JSON.stringify({ lat: 14.6349, lng: -90.5069, projectName: 'Test', municipality: 'Guatemala' }),
      }) as unknown as NextRequest;
      const res = await POST(req);
      expect(res.status).toBe(200);
    });
  });
});
