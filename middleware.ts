import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://origen-one-kohl.vercel.app',
  'https://origen-duw1ejjo3-proyectoswm.vercel.app',
];

const SENSITIVE_PATHS = ['/api/'];

/**
 * Orígenes de loopback (desarrollo local).
 *
 * El servidor puede levantarse en cualquier puerto (`localhost:3001`) o
 * dirección (`127.0.0.1`), así que no se puede usar una lista fija de
 * puertos como en producción.
 */
const LOOPBACK_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])$/;

const FIREBASE_EMULATOR_HOSTS = [
  'http://127.0.0.1:9099',
  'http://localhost:9099',
  'http://127.0.0.1:8080',
  'http://localhost:8080',
  'http://127.0.0.1:9199',
  'http://localhost:9199',
];

/**
 * Indica si un valor (`Origin` o `Referer`) pertenece a un origen permitido.
 *
 * Acepta los orígenes de producción, los preview desplegados y cualquier
 * loopback local.
 */
function isAllowedOrigin(candidate: string): boolean {
  if (!candidate) return false;
  if (ALLOWED_ORIGINS.includes(candidate)) return true;
  try {
    const { origin } = new URL(candidate);
    return ALLOWED_ORIGINS.includes(origin) || LOOPBACK_ORIGIN.test(origin);
  } catch {
    return false;
  }
}

/**
 * La CSP de producción no debe abrir los emuladores. En modo emulador sí hay
 * que permitirlos: sin esto el navegador bloquea `signInWithPassword` contra
 * `127.0.0.1:9099` y el E2E no puede autenticarse.
 */
export function buildContentSecurityPolicy(useFirebaseEmulators: boolean): string {
  const connectSrc = [
    "'self'",
    'https://*.googleapis.com',
    'https://*.google.com',
    'https://www.gstatic.com',
    'https://www.recaptcha.com',
    'https://recaptcha.net',
    'https://vercel.com',
    'https://origen-duw1ejjo3-proyectoswm.vercel.app',
    'wss:',
    ...(useFirebaseEmulators ? FIREBASE_EMULATOR_HOSTS : []),
  ].join(' ');

  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.gstatic.com https://www.googletagmanager.com https://www.recaptcha.com https://recaptcha.net https://www.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "manifest-src 'self' https://vercel.com",
    `connect-src ${connectSrc}`,
    "frame-src 'self' https://www.google.com https://accounts.google.com https://www.recaptcha.com https://recaptcha.net",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // En emulador los requests son http a localhost: no forzar https.
    ...(useFirebaseEmulators ? [] : ['upgrade-insecure-requests']),
  ];

  return directives.join('; ');
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  const referer = request.headers.get('referer') || '';
  const isApiPath = SENSITIVE_PATHS.some((p) => request.nextUrl.pathname.startsWith(p));

  // CSRF protection for state-changing API methods
  if (isApiPath && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    // El navegador siempre envía `Origin` (y `Referer`) en peticiones que
    // modifican estado, así que basta con que uno de los dos apunte a un
    // origen permitido. Se revisan ambos porque `Referer` sí lo envían los
    // formularios y navegaciones.
    const isSameOrigin = isAllowedOrigin(origin) || isAllowedOrigin(referer);

    if (!isSameOrigin) {
      return new NextResponse('Forbidden: CSRF origin check failed', { status: 403 });
    }
  }

  const response = NextResponse.next();

  // Content Security Policy
  const csp = buildContentSecurityPolicy(process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true');

  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(self)');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.webmanifest$|.*\\.sw\.js$|.*\\.ico$).*)',
  ],
};
