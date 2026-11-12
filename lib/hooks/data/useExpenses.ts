'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ExpenseRecord } from '@/lib/types';
import {
  subscribeExpenses,
  saveExpenseToFirestore,
  updateExpenseToFirestore,
  deleteExpenseFromFirestore,
} from '@/lib/firebaseService';
import { validateExpenseRecord } from '@/lib/validation/entity.schemas';
import { toast } from 'react-hot-toast';
import { notifySyncEnd } from '../useFirebaseSyncStatus';
import { createLogger } from '@/lib/utils/logger';
import { queryCache, createCacheKey } from '@/lib/utils/cacheManager';

const log = createLogger('useExpenses');

export interface UseExpensesOptions {
  companyId?: string;
  currentUserId?: string;
  projectIds?: string[];
}

export interface UseExpensesReturn {
  expenses: ExpenseRecord[];
  allExpenses: ExpenseRecord[];
  loading: boolean;
  projectExpenses: Map<string, ExpenseRecord[]>;
  addExpense: (expense: ExpenseRecord) => Promise<boolean>;
  updateExpense: (expense: ExpenseRecord) => Promise<boolean>;
  deleteExpense: (expenseId: string) => Promise<boolean>;
}

export function useExpenses({ companyId, currentUserId, projectIds = [] }: UseExpensesOptions): UseExpensesReturn {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [allExpenses, setAllExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const hasInitializedRef = useRef(false);
  const lastCompanyIdRef = useRef<string | null>(null);

  const projectExpenses = useMemo(() => {
    const map = new Map<string, ExpenseRecord[]>();
    for (const expense of allExpenses) {
      if (!map.has(expense.projectId)) {
        map.set(expense.projectId, []);
      }
      map.get(expense.projectId)!.push(expense);
    }
    return map;
  }, [allExpenses]);

  // Filter expenses by projectIds - use useMemo instead of useEffect to avoid cascading updates
  const filteredExpenses = useMemo(() => {
    if (projectIds.length === 0) {
      return allExpenses;
    }
    const projectIdSet = new Set(projectIds);
    return allExpenses.filter((e) => projectIdSet.has(e.projectId));
  }, [allExpenses, projectIds]);

  useEffect(() => {
    if (!companyId || !currentUserId) {
      if (!hasInitializedRef.current) return;
      log.debug('Missing auth context, clearing expenses');
      setAllExpenses([]);
      setLoading(false);
      hasInitializedRef.current = false;
      lastCompanyIdRef.current = null;
      return;
    }

    if (hasInitializedRef.current && lastCompanyIdRef.current === companyId) return;

    hasInitializedRef.current = true;
    lastCompanyIdRef.current = companyId;

    log.info('Starting expenses subscription', { companyId });
    setLoading(true);

    const unsubExpenses = subscribeExpenses(companyId, (data) => {
      log.debug('Expenses updated', { count: data.length });
      const cacheKey = createCacheKey('expenses', { companyId });
      queryCache.set(cacheKey, data, 5 * 60 * 1000);
      setAllExpenses(data);
      setLoading(false);
    });

    return () => {
      log.info('Unsubscribing from expenses');
      unsubExpenses();
    };
  }, [companyId, currentUserId]);

  const addExpense = useCallback(
    async (expense: ExpenseRecord) => {
      if (!companyId || !currentUserId) {
        log.warn('Expense creation attempted without auth');
        toast.error('Usuario no autenticado');
        return false;
      }

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
        toast.error(detail ? `No se pudo guardar el gasto: ${detail}` : 'Error inesperado al guardar el gasto');
        return false;
      }
    },
    [companyId, currentUserId]
  );

  const updateExpense = useCallback(
    async (expense: ExpenseRecord) => {
      if (!companyId || !currentUserId) {
        log.warn('Expense update attempted without auth');
        toast.error('Usuario no autenticado');
        return false;
      }

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
      if (!companyId || !currentUserId) {
        log.warn('Expense deletion attempted without auth');
        toast.error('Usuario no autenticado');
        return false;
      }

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
    expenses: filteredExpenses,
    allExpenses,
    loading,
    projectExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
  };
}