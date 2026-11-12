'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { QuoteRecord } from '@/lib/types';
import {
  subscribeQuotes,
  saveQuoteToFirestore,
  updateQuoteStatusInFirestore,
  deleteQuoteFromFirestore,
} from '@/lib/firebaseService';
import { validateQuoteRecord } from '@/lib/validation/entity.schemas';
import { toast } from 'react-hot-toast';
import { createLogger } from '@/lib/utils/logger';
import { queryCache, createCacheKey } from '@/lib/utils/cacheManager';

const log = createLogger('useQuotes');

export interface UseQuotesOptions {
  companyId?: string;
  currentUserId?: string;
}

export interface UseQuotesReturn {
  quotes: QuoteRecord[];
  loading: boolean;
  addQuote: (quote: QuoteRecord) => Promise<boolean>;
  updateQuoteStatus: (quoteId: string, status: QuoteRecord['status']) => Promise<boolean>;
  deleteQuote: (quoteId: string) => Promise<boolean>;
}

export function useQuotes({ companyId, currentUserId }: UseQuotesOptions): UseQuotesReturn {
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const hasInitializedRef = useRef(false);
  const lastCompanyIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!companyId || !currentUserId) {
      if (!hasInitializedRef.current) return;
      log.debug('Missing auth context, clearing quotes');
      setQuotes([]);
      setLoading(false);
      hasInitializedRef.current = false;
      lastCompanyIdRef.current = null;
      return;
    }

    if (hasInitializedRef.current && lastCompanyIdRef.current === companyId) return;

    hasInitializedRef.current = true;
    lastCompanyIdRef.current = companyId;

    log.info('Starting quotes subscription', { companyId });
    setLoading(true);

    const unsubQuotes = subscribeQuotes(companyId, (data) => {
      log.debug('Quotes updated', { count: data.length });
      const cacheKey = createCacheKey('quotes', { companyId });
      queryCache.set(cacheKey, data, 5 * 60 * 1000);
      setQuotes(data);
      setLoading(false);
    });

    return () => {
      log.info('Unsubscribing from quotes');
      unsubQuotes();
    };
  }, [companyId, currentUserId]);

  const addQuote = useCallback(
    async (quote: QuoteRecord) => {
      if (!companyId || !currentUserId) {
        log.warn('Quote creation attempted without auth');
        toast.error('Inicia sesión en una empresa para guardar cotizaciones.');
        return false;
      }

      try {
        log.info('Creating quote', { clientName: quote.clientName, totalGTQ: quote.totalGTQ });
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
      if (!companyId || !currentUserId) {
        log.warn('Quote status update attempted without auth');
        toast.error('Inicia sesión en una empresa para actualizar cotizaciones.');
        return false;
      }

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

  const deleteQuote = useCallback(
    async (quoteId: string) => {
      if (!companyId || !currentUserId) {
        log.warn('Quote deletion attempted without auth');
        toast.error('Inicia sesión para eliminar cotizaciones.');
        return false;
      }

      const quote = quotes.find((item) => item.id === quoteId);
      if (!quote) {
        log.warn('Quote not found for deletion', { quoteId });
        toast.error('No se encontró la cotización.');
        return false;
      }

      if (!window.confirm('¿Eliminar esta cotización?')) return false;

      try {
        log.info('Deleting quote', { quoteId });
        const deleted = await deleteQuoteFromFirestore(quoteId);
        if (deleted) {
          log.info('Quote deleted successfully', { quoteId });
          toast.success('Cotización eliminada correctamente.');
          const cacheKey = createCacheKey('quotes', { companyId });
          queryCache.clear(cacheKey);
        } else {
          log.error('Quote deletion failed', { quoteId });
          toast.error('No se pudo eliminar la cotización.');
        }
        return deleted;
      } catch (err) {
        log.error('Quote deletion error', err as Error, { quoteId });
        toast.error('Error al eliminar la cotización.');
        return false;
      }
    },
    [companyId, currentUserId, quotes]
  );

  return {
    quotes,
    loading,
    addQuote,
    updateQuoteStatus,
    deleteQuote,
  };
}