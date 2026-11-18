import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { NextRequest } from 'next/server';
import { getConfiguredOrigins, isAllowedOrigin } from '@/middleware';

function stubRequest(origin: string): NextRequest {
  return {
    nextUrl: {
      origin,
      protocol: `${new URL(origin).protocol}`,
    },
    headers: new Headers(),
  } as unknown as NextRequest;
}

describe('getConfiguredOrigins', () => {
  const originalAllowed = process.env.ALLOWED_ORIGINS;
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    delete process.env.ALLOWED_ORIGINS;
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  afterEach(() => {
    if (originalAllowed === undefined) delete process.env.ALLOWED_ORIGINS;
    else process.env.ALLOWED_ORIGINS = originalAllowed;

    if (originalSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  });

  it('lee ALLOWED_ORIGINS separado por comas y normaliza espacios', () => {
    process.env.ALLOWED_ORIGINS = ' https://app.example.com , https://admin.example.com/path ';

    expect(getConfiguredOrigins()).toEqual([
      'https://app.example.com',
      'https://admin.example.com',
    ]);
  });

  it('incluye NEXT_PUBLIC_SITE_URL', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://origen.example.com';

    expect(getConfiguredOrigins()).toContain('https://origen.example.com');
  });

  it('ignora valores vacíos o inválidos y evita duplicados', () => {
    process.env.ALLOWED_ORIGINS = 'https://app.example.com,,no-es-url,https://app.example.com';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://app.example.com';

    expect(getConfiguredOrigins()).toEqual(['https://app.example.com']);
  });

  it('no exige configuración (la CSP usa self y el propio host)', () => {
    expect(getConfiguredOrigins()).toEqual([]);
  });
});

describe('isAllowedOrigin', () => {
  const originalAllowed = process.env.ALLOWED_ORIGINS;

  beforeEach(() => {
    process.env.ALLOWED_ORIGINS = 'https://app.example.com';
  });

  afterEach(() => {
    if (originalAllowed === undefined) delete process.env.ALLOWED_ORIGINS;
    else process.env.ALLOWED_ORIGINS = originalAllowed;
  });

  it('acepta un origen configurado', () => {
    expect(isAllowedOrigin('https://app.example.com')).toBe(true);
  });

  it('acepta un referer completo del origen configurado', () => {
    expect(isAllowedOrigin('https://app.example.com/proyectos/1?tab=resumen')).toBe(true);
  });

  it('acepta cualquier loopback local, sin importar el puerto', () => {
    expect(isAllowedOrigin('http://localhost:3000')).toBe(true);
    expect(isAllowedOrigin('http://localhost:4321')).toBe(true);
    expect(isAllowedOrigin('http://127.0.0.1:8080')).toBe(true);
    expect(isAllowedOrigin('http://[::1]:9099')).toBe(true);
  });

  it('acepta el mismo host que atendió la petición (previews y dominios propios)', () => {
    const request = stubRequest('https://origen-preview-abc.vercel.app');

    expect(isAllowedOrigin('https://origen-preview-abc.vercel.app', request)).toBe(true);
  });

  it('rechaza orígenes no configurados', () => {
    const request = stubRequest('https://origen-preview-abc.vercel.app');

    expect(isAllowedOrigin('https://evil.example.com', request)).toBe(false);
  });

  it('rechaza valores vacíos o no parseables', () => {
    expect(isAllowedOrigin('')).toBe(false);
    expect(isAllowedOrigin('null')).toBe(false);
    expect(isAllowedOrigin('no-es-una-url')).toBe(false);
  });
});
