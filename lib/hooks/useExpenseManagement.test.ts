import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../firebaseService', () => import('../__mocks__/firebaseService'));
vi.mock('./useFirebaseSyncStatus', () => ({
  notifySyncEnd: vi.fn(),
}));

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
  createCacheKey: vi.fn((prefix: string, params: any) => `${prefix}:${JSON.stringify(params)}`),
}));

import { useExpenseManagement } from './useExpenseManagement';
import {
  saveExpenseToFirestore,
  updateExpenseToFirestore,
  deleteExpenseFromFirestore,
} from '../firebaseService';

const mockCompanyId = 'company-1';
const mockUserId = 'user-1';

function renderUseExpenseManagement(companyId: string = mockCompanyId, userId: string = mockUserId) {
  return renderHook(() => useExpenseManagement({ companyId, currentUserId: userId }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useExpenseManagement', () => {
  describe('without auth', () => {
    it('should return addExpense that fails without auth', async () => {
      const { result } = renderUseExpenseManagement('', '');
      const success = await result.current.addExpense({} as any);
      expect(success).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith('Usuario no autenticado');
    });

    it('should return updateExpense that fails without auth', async () => {
      const { result } = renderUseExpenseManagement('', '');
      const success = await result.current.updateExpense({} as any);
      expect(success).toBe(false);
    });

    it('should return deleteExpense that fails without auth', async () => {
      const { result } = renderUseExpenseManagement('', '');
      const success = await result.current.deleteExpense('exp-1');
      expect(success).toBe(false);
    });
  });

  describe('with auth', () => {
    it('should add expense successfully', async () => {
      const { result } = renderUseExpenseManagement();
      const expense = {
        id: 'exp-1',
        projectId: 'proj-1',
        date: '2024-01-15',
        category: 'Materiales',
        description: 'Cemento',
        amount: 500,
        companyId: 'company-1',
      } as any;

      const success = await act(async () => {
        return await result.current.addExpense(expense);
      });

      expect(success).toBe(true);
      expect(saveExpenseToFirestore).toHaveBeenCalledWith(expense, 'company-1', 'user-1');
      expect(mockToast.success).toHaveBeenCalledWith('Gasto registrado correctamente');
    });

    it('should return false when add expense fails', async () => {
      const { result } = renderUseExpenseManagement();
      vi.mocked(saveExpenseToFirestore).mockResolvedValueOnce(false);
      const expense = { id: 'exp-1', projectId: 'proj-1', amount: 500 } as any;

      const success = await act(async () => {
        return await result.current.addExpense(expense);
      });

      expect(success).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith('Error al guardar el gasto');
    });

    it('should update expense successfully', async () => {
      const { result } = renderUseExpenseManagement();
      vi.mocked(updateExpenseToFirestore).mockResolvedValueOnce(true);
      const expense = { id: 'exp-1', projectId: 'proj-1', amount: 500 } as any;

      const success = await act(async () => {
        return await result.current.updateExpense(expense);
      });

      expect(success).toBe(true);
      expect(updateExpenseToFirestore).toHaveBeenCalledWith(expense, 'company-1', 'user-1');
      expect(mockToast.success).toHaveBeenCalledWith('Gasto actualizado correctamente');
    });

    it('should delete expense successfully', async () => {
      const { result } = renderUseExpenseManagement();
      vi.mocked(deleteExpenseFromFirestore).mockResolvedValueOnce(true);

      const success = await act(async () => {
        return await result.current.deleteExpense('exp-1');
      });

      expect(success).toBe(true);
      expect(deleteExpenseFromFirestore).toHaveBeenCalledWith('exp-1');
      expect(mockToast.success).toHaveBeenCalledWith('Gasto eliminado correctamente');
    });

    it('should return false when delete expense fails', async () => {
      const { result } = renderUseExpenseManagement();
      vi.mocked(deleteExpenseFromFirestore).mockResolvedValueOnce(false);

      const success = await act(async () => {
        return await result.current.deleteExpense('exp-1');
      });

      expect(success).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith('Error al eliminar el gasto');
    });
  });
});
