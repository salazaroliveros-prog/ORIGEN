import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('./useAuthSession', () => ({
  useAuthSession: vi.fn(),
}));

vi.mock('./useCompanyWorkspace', () => ({
  useCompanyWorkspace: vi.fn(),
}));

import { useAuthSession } from './useAuthSession';
import { useCompanyWorkspace } from './useCompanyWorkspace';
import { useActiveWorkspace } from './useActiveWorkspace';

const mockUser = { uid: 'user-1', email: 'user@example.com' } as never;

function mockAuth(
  currentUser: typeof mockUser | null,
  status: 'loading' | 'authenticated' | 'unauthenticated' | 'error'
) {
  vi.mocked(useAuthSession).mockReturnValue({
    currentUser,
    status,
  } as unknown as ReturnType<typeof useAuthSession>);
}

function mockWorkspace(overrides: Partial<ReturnType<typeof useCompanyWorkspace>> = {}) {
  vi.mocked(useCompanyWorkspace).mockReturnValue({
    workspace: null,
    membership: null,
    availableWorkspaces: [],
    selectWorkspace: vi.fn(),
    loading: false,
    error: null,
    ...overrides,
  } as unknown as ReturnType<typeof useCompanyWorkspace>);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useActiveWorkspace', () => {
  it('expone empresa, usuario y rol cuando el workspace está resuelto', () => {
    mockAuth(mockUser, 'authenticated');
    mockWorkspace({
      workspace: { id: 'company-1' } as never,
      membership: { role: 'admin' } as never,
    });

    const { result } = renderHook(() => useActiveWorkspace());

    expect(result.current.companyId).toBe('company-1');
    expect(result.current.currentUserId).toBe('user-1');
    expect(result.current.role).toBe('admin');
    expect(result.current.ready).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('no está listo mientras la sesión carga', () => {
    mockAuth(null, 'loading');
    mockWorkspace();

    const { result } = renderHook(() => useActiveWorkspace());

    expect(result.current.ready).toBe(false);
    expect(result.current.loading).toBe(true);
    expect(result.current.companyId).toBe('');
    expect(result.current.currentUserId).toBe('');
  });

  it('no está listo mientras se resuelve la empresa', () => {
    mockAuth(mockUser, 'authenticated');
    mockWorkspace({ loading: true });

    const { result } = renderHook(() => useActiveWorkspace());

    expect(result.current.ready).toBe(false);
    expect(result.current.loading).toBe(true);
    expect(result.current.currentUserId).toBe('user-1');
    expect(result.current.companyId).toBe('');
  });

  it('deja de cargar cuando no hay sesión', () => {
    mockAuth(null, 'unauthenticated');
    mockWorkspace();

    const { result } = renderHook(() => useActiveWorkspace());

    expect(result.current.ready).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it('propaga el error legible del workspace', () => {
    mockAuth(mockUser, 'authenticated');
    mockWorkspace({ error: 'No tienes permisos para acceder a esta empresa.' });

    const { result } = renderHook(() => useActiveWorkspace());

    expect(result.current.ready).toBe(false);
    expect(result.current.error).toBe('No tienes permisos para acceder a esta empresa.');
  });
});
