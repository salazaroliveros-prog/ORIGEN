import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { canReadDocumentAsUser, getBearerToken, requireApiUser } from './apiAuth';

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new Request('http://localhost/api/test', { headers }) as unknown as NextRequest;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('getBearerToken', () => {
  it('returns the token from a Bearer header', () => {
    expect(getBearerToken(makeRequest({ authorization: 'Bearer abc.def.ghi' }))).toBe(
      'abc.def.ghi'
    );
  });

  it('is case-insensitive on the scheme', () => {
    expect(getBearerToken(makeRequest({ authorization: 'bearer token-123' }))).toBe('token-123');
  });

  it('returns null without header or with another scheme', () => {
    expect(getBearerToken(makeRequest())).toBeNull();
    expect(getBearerToken(makeRequest({ authorization: 'Basic abc' }))).toBeNull();
    expect(getBearerToken(makeRequest({ authorization: 'Bearer   ' }))).toBeNull();
  });
});

describe('requireApiUser', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_FIREBASE_API_KEY', 'test-api-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('rejects requests without a token (fail-closed)', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await requireApiUser(makeRequest());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 503 when the project API key is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_FIREBASE_API_KEY', '');
    vi.stubGlobal('fetch', vi.fn());

    const result = await requireApiUser(makeRequest({ authorization: 'Bearer token' }));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(503);
  });

  it('returns the identity when Identity Toolkit validates the token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        users: [
          {
            localId: 'uid-1',
            email: 'residente@origen.gt',
            emailVerified: true,
            displayName: 'Residente de Obra',
          },
        ],
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await requireApiUser(makeRequest({ authorization: 'Bearer token' }));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user).toEqual({
        uid: 'uid-1',
        email: 'residente@origen.gt',
        emailVerified: true,
        displayName: 'Residente de Obra',
      });
      expect(result.idToken).toBe('token');
    }

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('accounts:lookup');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ idToken: 'token' });
  });

  it('treats an invalid or expired token as unauthenticated', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ error: { message: 'INVALID_ID_TOKEN' } }, 400))
    );

    const result = await requireApiUser(makeRequest({ authorization: 'Bearer expired' }));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it('treats an empty lookup as unauthenticated', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ users: [] })));

    const result = await requireApiUser(makeRequest({ authorization: 'Bearer token' }));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it('returns 503 when Identity Toolkit is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const result = await requireApiUser(makeRequest({ authorization: 'Bearer token' }));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(503);
  });

  it('ignores a non-boolean emailVerified flag', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ users: [{ localId: 'uid-2' }] }))
    );

    const result = await requireApiUser(makeRequest({ authorization: 'Bearer token' }));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.emailVerified).toBe(false);
      expect(result.user.email).toBeNull();
      expect(result.user.displayName).toBeNull();
    }
  });
});

describe('canReadDocumentAsUser', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'origen-erp');
    vi.stubEnv('NEXT_PUBLIC_FIRESTORE_DATABASE_ID', '(default)');
    vi.stubEnv('NEXT_PUBLIC_USE_FIREBASE_EMULATORS', 'false');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('returns allowed when Firestore rules authorize the read', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ name: 'projects/p1' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(canReadDocumentAsUser('token', 'projects', 'p1')).resolves.toBe('allowed');

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/projects/origen-erp/databases/(default)/documents/projects/p1');
    expect((init as RequestInit).headers).toEqual({ Authorization: 'Bearer token' });
  });

  it('returns denied on 403/404 (no access or missing project)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 403 })));
    await expect(canReadDocumentAsUser('token', 'projects', 'p1')).resolves.toBe('denied');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })));
    await expect(canReadDocumentAsUser('token', 'projects', 'p1')).resolves.toBe('denied');
  });

  it('returns unavailable on server errors or network failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 500 })));
    await expect(canReadDocumentAsUser('token', 'projects', 'p1')).resolves.toBe('unavailable');

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(canReadDocumentAsUser('token', 'projects', 'p1')).resolves.toBe('unavailable');
  });

  it('uses the emulator host when emulators are enabled', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_FIREBASE_EMULATORS', 'true');
    vi.stubEnv('NEXT_PUBLIC_FIREBASE_EMULATOR_HOST', '127.0.0.1');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));
    vi.stubGlobal('fetch', fetchMock);

    await canReadDocumentAsUser('token', 'projects', 'p1');

    expect(String(fetchMock.mock.calls[0][0])).toContain('http://127.0.0.1:8080/v1/projects/');
  });
});
