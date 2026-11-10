'use client';

/**
 * Hook de gestión de Gastos (Expenses).
 * Encapsula crear, actualizar y eliminar gastos.
 */
import { useCallback } from 'react';
import type { ExpenseRecord } from '@/lib/types';
import {
  saveExpenseToFirestore,
  updateExpenseToFirestore,
  deleteExpenseFromFirestore,
} from '@/lib/firebaseService';
import { createLogger } from '@/lib/utils/logger';
import { createCacheKey, queryCache } from '@/lib/utils/cacheManager';
import { notifySyncEnd } from './useFirebaseSyncStatus';
import { toast } from 'react-hot-toast';

const log = createLogger('useExpenseManagement');

interface UseExpenseManagementParams {
  companyId: string;
  currentUserId: string;
}

export function useExpenseManagement({ companyId, currentUserId }: UseExpenseManagementParams) {
  const addExpense = useCallback(
    async (expense: ExpenseRecord) => {
      toast.error('Usuario no autenticado');
      return false;
    },
    []
  );

  const addExpenseWithAuth = useCallback(
    async (expense: ExpenseRecord) => {
      try {
        log.info('Creating expense', { projectId: expense.projectId, amount: expense.amount });
        const ok = await saveExpenseToFirestore(expense, companyId, currentUserId);
        if (ok) {
          log.info('Expense created successfully', { expenseId: expense.id });
          toast.success('Gasto registrado correctamente');
          const cacheKey = createCacheKey('expenses', { companyId });
          queryCache.clear(cacheKey);
          return true;
        }

        log.error('Expense creation failed in Firestore', { expenseId: expense.id });
        toast.error('Error al guardar el gasto');
        return false;
      } catch (err) {
        notifySyncEnd();
        log.error('Expense creation error', err as Error, { companyId });
        const detail = err instanceof Error ? err.message : '';
        toast.error(
          detail ? `No se pudo guardar el gasto: ${detail}` : 'Error inesperado al guardar el gasto'
        );
        return false;
      }
    },
    [companyId, currentUserId]
  );

  const updateExpense = useCallback(
    async (expense: ExpenseRecord) => {
      toast.error('Usuario no autenticado');
      return false;
    },
    []
  );

  const updateExpenseWithAuth = useCallback(
    async (expense: ExpenseRecord) => {
      try {
        log.info('Updating expense', { expenseId: expense.id });
        const ok = await updateExpenseToFirestore(expense, companyId, currentUserId);
        if (ok) {
          log.info('Expense updated successfully', { expenseId: expense.id });
          toast.success('Gasto actualizado correctamente');
          const cacheKey = createCacheKey('expenses', { companyId });
          queryCache.clear(cacheKey);
          return true;
        }

        log.error('Expense update failed in Firestore', { expenseId: expense.id });
        toast.error('Error al actualizar el gasto');
        return false;
      } catch (err) {
        notifySyncEnd();
        log.error('Expense update error', err as Error, { expenseId: expense.id });
        toast.error('Error inesperado al actualizar el gasto');
        return false;
      }
    },
    [companyId, currentUserId]
  );

  const deleteExpense = useCallback(
    async (expenseId: string) => {
      toast.error('Usuario no autenticado');
      return false;
    },
    []
  );

  const deleteExpenseWithAuth = useCallback(
    async (expenseId: string) => {
      try {
        log.info('Deleting expense', { expenseId });
        const ok = await deleteExpenseFromFirestore(expenseId);
        if (ok) {
          log.info('Expense deleted successfully', { expenseId });
          toast.success('Gasto eliminado correctamente');
          const cacheKey = createCacheKey('expenses', { companyId });
          queryCache.clear(cacheKey);
          return true;
        }

        log.error('Expense deletion failed', { expenseId });
        toast.error('Error al eliminar el gasto');
        return false;
      } catch (err) {
        notifySyncEnd();
        log.error('Expense deletion error', err as Error, { expenseId });
        toast.error('Error inesperado al eliminar el gasto');
        return false;
      }
    },
    [companyId, currentUserId]
  );

  return {
    addExpense: companyId && currentUserId ? addExpenseWithAuth : addExpense,
    updateExpense: companyId && currentUserId ? updateExpenseWithAuth : updateExpense,
    deleteExpense: companyId && currentUserId ? deleteExpenseWithAuth : deleteExpense,
  };
}
