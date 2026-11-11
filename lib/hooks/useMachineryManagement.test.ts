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

import { useMachineryManagement } from './useMachineryManagement';
import {
  saveMachineryToFirestore,
  updateMachineryStatusInFirestore,
  recordMachineryUse,
  deleteMachineryFromFirestore,
} from '../firebaseService';

const mockCompanyId = 'company-1';
const mockUserId = 'user-1';

function renderUseMachineryManagement(
  companyId: string = mockCompanyId,
  userId: string = mockUserId,
  machinery: any[] = []
) {
  return renderHook(() =>
    useMachineryManagement({ companyId, currentUserId: userId, machinery })
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useMachineryManagement', () => {
  describe('without auth', () => {
    it('should return addMachinery that fails without auth', async () => {
      const { result } = renderUseMachineryManagement('', '', []);
      const success = await result.current.addMachinery({} as any);
      expect(success).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith(
        'Inicia sesión en una empresa para registrar maquinaria.'
      );
    });
  });

  describe('with auth', () => {
    it('should add machinery successfully', async () => {
      const { result } = renderUseMachineryManagement();
      vi.mocked(saveMachineryToFirestore).mockResolvedValueOnce(true);

      const machinery = {
        id: 'mach-1',
        name: 'Excavadora',
        model: 'CAT 320',
        plateOrCode: 'EQ-01',
        hourlyRateGTQ: 300,
        currentHorometer: 0,
        status: 'Disponible',
        companyId: 'company-1',
      } as any;

      const success = await act(async () => {
        return await result.current.addMachinery(machinery);
      });

      expect(success).toBe(true);
      expect(saveMachineryToFirestore).toHaveBeenCalledWith(
        machinery,
        'company-1',
        'user-1'
      );
    });

    it('should return false when add machinery fails', async () => {
      const { result } = renderUseMachineryManagement();
      vi.mocked(saveMachineryToFirestore).mockResolvedValueOnce(false);

      const success = await act(async () => {
        return await result.current.addMachinery({} as any);
      });

      expect(success).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith('No se pudo guardar la maquinaria.');
    });

    it('should add machinery log successfully', async () => {
      const { result } = renderUseMachineryManagement(
        mockCompanyId,
        mockUserId,
        [{ id: 'mach-1', name: 'Excavadora', status: 'Disponible' }]
      );
      vi.mocked(recordMachineryUse).mockResolvedValueOnce(true);

      const log = {
        id: 'log-1',
        machineryId: 'mach-1',
        machineryName: 'Excavadora',
        projectId: 'proj-1',
        date: '2024-01-15',
        hoursWorked: 5,
        operatorName: 'Operador',
        fuelGallons: 10,
        costGTQ: 1500,
      } as any;

      const success = await act(async () => {
        return await result.current.addMachineryLog(log);
      });

      expect(success).toBe(true);
      expect(recordMachineryUse).toHaveBeenCalledWith(
        log,
        { id: 'mach-1', name: 'Excavadora', status: 'Disponible' },
        'company-1',
        'user-1'
      );
    });

    it('should return false when machinery not found for log', async () => {
      const { result } = renderUseMachineryManagement(mockCompanyId, mockUserId, []);

      const success = await act(async () => {
        return await result.current.addMachineryLog({ machineryId: 'mach-999' } as any);
      });

      expect(success).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith('No se encontró la maquinaria seleccionada.');
    });

    it('should set machinery status successfully', async () => {
      const { result } = renderUseMachineryManagement(
        mockCompanyId,
        mockUserId,
        [{ id: 'mach-1', name: 'Excavadora', status: 'Disponible' }]
      );
      vi.mocked(updateMachineryStatusInFirestore).mockResolvedValueOnce(true);

      const success = await act(async () => {
        return await result.current.setMachineryStatus('mach-1', 'En Obra');
      });

      expect(success).toBe(true);
      expect(updateMachineryStatusInFirestore).toHaveBeenCalledWith(
        { id: 'mach-1', name: 'Excavadora', status: 'Disponible' },
        'En Obra',
        'company-1',
        'user-1'
      );
    });

    it('should return false when machinery not found for status update', async () => {
      const { result } = renderUseMachineryManagement(mockCompanyId, mockUserId, []);

      const success = await act(async () => {
        return await result.current.setMachineryStatus('mach-999', 'En Obra');
      });

      expect(success).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith('No se encontró la maquinaria seleccionada.');
    });

    it('should delete machinery successfully', async () => {
      const { result } = renderUseMachineryManagement();
      vi.mocked(deleteMachineryFromFirestore).mockResolvedValueOnce(true);

      const success = await act(async () => {
        return await result.current.deleteMachinery('mach-1');
      });

      expect(success).toBe(true);
      expect(deleteMachineryFromFirestore).toHaveBeenCalledWith('mach-1', 'company-1');
      expect(mockToast.success).toHaveBeenCalledWith('Maquinaria eliminada correctamente.');
    });
  });
});
