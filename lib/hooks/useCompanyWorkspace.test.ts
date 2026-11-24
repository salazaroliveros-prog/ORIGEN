import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../companyWorkspace', () => ({
  ensureCompanyWorkspace: vi.fn(),
}));
vi.mock('../companyInvitations', () => ({
  acceptCompanyInvitation: vi.fn(),
}));

const mockToast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({
  default: mockToast,
  toast: mockToast,
}));

import { useCompanyWorkspace } from './useCompanyWorkspace';
import { ensureCompanyWorkspace } from '../companyWorkspace';

const mockUser = {
  uid: 'user-123',
  email: 'test@example.com',
} as any;

const mockWorkspaceResult: any = {
  workspace: { id: 'company-1', name: 'Construcciones García' },
  membership: { role: 'owner', companyId: 'company-1' },
  availableWorkspaces: [{ id: 'company-1', name: 'Construcciones García' }],
};

function setupWindowMocks() {
  const store: Record<string, string> = {};
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        Object.keys(store).forEach((k) => delete store[k]);
      }),
    },
    writable: true,
  });
  Object.defineProperty(window, 'location', {
    value: { search: '', pathname: '/', hash: '' },
    writable: true,
    configurable: true,
  });
  Object.defineProperty(window, 'history', {
    value: { replaceState: vi.fn() },
    writable: true,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  setupWindowMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useCompanyWorkspace', () => {
  it('should select workspace successfully', async () => {
    vi.mocked(ensureCompanyWorkspace).mockResolvedValue(mockWorkspaceResult);
    const { result } = renderHook(() => useCompanyWorkspace(mockUser));

    const success = await act(async () => {
      return await result.current.selectWorkspace('company-1');
    });

    expect(success).toBe(true);
    expect(ensureCompanyWorkspace).toHaveBeenCalledWith(mockUser, 'company-1');
    expect(result.current.workspace).toEqual(mockWorkspaceResult.workspace);
    expect(result.current.membership).toEqual(mockWorkspaceResult.membership);
    expect(result.current.availableWorkspaces).toEqual(mockWorkspaceResult.availableWorkspaces);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should return false when selectWorkspace fails', async () => {
    vi.mocked(ensureCompanyWorkspace).mockReset();
    vi.mocked(ensureCompanyWorkspace).mockRejectedValue(new Error('permission-denied'));
    const { result } = renderHook(() => useCompanyWorkspace(mockUser));

    const success = await act(async () => {
      return await result.current.selectWorkspace('company-1');
    });

    expect(success).toBe(false);
    expect(result.current.error).toContain('No tienes permisos');
    expect(result.current.loading).toBe(false);
  });

  it('hides the previous user workspace immediately while the next identity is resolving', async () => {
    const firstUser = { uid: 'user-one', email: 'one@example.com' } as any;
    const secondUser = { uid: 'user-two', email: 'two@example.com' } as any;
    let resolveSecond: (value: any) => void = () => {};
    const secondResult = new Promise<{
      workspace: any;
      membership: any;
      availableWorkspaces: any[];
    }>((resolve) => {
      resolveSecond = resolve;
    });

    vi.mocked(ensureCompanyWorkspace).mockImplementation((user: any) =>
      user.uid === firstUser.uid
        ? Promise.resolve({
            workspace: { id: 'company-one', name: 'Empresa uno' },
            membership: { role: 'owner', companyId: 'company-one', uid: firstUser.uid },
            availableWorkspaces: [{ id: 'company-one', name: 'Empresa uno' }],
          })
        : secondResult
    );

    const { result, rerender } = renderHook((user: any) => useCompanyWorkspace(user), {
      initialProps: firstUser,
    });

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.workspace?.id).toBe('company-one');
    expect(result.current.membership?.uid).toBe(firstUser.uid);

    rerender(secondUser);

    // The render caused by the identity change must never expose the old company.
    expect(result.current.workspace).toBeNull();
    expect(result.current.membership).toBeNull();
    expect(result.current.availableWorkspaces).toEqual([]);
    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveSecond({
        workspace: { id: 'company-two', name: 'Empresa dos' },
        membership: { role: 'field_worker', companyId: 'company-two', uid: secondUser.uid },
        availableWorkspaces: [{ id: 'company-two', name: 'Empresa dos' }],
      });
      await secondResult;
    });

    expect(result.current.workspace?.id).toBe('company-two');
    expect(result.current.membership?.uid).toBe(secondUser.uid);
    expect(result.current.loading).toBe(false);
  });

  it('should return false when no user', async () => {
    const { result } = renderHook(() => useCompanyWorkspace(null));

    const success = await act(async () => {
      return await result.current.selectWorkspace('company-1');
    });

    expect(success).toBe(false);
    expect(ensureCompanyWorkspace).not.toHaveBeenCalled();
  });

  it('should describe network error', async () => {
    vi.mocked(ensureCompanyWorkspace).mockReset();
    vi.mocked(ensureCompanyWorkspace).mockRejectedValue(new Error('unavailable'));
    const { result } = renderHook(() => useCompanyWorkspace(mockUser));

    await act(async () => {
      await result.current.selectWorkspace('company-1');
    });

    expect(result.current.error).toContain('No hay conexión');
    expect(result.current.loading).toBe(false);
  });

  it('should set loading state during selectWorkspace', async () => {
    let resolvePromise: (val: any) => void = () => {};
    const promise = new Promise((resolve) => {
      resolvePromise = resolve as (val: any) => void;
    }) as Promise<{ workspace: any; membership: any; availableWorkspaces: any[] }>;
    vi.mocked(ensureCompanyWorkspace).mockReset();
    vi.mocked(ensureCompanyWorkspace).mockImplementation(() => promise);

    const { result } = renderHook(() => useCompanyWorkspace(mockUser));

    const selectPromise = result.current.selectWorkspace('company-1');
    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolvePromise(mockWorkspaceResult);
      await selectPromise;
    });

    expect(result.current.loading).toBe(false);
  });
});
