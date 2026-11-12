import { NextRequest, NextResponse } from 'next/server';
import { getDbOrThrow } from './firebaseService';
import { doc, getDoc, setDoc, increment, Timestamp } from 'firebase/firestore';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  windowMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30,
  keyPrefix: 'ratelimit',
};

const MEMORY_STORE = new Map<string, RateLimitEntry>();

function getMemoryEntry(key: string, windowMs: number): RateLimitEntry | null {
  const entry = MEMORY_STORE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.resetTime) {
    MEMORY_STORE.delete(key);
    return null;
  }
  return entry;
}

function setMemoryEntry(key: string, entry: RateLimitEntry): void {
  MEMORY_STORE.set(key, entry);
}

export async function checkRateLimit(
  identifier: string,
  config: Partial<RateLimitConfig> = {}
): Promise<{
  allowed: boolean;
  remaining: number;
  resetTime: number;
  total: number;
}> {
  const { windowMs, maxRequests, keyPrefix } = { ...DEFAULT_CONFIG, ...config };
  const key = `${keyPrefix}:${identifier}`;
  const now = Date.now();

  try {
    const db = getDbOrThrow();
    const docRef = doc(db, 'rateLimits', key);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as RateLimitEntry;
      if (now > data.resetTime) {
        // Window expired, reset
        await setDoc(docRef, {
          count: 1,
          resetTime: now + windowMs,
          windowMs,
        });
        return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs, total: maxRequests };
      }

      if (data.count >= maxRequests) {
        return { allowed: false, remaining: 0, resetTime: data.resetTime, total: maxRequests };
      }

      // Increment count
      await setDoc(docRef, { count: increment(1) }, { merge: true });
      return {
        allowed: true,
        remaining: maxRequests - data.count - 1,
        resetTime: data.resetTime,
        total: maxRequests,
      };
    } else {
      // First request
      await setDoc(docRef, {
        count: 1,
        resetTime: now + windowMs,
        windowMs,
      });
      return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs, total: maxRequests };
    }
  } catch {
    // Fallback to in-memory store if Firestore fails
    const entry = getMemoryEntry(key, windowMs);

    if (!entry) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + windowMs,
        windowMs,
      };
      setMemoryEntry(key, newEntry);
      return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs, total: maxRequests };
    }

    if (entry.count >= maxRequests) {
      return { allowed: false, remaining: 0, resetTime: entry.resetTime, total: maxRequests };
    }

    entry.count++;
    setMemoryEntry(key, entry);
    return {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetTime: entry.resetTime,
      total: maxRequests,
    };
  }
}

export function createRateLimitMiddleware(config: Partial<RateLimitConfig> = {}) {
  return async (request: NextRequest, identifier?: string): Promise<NextResponse | null> => {
    const ip = identifier || getClientIp(request);
    const result = await checkRateLimit(ip, config);

    if (!result.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Demasiadas solicitudes. Inténtalo de nuevo más tarde.',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((result.resetTime - Date.now()) / 1000)),
            'X-RateLimit-Limit': String(result.total),
            'X-RateLimit-Remaining': String(result.remaining),
            'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
          },
        }
      );
    }

    return null;
  };
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  if (forwarded) return forwarded.split(',')[0].trim();
  if (realIp) return realIp;
  return 'unknown';
}

export function applySecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://www.google.com https://apis.google.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com wss://*.firebaseio.com",
      "frame-src 'self' https://www.google.com https://accounts.google.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );

  // Other security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');

  return response;
}

export function createApiResponse<T>(
  data: T,
  options: { status?: number; headers?: Record<string, string> } = {}
): NextResponse {
  const response = NextResponse.json({ success: true, data }, { status: options.status ?? 200 });
  if (options.headers) {
    Object.entries(options.headers).forEach(([key, value]) => response.headers.set(key, value));
  }
  return applySecurityHeaders(response);
}

export function createApiError(
  message: string,
  status: number,
  options: { headers?: Record<string, string>; code?: string } = {}
): NextResponse {
  const response = NextResponse.json(
    { success: false, error: message, code: options.code },
    { status }
  );
  if (options.headers) {
    Object.entries(options.headers).forEach(([key, value]) => response.headers.set(key, value));
  }
  return applySecurityHeaders(response);
}