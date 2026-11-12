'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Employee, EmployeeDirectoryEntry, CompanyRole } from '@/lib/types';
import {
  subscribeEmployees,
  subscribeEmployeeDirectory,
  saveEmployeeToFirestore,
  deleteEmployeeFromFirestore,
} from '@/lib/firebaseService';
import { validateEmployee } from '@/lib/validation/entity.schemas';
import { canReadFullPersonnel, canReadEmployeeDirectory } from '@/lib/permissions';
import { toast } from 'react-hot-toast';
import { notifySyncEnd } from '../useFirebaseSyncStatus';
import { createLogger } from '@/lib/utils/logger';
import { queryCache, createCacheKey } from '@/lib/utils/cacheManager';

const log = createLogger('useEmployees');

export interface UseEmployeesOptions {
  companyId?: string;
  currentUserId?: string;
  role?: CompanyRole;
}

export interface UseEmployeesReturn {
  employees: Array<Employee | EmployeeDirectoryEntry>;
  fullEmployees: Employee[];
  loading: boolean;
  addEmployee: (employee: Employee) => Promise<boolean>;
  deleteEmployee: (employeeId: string) => Promise<boolean>;
}

export function useEmployees({ companyId, currentUserId, role }: UseEmployeesOptions): UseEmployeesReturn {
  const [employees, setEmployees] = useState<Array<Employee | EmployeeDirectoryEntry>>([]);
  const [loading, setLoading] = useState(false);
  const hasInitializedRef = useRef(false);
  const lastCompanyIdRef = useRef<string | null>(null);

  const fullEmployees = useMemo(
    () => employees.filter((employee): employee is Employee => 'dailyRateGTQ' in employee),
    [employees]
  );

  useEffect(() => {
    if (!companyId || !currentUserId || !role) {
      if (!hasInitializedRef.current) return;
      log.debug('Missing auth context, clearing employees');
      setEmployees([]);
      setLoading(false);
      hasInitializedRef.current = false;
      lastCompanyIdRef.current = null;
      return;
    }

    if (hasInitializedRef.current && lastCompanyIdRef.current === companyId) return;

    hasInitializedRef.current = true;
    lastCompanyIdRef.current = companyId;

    log.info('Starting employees subscription', { companyId, role });
    setLoading(true);

    let unsubEmployees: () => void;

    if (canReadFullPersonnel(role)) {
      unsubEmployees = subscribeEmployees(companyId, (data) => {
        log.debug('Employees updated', { count: data.length });
        const cacheKey = createCacheKey('employees', { companyId });
        queryCache.set(cacheKey, data, 5 * 60 * 1000);
        setEmployees(data);
        setLoading(false);
      });
    } else if (canReadEmployeeDirectory(role)) {
      unsubEmployees = subscribeEmployeeDirectory(companyId, (data) => {
        log.debug('Employee directory updated', { count: data.length });
        const cacheKey = createCacheKey('employees', { companyId });
        queryCache.set(cacheKey, data, 5 * 60 * 1000);
        setEmployees(data);
        setLoading(false);
      });
    } else {
      setEmployees([]);
      setLoading(false);
      return;
    }

    return () => {
      log.info('Unsubscribing from employees');
      unsubEmployees();
    };
  }, [companyId, currentUserId, role]);

  const addEmployee = useCallback(
    async (employee: Employee) => {
      if (!companyId || !currentUserId) {
        log.warn('Employee creation attempted without auth');
        toast.error('Inicia sesión para guardar empleados.');
        return false;
      }

      try {
        log.info('Creating employee', { employeeName: employee.name, role: employee.role });
        const saved = await saveEmployeeToFirestore(employee, companyId, currentUserId);
        if (!saved) {
          log.error('Employee creation failed', { employeeName: employee.name });
          toast.error('No se pudo guardar el empleado.');
          return false;
        }

        log.info('Employee created successfully', { employeeId: employee.id });
        toast.success('Empleado registrado correctamente.');
        const cacheKey = createCacheKey('employees', { companyId });
        queryCache.clear(cacheKey);
        return true;
      } catch (err) {
        log.error('Employee creation error', err as Error, { companyId });
        toast.error('Error al guardar el empleado.');
        return false;
      }
    },
    [companyId, currentUserId]
  );

  const deleteEmployee = useCallback(
    async (employeeId: string) => {
      if (!companyId || !currentUserId) {
        toast.error('Inicia sesión en una empresa para eliminar empleados.');
        return false;
      }

      const deleted = await deleteEmployeeFromFirestore(employeeId, companyId);
      if (deleted) toast.success('Empleado eliminado correctamente.');
      else toast.error('No se pudo eliminar el empleado.');
      return deleted;
    },
    [companyId, currentUserId]
  );

  return {
    employees,
    fullEmployees,
    loading,
    addEmployee,
    deleteEmployee,
  };
}