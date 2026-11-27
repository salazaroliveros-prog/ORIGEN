import { beforeEach, describe, expect, it, vi } from 'vitest';

import nextConfig from '../../next.config';

/**
 * Validación funcional de las cabeceras de seguridad emitidas por Next.js.
 * Complementa (no duplica) el stub `middlewareCsp.test.ts`, que está saltado.
 * Estas pruebas protegen contra regresiones de dos bugs reales de producción:
 *  - CSP sin 'unsafe-inline'/nonce -> rompía la hidratación de Next y el Service Worker.
 *  - Permissions-Policy con camera/geolocation/clipboard-write vacíos -> rompía
 *    getUserMedia, geolocalización y copiar al portapapeles de la app.
 */

// Estas cabeceras son intencionalmente específicas de producción: en HTTP
// local, forzar HTTPS rompe la hidratación. Simulamos el entorno de despliegue.
beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'production');
});

type Header = { key: string; value: string };

async function getHeader(name: string): Promise<string> {
  const fn = nextConfig.headers as unknown as () => Promise<{ headers: Header[] }[]>;
  const groups = await fn();
  const headers = groups.flatMap((group) => group.headers);
  const found = headers.find((h) => h.key.toLowerCase() === name.toLowerCase());
  return found?.value ?? '';
}

describe('Content-Security-Policy', () => {
  it('permite estilos y scripts inline (hidratación de Next + estilos de librerías)', async () => {
    const csp = await getHeader('Content-Security-Policy');
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
  });

  it('habilita el Service Worker/PWA (worker-src + manifest-src)', async () => {
    const csp = await getHeader('Content-Security-Policy');
    expect(csp).toContain("worker-src 'self' blob:");
    expect(csp).toContain("manifest-src 'self'");
  });

  it('mantiene orígenes de Firebase/Google y bloquea object-src', async () => {
    const csp = await getHeader('Content-Security-Policy');
    expect(csp).toContain('https://*.googleapis.com');
    expect(csp).toContain('wss://*.firebaseio.com');
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain('upgrade-insecure-requests');
  });
});

describe('Permissions-Policy', () => {
  it('habilita las APIs que usa la app (cámara, geolocalización, portapapeles escritura)', async () => {
    const pp = await getHeader('Permissions-Policy');
    expect(pp).toContain('camera=(self)');
    expect(pp).toContain('geolocation=(self)');
    expect(pp).toContain('clipboard-write=(self)');
  });

  it('sigue restringiendo APIs sensibles no usadas', async () => {
    const pp = await getHeader('Permissions-Policy');
    expect(pp).toContain('microphone=()');
    expect(pp).toContain('usb=()');
    expect(pp).toContain('payment=()');
    expect(pp).not.toContain('microphone=(self)');
  });
});

describe('Otras cabeceras de endurecimiento', () => {
  it('incluye HSTS, anti-clickjacking y anti-MIME-sniffing', async () => {
    expect(await getHeader('Strict-Transport-Security')).toContain('max-age=31536000');
    expect(await getHeader('X-Frame-Options')).toBe('DENY');
    expect(await getHeader('X-Content-Type-Options')).toBe('nosniff');
  });
});
