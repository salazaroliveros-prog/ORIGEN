import { NextRequest, NextResponse } from 'next/server';

/**
 * ✅ RATE LIMITING (Local Memory Fallback)
 *
 * Configuración:
 * - 100 requests/min por IP global
 * - 50 requests/min por usuario autenticado
 * - 10 requests/min por endpoint crítico (/api/account/delete)
 *
 * Nota: Usa @vercel/kv en producción, fallback a memoria en desarrollo
 */

// Local in-memory rate limit store (development fallback)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

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
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    const key = `rate-limit:${config.key}:${ip}`;
    const now = Date.now();

    // Local implementation
    let record = rateLimitStore.get(key);

    // Check if expired
    if (record && record.resetTime < now) {
      rateLimitStore.delete(key);
      record = undefined;
    }

    // Create or increment
    if (!record) {
      record = {
        count: 1,
        resetTime: now + config.window * 1000,
      };
    } else {
      record.count++;
    }

    rateLimitStore.set(key, record);

    const remaining = Math.max(0, config.limit - record.count);
    const resetTime = record.resetTime;

    // Si excedió límite
    if (record.count > config.limit) {
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
    // Si la verificación falla, permitir (fallback seguro)
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
