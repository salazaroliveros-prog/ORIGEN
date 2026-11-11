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

import { useQuoteManagement } from './useQuoteManagement';
import { saveQuoteToFirestore, updateQuoteStatusInFirestore } from '../firebaseService';

const mockCompanyId = 'company-1';
const mockUserId = 'user-1';

function renderUseQuoteManagement(
  companyId: string = mockCompanyId,
  userId: string = mockUserId,
  quotes: any[] = []
) {
  return renderHook(() =>
    useQuoteManagement({ companyId, currentUserId: userId, quotes })
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useQuoteManagement', () => {
  describe('without auth', () => {
    it('should return addQuote that fails without auth', async () => {
      const { result } = renderUseQuoteManagement('', '', []);
      const success = await result.current.addQuote({} as any);
      expect(success).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith(
        'Inicia sesión en una empresa para guardar cotizaciones.'
      );
    });

    it('should return updateQuoteStatus that fails without auth', async () => {
      const { result } = renderUseQuoteManagement('', '', []);
      const success = await result.current.updateQuoteStatus('quote-1', 'Aceptada');
      expect(success).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith(
        'Inicia sesión en una empresa para actualizar cotizaciones.'
      );
    });
  });

  describe('with auth', () => {
    it('should add quote successfully', async () => {
      const { result } = renderUseQuoteManagement();
      vi.mocked(saveQuoteToFirestore).mockResolvedValueOnce(true);

      const quote = {
        id: 'quote-1',
        companyId: 'company-1',
        projectId: 'proj-1',
        clientName: 'Cliente',
        totalGTQ: 1000,
        status: 'Borrador',
        items: [],
      } as any;

      const success = await act(async () => {
        return await result.current.addQuote(quote);
      });

      expect(success).toBe(true);
      expect(saveQuoteToFirestore).toHaveBeenCalledWith(
        quote,
        'company-1',
        'user-1'
      );
    });

    it('should return false when add quote fails', async () => {
      const { result } = renderUseQuoteManagement();
      vi.mocked(saveQuoteToFirestore).mockResolvedValueOnce(false);

      const success = await act(async () => {
        return await result.current.addQuote({} as any);
      });

      expect(success).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith('No se pudo guardar la cotización.');
    });

    it('should update quote status successfully', async () => {
      const { result } = renderUseQuoteManagement(
        mockCompanyId,
        mockUserId,
        [{ id: 'quote-1', status: 'Borrador', companyId: 'company-1' }]
      );
      vi.mocked(updateQuoteStatusInFirestore).mockResolvedValueOnce(true);

      const success = await act(async () => {
        return await result.current.updateQuoteStatus('quote-1', 'Aceptada');
      });

      expect(success).toBe(true);
      expect(updateQuoteStatusInFirestore).toHaveBeenCalledWith(
        { id: 'quote-1', status: 'Borrador', companyId: 'company-1' },
        'Aceptada',
        'company-1',
        'user-1'
      );
    });

    it('should return false when quote not found for status update', async () => {
      const { result } = renderUseQuoteManagement(mockCompanyId, mockUserId, []);

      const success = await act(async () => {
        return await result.current.updateQuoteStatus('quote-999', 'Aceptada');
      });

      expect(success).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith('No se encontró la cotización.');
    });
  });
});
