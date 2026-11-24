import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CompanyRole, Employee, EmployeeDirectoryEntry } from '@/lib/types';

const mocks = vi.hoisted(() => ({
  subscribeEmployees: vi.fn(),
  subscribeEmployeeDirectory: vi.fn(),
  saveEmployeeToFirestore: vi.fn(),
  deleteEmployeeFromFirestore: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/lib/firebaseService', () => ({
  subscribeEmployees: mocks.subscribeEmployees,
  subscribeEmployeeDirectory: mocks.subscribeEmployeeDirectory,
  saveEmployeeToFirestore: mocks.saveEmployeeToFirestore,
  deleteEmployeeFromFirestore: mocks.deleteEmployeeFromFirestore,
}));

vi.mock('@/lib/validation/entity.schemas', () => ({ validateEmployee: vi.fn() }));
vi.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({ info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));
vi.mock('@/lib/utils/cacheManager', () => ({
  queryCache: { set: vi.fn(), clear: vi.fn() },
  createCacheKey: vi.fn((name: string, context: unknown) => name + JSON.stringify(context)),
}));
vi.mock('react-hot-toast', () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

import { useEmployees } from './useEmployees';

type HookProps = { companyId?: string; currentUserId?: string; role?: CompanyRole };

describe('useEmployees subscription lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('replaces full personnel data with the restricted directory when identity or role changes', () => {
    let fullCallback: ((items: Employee[]) => void) | undefined;
    let directoryCallback: ((items: EmployeeDirectoryEntry[]) => void) | undefined;
    const unsubscribeFull = vi.fn();
    const unsubscribeDirectory = vi.fn();

    mocks.subscribeEmployees.mockImplementation(
      (_companyId: string, callback: (items: Employee[]) => void) => {
        fullCallback = callback;
        return unsubscribeFull;
      }
    );
    mocks.subscribeEmployeeDirectory.mockImplementation(
      (_companyId: string, callback: (items: EmployeeDirectoryEntry[]) => void) => {
        directoryCallback = callback;
        return unsubscribeDirectory;
      }
    );

    const initial: HookProps = { companyId: 'company-1', currentUserId: 'owner-1', role: 'owner' };
    const { result, rerender } = renderHook((props: HookProps) => useEmployees(props), {
      initialProps: initial,
    });

    const privateEmployee = {
      id: 'employee-1',
      name: 'Empleado',
      dailyRateGTQ: 450,
    } as Employee;
    act(() => fullCallback?.([privateEmployee]));
    expect(result.current.fullEmployees).toHaveLength(1);

    rerender({ companyId: 'company-1', currentUserId: 'worker-2', role: 'field_worker' });

    expect(unsubscribeFull).toHaveBeenCalledTimes(1);
    expect(mocks.subscribeEmployeeDirectory).toHaveBeenCalledTimes(1);
    expect(result.current.employees).toEqual([]);
    expect(result.current.fullEmployees).toEqual([]);

    const directoryEntry = {
      id: 'employee-1',
      companyId: 'company-1',
      name: 'Empleado',
      role: 'Operario',
    } as unknown as EmployeeDirectoryEntry;
    act(() => directoryCallback?.([directoryEntry]));

    expect(result.current.employees).toEqual([directoryEntry]);
    expect(result.current.fullEmployees).toEqual([]);
  });
});
