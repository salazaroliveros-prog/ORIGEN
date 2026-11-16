import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authSubscriber: vi.fn(),
  settingsSubscriber: vi.fn(),
  saveSettings: vi.fn(),
  getAuth: vi.fn(),
}));

vi.mock('@/lib/firebaseAuth', () => ({
  subscribeToAuthState: (...args: unknown[]) => mocks.authSubscriber(...args),
}));

vi.mock('@/lib/firebaseService', () => ({
  subscribeCompanySettings: (...args: unknown[]) => mocks.settingsSubscriber(...args),
  saveCompanySettingsToFirestore: (...args: unknown[]) => mocks.saveSettings(...args),
  getAuthOrThrow: () => mocks.getAuth(),
}));

import { useCompanyOnboarding } from './useCompanyOnboarding';

type AuthCallback = (user: { uid: string } | null) => void;
type SettingsCallback = (settings: Record<string, unknown> | null) => void;

let authCallback: AuthCallback = () => undefined;
const settingsCallbacks = new Map<string, SettingsCallback>();
const settingsUnsubscribers = new Map<string, ReturnType<typeof vi.fn>>();

const companySettings = {
  companyId: 'user-1',
  ownerId: 'user-1',
  legalName: 'Empresa de prueba',
  commercialName: 'Empresa de prueba',
} as any;

beforeEach(() => {
  vi.clearAllMocks();
  settingsCallbacks.clear();
  settingsUnsubscribers.clear();

  mocks.authSubscriber.mockImplementation((onUser: unknown) => {
    authCallback = onUser as AuthCallback;
    return vi.fn();
  });

  mocks.settingsSubscriber.mockImplementation((companyId: unknown, callback: unknown) => {
    settingsCallbacks.set(String(companyId), callback as SettingsCallback);
    const unsubscribe = vi.fn();
    settingsUnsubscribers.set(String(companyId), unsubscribe);
    return unsubscribe;
  });

  mocks.saveSettings.mockResolvedValue(true);
  mocks.getAuth.mockReturnValue({ currentUser: null });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useCompanyOnboarding', () => {
  it('waits for Firebase Auth restoration before checking the company', () => {
    const { result, unmount } = renderHook(() => useCompanyOnboarding());

    expect(mocks.authSubscriber).toHaveBeenCalledTimes(1);
    expect(mocks.settingsSubscriber).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(true);
    expect(result.current.hasCompany).toBe(false);

    act(() => authCallback(null));
    expect(result.current.loading).toBe(false);
    expect(result.current.hasCompany).toBe(false);

    act(() => authCallback({ uid: 'user-1' }));
    expect(result.current.loading).toBe(true);
    expect(mocks.settingsSubscriber).toHaveBeenCalledWith('user-1', expect.any(Function));

    act(() => settingsCallbacks.get('user-1')?.(companySettings));
    expect(result.current.loading).toBe(false);
    expect(result.current.hasCompany).toBe(true);
    expect(result.current.company).toEqual(companySettings);

    unmount();
  });

  it('cleans up the previous company subscription when the auth user changes', () => {
    const { result, unmount } = renderHook(() => useCompanyOnboarding());

    act(() => authCallback({ uid: 'user-1' }));
    act(() => settingsCallbacks.get('user-1')?.(companySettings));
    expect(result.current.hasCompany).toBe(true);

    const staleSettingsCallback = settingsCallbacks.get('user-1');
    act(() => authCallback({ uid: 'user-2' }));
    expect(settingsUnsubscribers.get('user-1')).toHaveBeenCalledTimes(1);
    act(() => staleSettingsCallback?.({ ...companySettings, legalName: 'Empresa anterior' }));
    expect(result.current.company).toBeNull();
    expect(result.current.hasCompany).toBe(false);
    expect(result.current.loading).toBe(true);

    act(() => settingsCallbacks.get('user-2')?.({ ...companySettings, companyId: 'user-2' }));
    expect(result.current.hasCompany).toBe(true);
    expect(result.current.company?.companyId).toBe('user-2');

    unmount();
  });

  it('clears company state after signing out and unsubscribes on unmount', () => {
    const { result, unmount } = renderHook(() => useCompanyOnboarding());

    act(() => authCallback({ uid: 'user-1' }));
    act(() => settingsCallbacks.get('user-1')?.(companySettings));
    act(() => authCallback(null));

    expect(settingsUnsubscribers.get('user-1')).toHaveBeenCalledTimes(1);
    expect(result.current.company).toBeNull();
    expect(result.current.hasCompany).toBe(false);
    expect(result.current.loading).toBe(false);

    unmount();
    expect(result.current.loading).toBe(false);
  });
});
