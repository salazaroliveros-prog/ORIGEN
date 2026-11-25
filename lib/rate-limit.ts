import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit as checkRateLimitFirestore } from './apiMiddleware';

/**
 * ✅ RATE LIMITING (Firestore-backed, compartido entre instancias serverless)
 *
 * Configuración:
 * - 100 requests/min por IP global
 * - 50 requests/min por usuario autenticado
 * - 10 requests/min por endpoint crítico (/api/account/delete)
 *
 * Usa Firestore como store compartido. Ya no depende de memoria local.
 */

interface RateLimitConfig {
  limit: number;
  window: number; // segundos
  key: string;
}

export async function checkRateLimit(
  req: NextRequest,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const key = `rate-limit:${config.key}:${ip}`;
    const windowMs = config.window * 1000;

    const result = await checkRateLimitFirestore(key, {
      windowMs,
      maxRequests: config.limit,
      keyPrefix: '', // key ya incluye el prefijo
    });

    return {
      allowed: result.allowed,
      remaining: result.remaining,
      resetTime: result.resetTime,
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return {
      allowed: true,
      remaining: -1,
      resetTime: 0,
    };
  }
}

/**
 * ✅ Middleware Rate Limiting
 * Uso: Aplicar en rutas críticas
 */
export async function rateLimitMiddleware(
  req: NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const { allowed, remaining, resetTime } = await checkRateLimit(req, config);

  if (!allowed) {
    return new NextResponse(
      JSON.stringify({
        error: 'Too many requests',
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': config.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': resetTime.toString(),
        },
      }
    );
  }

  return null;
}
