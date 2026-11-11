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
  createCacheKey: vi.fn((prefix: string, params: any) => `${prefix}:${JSON.stringify(params)}`),
}));

vi.mock('../utils/calculations', () => ({
  validateAPUItem: vi.fn((item: any) => item),
}));

import { useAPUManagement } from './useAPUManagement';
import { saveAPUItemsToFirestore, deleteAPUItemFromFirestore } from '../firebaseService';

const mockCompanyId = 'company-1';
const mockUserId = 'user-1';

function renderUseAPUManagement(
  companyId: string = mockCompanyId,
  userId: string = mockUserId,
  projects: any[] = [],
  apuItems: any[] = []
) {
  return renderHook(() =>
    useAPUManagement({ companyId, currentUserId: userId, projects, apuItems })
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useAPUManagement', () => {
  describe('without auth', () => {
    it('should return saveAPUItems that fails without auth', async () => {
      const { result } = renderUseAPUManagement('', '', [], []);
      const success = await result.current.saveAPUItems([], 'proj-1');
      expect(success).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith(
        'Inicia sesión en una empresa para guardar el presupuesto APU.'
      );
    });

    it('should return deleteAPUItem that fails without auth', async () => {
      const { result } = renderUseAPUManagement('', '', [], []);
      const success = await result.current.deleteAPUItem('apu-1');
      expect(success).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith(
        'Inicia sesión en una empresa para eliminar partidas APU.'
      );
    });
  });

  describe('with auth', () => {
    it('should save APU items successfully', async () => {
      const { result } = renderUseAPUManagement(
        mockCompanyId,
        mockUserId,
        [{ id: 'proj-1', companyId: 'company-1' }],
        []
      );
      vi.mocked(saveAPUItemsToFirestore).mockResolvedValueOnce(true);

      const items = [
        {
          id: 'apu-1',
          code: 'CONC-001',
          description: 'Concreto',
          unit: 'm³',
          quantity: 50,
          materialUnitCostGTQ: 500,
          laborUnitCostGTQ: 300,
          equipmentUnitCostGTQ: 100,
          totalUnitCostGTQ: 900,
          totalPriceGTQ: 45000,
          projectId: 'proj-1',
          companyId: 'company-1',
          createdBy: 'user-1',
        },
      ];

      const success = await act(async () => {
        return await result.current.saveAPUItems(items, 'proj-1');
      });

      expect(success).toBe(true);
      expect(saveAPUItemsToFirestore).toHaveBeenCalledWith(items, 'proj-1', 'company-1', 'user-1');
    });

    it('should return false when project is invalid', async () => {
      const { result } = renderUseAPUManagement(mockCompanyId, mockUserId, [], []);

      const success = await act(async () => {
        return await result.current.saveAPUItems([], 'invalid-proj');
      });

      expect(success).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith(
        'Selecciona un proyecto válido para guardar las partidas APU.'
      );
    });

    it('should return false when save APU items fails', async () => {
      const { result } = renderUseAPUManagement(
        mockCompanyId,
        mockUserId,
        [{ id: 'proj-1', companyId: 'company-1' }],
        []
      );
      vi.mocked(saveAPUItemsToFirestore).mockResolvedValueOnce(false);

      const success = await act(async () => {
        return await result.current.saveAPUItems([{ id: 'apu-1' } as any], 'proj-1');
      });

      expect(success).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith('No se pudo guardar el presupuesto APU.');
    });

    it('should delete APU item successfully', async () => {
      const { result } = renderUseAPUManagement(
        mockCompanyId,
        mockUserId,
        [],
        [{ id: 'apu-1', companyId: 'company-1' }]
      );
      vi.mocked(deleteAPUItemFromFirestore).mockResolvedValueOnce(true);

      const success = await act(async () => {
        return await result.current.deleteAPUItem('apu-1');
      });

      expect(success).toBe(true);
      expect(deleteAPUItemFromFirestore).toHaveBeenCalledWith('apu-1');
    });

    it('should return false when APU item not found', async () => {
      const { result } = renderUseAPUManagement(mockCompanyId, mockUserId, [], []);

      const success = await act(async () => {
        return await result.current.deleteAPUItem('apu-999');
      });

      expect(success).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith('No se encontró la partida APU en esta empresa.');
    });
  });
});
