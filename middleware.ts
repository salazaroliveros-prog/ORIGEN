import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://origen-one-kohl.vercel.app',
  'https://origen-duw1ejjo3-proyectoswm.vercel.app',
];

const SENSITIVE_PATHS = ['/api/'];

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  const referer = request.headers.get('referer') || '';
  const isApiPath = SENSITIVE_PATHS.some((p) => request.nextUrl.pathname.startsWith(p));

  // CSRF protection for state-changing API methods
  if (isApiPath && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const isSameOrigin =
      ALLOWED_ORIGINS.includes(origin) ||
      (referer && ALLOWED_ORIGINS.some((o) => referer.startsWith(o)));

    if (!isSameOrigin && !origin.startsWith('http://localhost')) {
      return new NextResponse('Forbidden: CSRF origin check failed', { status: 403 });
    }
  }

  const response = NextResponse.next();

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.gstatic.com https://www.googletagmanager.com https://www.recaptcha.com https://recaptcha.net https://www.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "manifest-src 'self' https://vercel.com",
    "connect-src 'self' https://*.googleapis.com https://*.google.com https://www.gstatic.com https://www.recaptcha.com https://recaptcha.net https://vercel.com https://origen-duw1ejjo3-proyectoswm.vercel.app wss:",
    "frame-src 'self' https://www.google.com https://accounts.google.com https://www.recaptcha.com https://recaptcha.net",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(self), microphone=(), geolocation=(self)'
  );
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.webmanifest$|.*\\.sw\.js$|.*\\.ico$).*)',
  ],
};
