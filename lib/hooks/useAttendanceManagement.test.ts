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

import { useAttendanceManagement } from './useAttendanceManagement';
import { saveAttendanceToFirestore, deleteAttendanceFromFirestore } from '../firebaseService';

const mockCompanyId = 'company-1';
const mockUserId = 'user-1';

function renderUseAttendanceManagement(
  companyId: string = mockCompanyId,
  userId: string = mockUserId,
  attendance: any[] = []
) {
  return renderHook(() =>
    useAttendanceManagement({ companyId, currentUserId: userId, attendance })
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useAttendanceManagement', () => {
  describe('without auth', () => {
    it('should return addAttendance that fails without auth', async () => {
      const { result } = renderUseAttendanceManagement('', '', []);
      const success = await result.current.addAttendance({} as any);
      expect(success).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith('Usuario no autenticado');
    });

    it('should return deleteAttendance that fails without auth', async () => {
      const { result } = renderUseAttendanceManagement('', '', []);
      const success = await result.current.deleteAttendance('att-1');
      expect(success).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith('Inicia sesión para eliminar un registro de asistencia.');
    });
  });

  describe('with auth', () => {
    it('should add attendance successfully', async () => {
      const { result } = renderUseAttendanceManagement();
      const record = {
        id: 'att-1',
        projectId: 'proj-1',
        employeeId: 'emp-1',
        date: '2024-01-15',
        hoursWorked: 8,
        companyId: 'company-1',
      } as any;

      const success = await act(async () => {
        return await result.current.addAttendance(record);
      });

      expect(success).toBe(true);
      expect(saveAttendanceToFirestore).toHaveBeenCalledWith(record, 'company-1', 'user-1');
      expect(mockToast.success).toHaveBeenCalledWith('Asistencia registrada correctamente');
    });

    it('should return false when add attendance fails', async () => {
      const { result } = renderUseAttendanceManagement();
      vi.mocked(saveAttendanceToFirestore).mockResolvedValueOnce(false);
      const record = { id: 'att-1', projectId: 'proj-1' } as any;

      const success = await act(async () => {
        return await result.current.addAttendance(record);
      });

      expect(success).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith('No se pudo guardar la asistencia');
    });

    it('should delete attendance successfully', async () => {
      const { result } = renderUseAttendanceManagement(
        mockCompanyId,
        mockUserId,
        [{ id: 'att-1', companyId: 'company-1' }]
      );
      window.confirm = vi.fn(() => true);
      vi.mocked(deleteAttendanceFromFirestore).mockResolvedValueOnce(true);

      const success = await act(async () => {
        return await result.current.deleteAttendance('att-1');
      });

      expect(success).toBe(true);
      expect(deleteAttendanceFromFirestore).toHaveBeenCalledWith('att-1');
      expect(mockToast.success).toHaveBeenCalledWith('Registro de asistencia eliminado.');
    });

    it('should return false when attendance not found', async () => {
      const { result } = renderUseAttendanceManagement(mockCompanyId, mockUserId, []);

      const success = await act(async () => {
        return await result.current.deleteAttendance('att-999');
      });

      expect(success).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith('No se encontró el registro de asistencia.');
    });

    it('should return false when user cancels deletion', async () => {
      const { result } = renderUseAttendanceManagement(
        mockCompanyId,
        mockUserId,
        [{ id: 'att-1', companyId: 'company-1' }]
      );
      window.confirm = vi.fn(() => false);

      const success = await act(async () => {
        return await result.current.deleteAttendance('att-1');
      });

      expect(success).toBe(false);
      expect(deleteAttendanceFromFirestore).not.toHaveBeenCalled();
    });
  });
});
