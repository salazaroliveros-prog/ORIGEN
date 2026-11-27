import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  auth: {
    currentUser: null as null | { getIdToken: () => Promise<string> },
  },
}));

vi.mock('@/lib/firebaseService', () => ({ auth: state.auth, appCheckInstance: null }));

import { authFetch, getIdTokenOrNull } from './apiClient';

describe('getIdTokenOrNull', () => {
  afterEach(() => {
    state.auth.currentUser = null;
  });

  it('returns null when there is no signed-in user', async () => {
    await expect(getIdTokenOrNull()).resolves.toBeNull();
  });

  it('returns the current ID token', async () => {
    state.auth.currentUser = { getIdToken: vi.fn().mockResolvedValue('id-token') };
    await expect(getIdTokenOrNull()).resolves.toBe('id-token');
  });

  it('returns null instead of throwing when the token cannot be refreshed', async () => {
    state.auth.currentUser = { getIdToken: vi.fn().mockRejectedValue(new Error('expired')) };
    await expect(getIdTokenOrNull()).resolves.toBeNull();
  });
});

describe('authFetch', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    state.auth.currentUser = null;
    vi.unstubAllGlobals();
  });

  it('attaches the Bearer token when the user is signed in', async () => {
    state.auth.currentUser = { getIdToken: vi.fn().mockResolvedValue('id-token') };

    await authFetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers((init as RequestInit).headers);
    expect(headers.get('authorization')).toBe('Bearer id-token');
    expect(headers.get('content-type')).toBe('application/json');
  });

  it('still performs the request without a session so the server can answer 401', async () => {
    await authFetch('/api/gemini');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/gemini');
    expect(new Headers((init as RequestInit | undefined)?.headers).get('authorization')).toBeNull();
  });
});
