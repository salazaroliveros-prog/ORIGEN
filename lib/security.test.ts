import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: any, init?: any) => ({ status: init?.status, body })),
  },
}));

import { rateLimit, rateLimitMiddleware, getClientIp, sanitizeHtml } from './security';
import { NextResponse } from 'next/server';

describe('lib/security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rateLimit', () => {
    it('should allow first request for an identifier', () => {
      const result = rateLimit('user-1');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(29);
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    it('should allow requests up to the limit', () => {
      for (let i = 0; i < 29; i++) {
        const result = rateLimit('user-2');
        expect(result.allowed).toBe(true);
      }
      const result = rateLimit('user-2');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(0);
    });

    it('should block requests over the limit', () => {
      for (let i = 0; i < 30; i++) {
        rateLimit('user-3');
      }
      const result = rateLimit('user-3');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should have separate limits per identifier', () => {
      rateLimit('user-a');
      const result = rateLimit('user-b');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(29);
    });

  it('should reset after the time window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    rateLimit('user-t1'); // count=1, remaining=29
    const second = rateLimit('user-t1'); // count=2, remaining=28
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(28);

    vi.setSystemTime(new Date('2024-01-01T00:01:05Z'));
    const reset = rateLimit('user-t1'); // new window, count=1, remaining=29
    expect(reset.allowed).toBe(true);
    expect(reset.remaining).toBe(29);

    vi.useRealTimers();
  });
  });

  describe('rateLimitMiddleware', () => {
    it('should return null when allowed', () => {
      const result = rateLimitMiddleware('ip-1');
      expect(result).toBeNull();
    });

    it('should return 429 response when blocked', () => {
      for (let i = 0; i < 30; i++) {
        rateLimit('ip-blocked');
      }
      const result = rateLimitMiddleware('ip-blocked');
      expect(result).not.toBeNull();
      expect(result!.status).toBe(429);
      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'Demasiadas solicitudes. Inténtalo de nuevo más tarde.' },
        expect.objectContaining({ status: 429 })
      );
    });
  });

  describe('getClientIp', () => {
    it('should extract IP from x-forwarded-for', () => {
      const req = new Request('http://test.com', {
        headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' },
      });
      expect(getClientIp(req)).toBe('203.0.113.5');
    });

    it('should extract IP from x-real-ip', () => {
      const req = new Request('http://test.com', {
        headers: { 'x-real-ip': '198.51.100.23' },
      });
      expect(getClientIp(req)).toBe('198.51.100.23');
    });

    it('should return unknown when no IP headers', () => {
      const req = new Request('http://test.com');
      expect(getClientIp(req)).toBe('unknown');
    });
  });

  describe('sanitizeHtml', () => {
    it('should strip script tags', () => {
      expect(sanitizeHtml('<script>alert("xss")</script>')).toBe('');
    });

    it('should strip style tags', () => {
      expect(sanitizeHtml('<style>body{}</style>')).toBe('');
    });

    it('should strip event handler attribute names', () => {
      const result = sanitizeHtml('<div onclick="alert(1)">text</div>');
      expect(result).not.toContain('onclick');
    });

    it('should strip javascript: URLs', () => {
      const result = sanitizeHtml('<a href="javascript:alert(1)">link</a>');
      expect(result).not.toContain('javascript:');
    });

    it('should return empty string for non-string input', () => {
      expect(sanitizeHtml(null as any)).toBe('');
      expect(sanitizeHtml(undefined as any)).toBe('');
    });

    it('should preserve safe HTML', () => {
      expect(sanitizeHtml('<p>Hello <strong>world</strong></p>')).toBe('<p>Hello <strong>world</strong></p>');
    });
  });
});
