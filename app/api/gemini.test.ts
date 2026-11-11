import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextRequest } from 'next/server';

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

vi.mock('@/lib/guatemalaMarketData', () => ({
  GUATEMALA_BASE_MARKET_CATALOGUE: [],
  GUATEMALA_DEPARTMENTS_INDEX: {
    Guatemala: { region: 'Central', freightFactor: 1.0, laborFactor: 1.0, overallFactor: 1.0, distanceKmFromCapital: 0, logisticsNotes: 'Capital' },
  },
}));

import { POST } from './gemini/route';
import { rateLimitMiddleware, getClientIp } from '@/lib/security';

describe('app/api/gemini', () => {
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

    const req = new Request('http://localhost/api/gemini', {
      method: 'POST',
      body: JSON.stringify({ action: 'chat', message: 'Hello' }),
    }) as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  it('should return 400 for invalid JSON', async () => {
    const req = new Request('http://localhost/api/gemini', {
      method: 'POST',
      body: 'not json',
    }) as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('should return 400 for unrecognized action', async () => {
    const req = new Request('http://localhost/api/gemini', {
      method: 'POST',
      body: JSON.stringify({ action: 'invalid_action' }),
    }) as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('should return 503 when GEMINI_API_KEY is not set', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    const req = new Request('http://localhost/api/gemini', {
      method: 'POST',
      body: JSON.stringify({ action: 'chat', message: 'Hello' }),
    }) as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(503);

    process.env.GEMINI_API_KEY = originalKey;
  });

  it('should return 400 for missing description in generate_apu', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    const req = new Request('http://localhost/api/gemini', {
      method: 'POST',
      body: JSON.stringify({ action: 'generate_apu' }),
    }) as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('should return 200 for chat with default message', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    const req = new Request('http://localhost/api/gemini', {
      method: 'POST',
      body: JSON.stringify({ action: 'chat' }),
    }) as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(200); // Falls back to default message
  });
});
