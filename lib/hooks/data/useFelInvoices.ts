'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FelInvoice } from '@/lib/types';
import {
  subscribeFelInvoices,
  saveFelInvoiceToFirestore,
  updateFelInvoiceToFirestore,
  deleteFelInvoiceFromFirestore,
} from '@/lib/firebaseService';
import { toast } from 'react-hot-toast';
import { createLogger } from '@/lib/utils/logger';
import { queryCache, createCacheKey } from '@/lib/utils/cacheManager';
import { notifySyncEnd } from '../useFirebaseSyncStatus';

const log = createLogger('useFelInvoices');

export interface UseFelInvoicesOptions {
  companyId?: string;
  currentUserId?: string;
}

export interface UseFelInvoicesReturn {
  invoices: FelInvoice[];
  loading: boolean;
  addInvoice: (invoice: FelInvoice) => Promise<boolean>;
  updateInvoice: (invoice: FelInvoice) => Promise<boolean>;
  deleteInvoice: (invoiceId: string) => Promise<boolean>;
}

export function useFelInvoices({
  companyId,
  currentUserId,
}: UseFelInvoicesOptions): UseFelInvoicesReturn {
  const [invoices, setInvoices] = useState<FelInvoice[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId || !currentUserId) {
      log.debug('Missing auth context, clearing invoices');
      setInvoices([]);
      setLoading(false);
      return;
    }

    log.info('Starting FEL invoices subscription', { companyId });
    setInvoices([]);
    setLoading(true);

    const unsubInvoices = subscribeFelInvoices(companyId, (data) => {
      log.debug('FEL invoices updated', { count: data.length });
      const cacheKey = createCacheKey('felInvoices', { companyId });
      queryCache.set(cacheKey, data, 5 * 60 * 1000);
      setInvoices(data);
      setLoading(false);
    });

    return () => {
      log.info('Unsubscribing from FEL invoices');
      unsubInvoices();
    };
  }, [companyId, currentUserId]);

  const addInvoice = useCallback(
    async (invoice: FelInvoice) => {
      if (!companyId || !currentUserId) {
        log.warn('Invoice creation attempted without auth');
        toast.error('Usuario no autenticado');
        return false;
      }

      try {
        log.info('Creating FEL invoice', {
          invoiceId: invoice.id,
          dteNumber: invoice.dteNumber,
          totalGTQ: invoice.totalGTQ,
        });
        const ok = await saveFelInvoiceToFirestore(
          invoice,
          companyId,
          currentUserId
        );
        if (ok) {
          log.info('FEL invoice created successfully', { invoiceId: invoice.id });
          toast.success('Factura FEL guardada correctamente');
          const cacheKey = createCacheKey('felInvoices', { companyId });
          queryCache.clear(cacheKey);
          return true;
        }

        log.error('FEL invoice creation failed in Firestore', {
          invoiceId: invoice.id,
        });
        toast.error('Error al guardar la factura FEL');
        return false;
      } catch (err) {
        notifySyncEnd();
        log.error('FEL invoice creation error', err as Error, {
          companyId,
        });
        toast.error('Error inesperado al guardar la factura FEL');
        return false;
      }
    },
    [companyId, currentUserId]
  );

  const updateInvoice = useCallback(
    async (invoice: FelInvoice) => {
      if (!companyId || !currentUserId) {
        log.warn('Invoice update attempted without auth');
        toast.error('Usuario no autenticado');
        return false;
      }

      try {
        log.info('Updating FEL invoice', { invoiceId: invoice.id });
        const ok = await updateFelInvoiceToFirestore(
          invoice,
          companyId,
          currentUserId
        );
        if (ok) {
          log.info('FEL invoice updated successfully', {
            invoiceId: invoice.id,
          });
          toast.success('Factura FEL actualizada correctamente');
          const cacheKey = createCacheKey('felInvoices', { companyId });
          queryCache.clear(cacheKey);
          return true;
        }

        log.error('FEL invoice update failed in Firestore', {
          invoiceId: invoice.id,
        });
        toast.error('Error al actualizar la factura FEL');
        return false;
      } catch (err) {
        notifySyncEnd();
        log.error('FEL invoice update error', err as Error, {
          invoiceId: invoice.id,
        });
        toast.error('Error inesperado al actualizar la factura FEL');
        return false;
      }
    },
    [companyId, currentUserId]
  );

  const deleteInvoice = useCallback(
    async (invoiceId: string) => {
      if (!companyId || !currentUserId) {
        log.warn('Invoice deletion attempted without auth');
        toast.error('Usuario no autenticado');
        return false;
      }

      try {
        log.info('Deleting FEL invoice', { invoiceId });
        const ok = await deleteFelInvoiceFromFirestore(invoiceId);
        if (ok) {
          log.info('FEL invoice deleted successfully', { invoiceId });
          toast.success('Factura FEL eliminada correctamente');
          const cacheKey = createCacheKey('felInvoices', { companyId });
          queryCache.clear(cacheKey);
          return true;
        }

        log.error('FEL invoice deletion failed', { invoiceId });
        toast.error('Error al eliminar la factura FEL');
        return false;
      } catch (err) {
        notifySyncEnd();
        log.error('FEL invoice deletion error', err as Error, {
          invoiceId,
        });
        toast.error('Error inesperado al eliminar la factura FEL');
        return false;
      }
    },
    [companyId, currentUserId]
  );

  return {
    invoices,
    loading,
    addInvoice,
    updateInvoice,
    deleteInvoice,
  };
}
