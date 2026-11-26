import { NextRequest, NextResponse } from 'next/server';

/**
 * ✅ MIDDLEWARE: HTTPS Redirect + Security
 *
 * Implementa:
 * 1. Redirect HTTP → HTTPS en producción
 * 2. HSTS header confirmación
 * 3. Rate limiting básico por IP
 */

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  const host = request.headers.get('host') || '';
  const isLocalHost = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host);

  // ✅ Redirect HTTP → HTTPS en producción (excepto en local, donde `next start`
  // sirve HTTP y el redirect rompería la validación E2E en modo producción).
  if (protocol === 'http' && process.env.NODE_ENV === 'production' && !isLocalHost) {
    url.protocol = 'https:';
    return NextResponse.redirect(url, 301);
  }

  // ✅ Agregar headers de seguridad adicionales
  const response = NextResponse.next();

  // HSTS
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // X-UA-Compatible
  response.headers.set('X-UA-Compatible', 'IE=edge');

  // ✅ RATE LIMITING con Vercel KV
  // Implementado en rutas específicas (ver app/api/*/route.ts)
  // Este middleware solo maneja headers y redirection
  // Rate limiting específico en endpoints críticos

  return response;
}

// ✅ Configurar qué rutas usan el middleware
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
