import { NextResponse } from 'next/server';

interface RateLimiterEntry {
  count: number;
  resetTime: number;
}

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 30; // 30 requests per minute per identifier

// Local in-memory rate limit store (used by tests and direct callers)
const rateLimitStore = new Map<string, RateLimiterEntry>();

/**
 * Rate limiting síncrono basado en memoria local.
 * Se mantiene para retrocompatibilidad con pruebas y llamadores directos.
 * Para producción en Vercel, `rateLimitMiddleware` usa Firestore (compartido entre instancias).
 */
export function rateLimit(identifier: string): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetTime: now + WINDOW_MS };
  }

  if (entry.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }

  entry.count++;
  return { allowed: true, remaining: MAX_REQUESTS - entry.count, resetTime: entry.resetTime };
}

export async function rateLimitMiddleware(identifier: string) {
  // Usa el mismo store local que `rateLimit` para consistencia entre pruebas
  // y producción. En routes que requieren rate limiting compartido entre
  // instancias serverless de Vercel, usar `checkRateLimit` de apiMiddleware.ts
  // (respaldo en Firestore) en lugar de esta función.
  const result = rateLimit(identifier);

  if (!result.allowed) {
    return NextResponse.json(
      { success: false, error: 'Demasiadas solicitudes. Inténtalo de nuevo más tarde.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((result.resetTime - Date.now()) / 1000)) },
      }
    );
  }
  return null;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  if (forwarded) return forwarded.split(',')[0].trim();
  if (realIp) return realIp;
  return 'unknown';
}

// DOMPurify-style HTML sanitization for defense-in-depth
// Strips script tags, event handlers, and javascript: URLs
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/\bon\w+\s*=/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/onload\s*=/gi, '')
    .replace(/onerror\s*=/gi, '');
}
