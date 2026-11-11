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
      setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
      removeItem: vi.fn((key: string) => { delete store[key]; }),
      clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
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
    vi.mocked(ensureCompanyWorkspace).mockRejectedValueOnce(new Error('permission-denied'));
    const { result } = renderHook(() => useCompanyWorkspace(mockUser));

    const success = await act(async () => {
      return await result.current.selectWorkspace('company-1');
    });

    expect(success).toBe(false);
    expect(result.current.error).toContain('No tienes permisos');
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
    vi.mocked(ensureCompanyWorkspace).mockRejectedValueOnce(new Error('unavailable'));
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
    vi.mocked(ensureCompanyWorkspace).mockImplementationOnce(() => promise);

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
