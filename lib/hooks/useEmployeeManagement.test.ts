import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../firebaseService', () => import('../__mocks__/firebaseService'));

const mockToast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({
  default: mockToast,
  toast: mockToast,
}));

vi.mock('../utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('../utils/cacheManager', () => ({
  queryCache: {
    set: vi.fn(),
    get: vi.fn(),
    clear: vi.fn(),
    delete: vi.fn(),
  },
  createCacheKey: vi.fn((prefix: string, params: any) => prefix + ':' + JSON.stringify(params)),
}));

import { useEmployeeManagement } from './useEmployeeManagement';
import { saveEmployeeToFirestore, deleteEmployeeFromFirestore } from '../firebaseService';

const mockCompanyId = 'company-1';
const mockUserId = 'user-1';

function renderUseEmployeeManagement(companyId: string = mockCompanyId, userId: string = mockUserId) {
  return renderHook(() => useEmployeeManagement({ companyId, currentUserId: userId }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useEmployeeManagement', () => {
  describe('without auth', () => {
    it('should return addEmployee that fails without auth', async () => {
      const { result } = renderUseEmployeeManagement('', '');
      const success = await result.current.addEmployee({} as any);
      expect(success).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith('Inicia sesión para guardar empleados.');
    });

    it('should return deleteEmployee that fails without auth', async () => {
      const { result } = renderUseEmployeeManagement('', '');
      const success = await result.current.deleteEmployee('emp-1');
      expect(success).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith('Inicia sesión en una empresa para eliminar empleados.');
    });
  });

  describe('with auth', () => {
    it('should add employee successfully', async () => {
      const { result } = renderUseEmployeeManagement();
      const employee = { id: 'emp-1', name: 'Juan Pérez', role: 'Operador', companyId: 'company-1' } as any;

      const success = await act(async () => {
        return await result.current.addEmployee(employee);
      });

      expect(success).toBe(true);
      expect(saveEmployeeToFirestore).toHaveBeenCalledWith(employee, 'company-1', 'user-1');
      expect(mockToast.success).toHaveBeenCalledWith('Empleado registrado correctamente.');
    });

    it('should return false when add employee fails', async () => {
      const { result } = renderUseEmployeeManagement();
      vi.mocked(saveEmployeeToFirestore).mockResolvedValueOnce(false);
      const employee = { id: 'emp-1', name: 'Juan Pérez', role: 'Operador' } as any;

      const success = await act(async () => {
        return await result.current.addEmployee(employee);
      });

      expect(success).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith('No se pudo guardar el empleado.');
    });

    it('should delete employee successfully', async () => {
      const { result } = renderUseEmployeeManagement();
      vi.mocked(deleteEmployeeFromFirestore).mockResolvedValueOnce(true);

      const success = await act(async () => {
        return await result.current.deleteEmployee('emp-1');
      });

      expect(success).toBe(true);
      expect(deleteEmployeeFromFirestore).toHaveBeenCalledWith('emp-1', 'company-1');
      expect(mockToast.success).toHaveBeenCalledWith('Empleado eliminado correctamente.');
    });

    it('should return false when delete employee fails', async () => {
      const { result } = renderUseEmployeeManagement();
      vi.mocked(deleteEmployeeFromFirestore).mockResolvedValueOnce(false);

      const success = await act(async () => {
        return await result.current.deleteEmployee('emp-1');
      });

      expect(success).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith('No se pudo eliminar el empleado.');
    });
  });
});
