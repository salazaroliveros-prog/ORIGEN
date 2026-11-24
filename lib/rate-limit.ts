import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';

/**
 * ✅ RATE LIMITING CON VERCEL KV
 * 
 * Configuración:
 * - 100 requests/min por IP global
 * - 50 requests/min por usuario autenticado
 * - 10 requests/min por endpoint crítico (/api/account/delete)
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
    // Obtener IP del cliente
    const ip = req.headers.get('x-forwarded-for') ||
               req.headers.get('x-real-ip') ||
               'unknown';

    const key = `rate-limit:${config.key}:${ip}`;
    const now = Date.now();
    
    // Obtener contador actual
    const count = await kv.incr(key);
    
    // Primera vez: establecer expiration
    if (count === 1) {
      await kv.expire(key, Math.ceil(config.window));
    }

    const remaining = Math.max(0, config.limit - count);
    const resetTime = now + (config.window * 1000);

    // Si excedió límite
    if (count > config.limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime,
      };
    }

    return {
      allowed: true,
      remaining,
      resetTime,
    };
  } catch (error) {
    // Si KV no está disponible, permitir (fallback seguro)
    console.error('Rate limit check failed:', error);
    return {
      allowed: true,
      remaining: -1, // -1 indica que no fue verificado
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

  // Continuamos con la solicitud
  return null;
}
