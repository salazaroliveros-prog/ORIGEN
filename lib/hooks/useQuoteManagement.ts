'use client';

/**
 * Hook de gestión de Cotizaciones (Quotes).
 * Encapsula crear y actualizar el estado de cotizaciones.
 */
import { useCallback } from 'react';
import type { QuoteRecord } from '@/lib/types';
import {
  saveQuoteToFirestore,
  updateQuoteStatusInFirestore,
} from '@/lib/firebaseService';
import { createLogger } from '@/lib/utils/logger';
import { createCacheKey, queryCache } from '@/lib/utils/cacheManager';
import { notifySyncEnd } from './useFirebaseSyncStatus';
import { toast } from 'react-hot-toast';

const log = createLogger('useQuoteManagement');

interface UseQuoteManagementParams {
  companyId: string;
  currentUserId: string;
  quotes: QuoteRecord[];
}

export function useQuoteManagement({
  companyId,
  currentUserId,
  quotes,
}: UseQuoteManagementParams) {
  const addQuote = useCallback(
    async (quote: QuoteRecord) => {
      toast.error('Inicia sesión en una empresa para guardar cotizaciones.');
      return false;
    },
    []
  );

  const addQuoteWithAuth = useCallback(
    async (quote: QuoteRecord) => {
      try {
        log.info('Creating quote', {
          clientName: quote.clientName,
          totalGTQ: quote.totalGTQ,
        });
        const saved = await saveQuoteToFirestore(quote, companyId, currentUserId);
        if (!saved) {
          log.error('Quote creation failed', { quoteId: quote.id });
          toast.error('No se pudo guardar la cotización.');
          return false;
        }

        log.info('Quote created successfully', { quoteId: quote.id });
        const cacheKey = createCacheKey('quotes', { companyId });
        queryCache.clear(cacheKey);
        return true;
      } catch (err) {
        log.error('Quote creation error', err as Error, { companyId });
        toast.error('Error al guardar la cotización.');
        return false;
      }
    },
    [companyId, currentUserId]
  );

  const updateQuoteStatus = useCallback(
    async (quoteId: string, status: QuoteRecord['status']) => {
      toast.error('Inicia sesión en una empresa para actualizar cotizaciones.');
      return false;
    },
    []
  );

  const updateQuoteStatusWithAuth = useCallback(
    async (quoteId: string, status: QuoteRecord['status']) => {
      const quote = quotes.find((item) => item.id === quoteId);
      if (!quote) {
        log.warn('Quote not found for status update', { quoteId });
        toast.error('No se encontró la cotización.');
        return false;
      }

      try {
        log.info('Updating quote status', { quoteId, newStatus: status });
        const saved = await updateQuoteStatusInFirestore(quote, status, companyId, currentUserId);
        if (!saved) {
          log.error('Quote status update failed', { quoteId });
          toast.error('No se pudo actualizar el estado de la cotización.');
          return false;
        }

        log.info('Quote status updated successfully', { quoteId, newStatus: status });
        const cacheKey = createCacheKey('quotes', { companyId });
        queryCache.clear(cacheKey);
        return true;
      } catch (err) {
        log.error('Quote status update error', err as Error, { quoteId });
        toast.error('Error al actualizar la cotización.');
        return false;
      }
    },
    [companyId, currentUserId, quotes]
  );

  return {
    addQuote: companyId && currentUserId ? addQuoteWithAuth : addQuote,
    updateQuoteStatus: companyId && currentUserId ? updateQuoteStatusWithAuth : updateQuoteStatus,
  };
}
