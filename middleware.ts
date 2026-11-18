import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  buildRequestOrigins,
  getConfiguredOrigins as readConfiguredOrigins,
  isAllowedOriginValue,
} from '@/lib/originAllowlist';

const SENSITIVE_PATHS = ['/api/'];

const FIREBASE_EMULATOR_HOSTS = [
  'http://127.0.0.1:9099',
  'http://localhost:9099',
  'http://127.0.0.1:8080',
  'http://localhost:8080',
  'http://127.0.0.1:9199',
  'http://localhost:9199',
];

/** Orígenes configurados por entorno (`ALLOWED_ORIGINS`, `NEXT_PUBLIC_SITE_URL`). */
export function getConfiguredOrigins(): string[] {
  return readConfiguredOrigins();
}

function getRequestOrigins(request: NextRequest): string[] {
  return buildRequestOrigins({
    requestUrl: request.nextUrl.origin,
    host: request.headers.get('x-forwarded-host') ?? request.headers.get('host'),
    protocol: request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol,
  });
}

/**
 * Indica si un valor (`Origin` o `Referer`) apunta a un origen permitido:
 * loopback local, la lista de `ALLOWED_ORIGINS`/`NEXT_PUBLIC_SITE_URL` o el
 * mismo host que atendió la petición.
 */
export function isAllowedOrigin(candidate: string, request?: NextRequest): boolean {
  return isAllowedOriginValue(candidate, request ? getRequestOrigins(request) : []);
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
    // Cualquier preview de Vercel puede hacer peticiones al mismo backend.
    'https://*.vercel.app',
    'wss:',
    ...getConfiguredOrigins(),
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
  const origin = request.headers.get('origin') ?? '';
  const referer = request.headers.get('referer') ?? '';
  const isApiPath = SENSITIVE_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));

  // CSRF protection for state-changing API methods
  if (isApiPath && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    // El navegador envía `Origin` (y `Referer`) en peticiones que modifican
    // estado, así que se acepta si cualquiera de los dos apunta a un origen
    // permitido (incluido el mismo host que atendió la petición).
    //
    // Un request sin `Origin` ni `Referer` no puede ser un CSRF de navegador:
    // son clientes server-to-server (curl, jobs, scripts de despliegue).
    const hasOriginMetadata = origin !== '' || referer !== '';
    const requestOrigins = getRequestOrigins(request);
    const isSameOrigin =
      !hasOriginMetadata ||
      isAllowedOriginValue(origin, requestOrigins) ||
      isAllowedOriginValue(referer, requestOrigins);

    if (!isSameOrigin) {
      return new NextResponse('Forbidden: CSRF origin check failed', { status: 403 });
    }
  }

  const response = NextResponse.next();

  // Content Security Policy
  const isEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';
  const csp = buildContentSecurityPolicy(isEmulator);

  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  if (isEmulator) {
    response.headers.set('X-Firebase-Emulator-Mode', 'true');
  }
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(self)');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.webmanifest$|.*\\.sw\\.js$|.*\\.ico$).*)',
  ],
};
