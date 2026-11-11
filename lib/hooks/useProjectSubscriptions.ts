'use client';

import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import type {
  CompanyRole,
  Project,
  FieldVisit,
  ExpenseRecord,
  AttendanceRecord,
  Employee,
  EmployeeDirectoryEntry,
  QuoteRecord,
  APUItem,
  Machinery,
  MachineryLog,
  CompanySettings,
} from '@/lib/types';
import {
  subscribeProjects,
  subscribeFieldVisits,
  subscribeExpenses,
  subscribeAttendance,
  subscribeEmployees,
  subscribeEmployeeDirectory,
  subscribeCompanySettings,
  subscribeQuotes,
  subscribeAPUItems,
  subscribeMachinery,
  subscribeMachineryLogs,
} from '@/lib/firebaseService';
import {
  canReadAttendance,
  canReadEmployeeDirectory,
  canReadFullPersonnel,
} from '@/lib/permissions';
import { createLogger } from '@/lib/utils/logger';
import { createCacheKey, queryCache } from '@/lib/utils/cacheManager';

const log = createLogger('useProjectSubscriptions');

interface UseProjectSubscriptionsParams {
  companyId: string;
  currentUserId: string;
  role: CompanyRole | undefined;
  setProjects: Dispatch<SetStateAction<Project[]>>;
  setFieldVisits: Dispatch<SetStateAction<FieldVisit[]>>;
  setExpenses: Dispatch<SetStateAction<ExpenseRecord[]>>;
  setAttendance: Dispatch<SetStateAction<AttendanceRecord[]>>;
  setEmployees: Dispatch<SetStateAction<Array<Employee | EmployeeDirectoryEntry>>>;
  setQuotes: Dispatch<SetStateAction<QuoteRecord[]>>;
  setApuItems: Dispatch<SetStateAction<APUItem[]>>;
  setApuItemsLoading: Dispatch<SetStateAction<boolean>>;
  setMachinery: Dispatch<SetStateAction<Machinery[]>>;
  setMachineryLogs: Dispatch<SetStateAction<MachineryLog[]>>;
  setCompany: Dispatch<SetStateAction<CompanySettings | null>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
}

export function useProjectSubscriptions({
  companyId,
  currentUserId,
  role,
  setProjects,
  setFieldVisits,
  setExpenses,
  setAttendance,
  setEmployees,
  setQuotes,
  setApuItems,
  setApuItemsLoading,
  setMachinery,
  setMachineryLogs,
  setCompany,
  setLoading,
}: UseProjectSubscriptionsParams) {
  const hasInitializedRef = useRef(false);
  const lastCompanyIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!companyId || !currentUserId || !role) {
      if (!hasInitializedRef.current) {
        return;
      }
      log.debug('Missing auth context, clearing data');
      setProjects([]);
      setFieldVisits([]);
      setExpenses([]);
      setAttendance([]);
      setEmployees([]);
      setQuotes([]);
      setApuItems([]);
      setApuItemsLoading(false);
      setMachinery([]);
      setMachineryLogs([]);
      setCompany(null);
      setLoading(false);
      hasInitializedRef.current = false;
      lastCompanyIdRef.current = null;
      return;
    }

    if (hasInitializedRef.current && lastCompanyIdRef.current === companyId) {
      return;
    }

    hasInitializedRef.current = true;
    lastCompanyIdRef.current = companyId;

    log.info('Starting data subscriptions', { companyId, role });

    setLoading(true);
    setApuItemsLoading(true);
    const unsubProjects = subscribeProjects(companyId, (nextProjects) => {
      log.debug('Projects updated', { count: nextProjects.length });
      const cacheKey = createCacheKey('projects', { companyId });
      queryCache.set(cacheKey, nextProjects, 5 * 60 * 1000);
      setProjects(nextProjects);
      setLoading(false);
    });

    const unsubFieldVisits = subscribeFieldVisits(companyId, (data) => {
      log.debug('Field visits updated', { count: data.length });
      const cacheKey = createCacheKey('fieldVisits', { companyId });
      queryCache.set(cacheKey, data, 5 * 60 * 1000);
      setFieldVisits(data);
    });

    const unsubExpenses = subscribeExpenses(companyId, (data) => {
      log.debug('Expenses updated', { count: data.length });
      const cacheKey = createCacheKey('expenses', { companyId });
      queryCache.set(cacheKey, data, 5 * 60 * 1000);
      setExpenses(data);
    });

    const unsubAttendance = canReadAttendance(role)
      ? subscribeAttendance(companyId, (data) => {
          log.debug('Attendance updated', { count: data.length });
          const cacheKey = createCacheKey('attendance', { companyId });
          queryCache.set(cacheKey, data, 5 * 60 * 1000);
          setAttendance(data);
        })
      : () => setAttendance([]);

    const unsubEmployees = canReadFullPersonnel(role)
      ? subscribeEmployees(companyId, (data) => {
          log.debug('Employees updated', { count: data.length });
          const cacheKey = createCacheKey('employees', { companyId });
          queryCache.set(cacheKey, data, 5 * 60 * 1000);
          setEmployees(data);
        })
      : canReadEmployeeDirectory(role)
        ? subscribeEmployeeDirectory(companyId, (data) => {
            log.debug('Employee directory updated', { count: data.length });
            const cacheKey = createCacheKey('employees', { companyId });
            queryCache.set(cacheKey, data, 5 * 60 * 1000);
            setEmployees(data);
          })
        : () => setEmployees([]);

    const unsubCompany = subscribeCompanySettings(companyId, (data) => {
      log.debug('Company settings updated', { companyId });
      const cacheKey = createCacheKey('companySettings', { companyId });
      queryCache.set(cacheKey, data, 10 * 60 * 1000);
      setCompany(data ?? null);
    });

    const unsubQuotes = subscribeQuotes(companyId, (data) => {
      log.debug('Quotes updated', { count: data.length });
      const cacheKey = createCacheKey('quotes', { companyId });
      queryCache.set(cacheKey, data, 5 * 60 * 1000);
      setQuotes(data);
    });

    const unsubAPUItems = subscribeAPUItems(companyId, (nextItems) => {
      log.debug('APU items updated', { count: nextItems.length });
      const cacheKey = createCacheKey('apuItems', { companyId });
      queryCache.set(cacheKey, nextItems, 5 * 60 * 1000);
      setApuItems(nextItems);
      setApuItemsLoading(false);
    });

    const unsubMachinery = subscribeMachinery(companyId, (data) => {
      log.debug('Machinery updated', { count: data.length });
      const cacheKey = createCacheKey('machinery', { companyId });
      queryCache.set(cacheKey, data, 5 * 60 * 1000);
      setMachinery(data);
    });

    const unsubMachineryLogs = subscribeMachineryLogs(companyId, (data) => {
      log.debug('Machinery logs updated', { count: data.length });
      setMachineryLogs(data);
    });
    return () => {
      log.info('Unsubscribing from data streams');
      unsubProjects();
      unsubFieldVisits();
      unsubExpenses();
      unsubAttendance();
      unsubEmployees();
      unsubCompany();
      unsubQuotes();
      unsubAPUItems();
      unsubMachinery();
      unsubMachineryLogs();
    };
  }, [
    companyId,
    currentUserId,
    role,
    setProjects,
    setFieldVisits,
    setExpenses,
    setAttendance,
    setEmployees,
    setQuotes,
    setApuItems,
    setApuItemsLoading,
    setMachinery,
    setMachineryLogs,
    setCompany,
    setLoading,
  ]);
}

