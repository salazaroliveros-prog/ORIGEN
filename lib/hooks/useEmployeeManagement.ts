'use client';

/**
 * Hook de gestión de Empleados.
 * Encapsula crear y eliminar empleados.
 */
import { useCallback } from 'react';
import type { Employee } from '@/lib/types';
import {
  saveEmployeeToFirestore,
  deleteEmployeeFromFirestore,
} from '@/lib/firebaseService';
import { createLogger } from '@/lib/utils/logger';
import { createCacheKey, queryCache } from '@/lib/utils/cacheManager';
import { toast } from 'react-hot-toast';

const log = createLogger('useEmployeeManagement');

interface UseEmployeeManagementParams {
  companyId: string;
  currentUserId: string;
}

export function useEmployeeManagement({ companyId, currentUserId }: UseEmployeeManagementParams) {
  const addEmployee = useCallback(
    async (employee: Employee) => {
      toast.error('Inicia sesión para guardar empleados.');
      return false;
    },
    []
  );

  const addEmployeeWithAuth = useCallback(
    async (employee: Employee) => {
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
      toast.error('Inicia sesión en una empresa para eliminar empleados.');
      return false;
    },
    []
  );

  const deleteEmployeeWithAuth = useCallback(
    async (employeeId: string) => {
      const deleted = await deleteEmployeeFromFirestore(employeeId, companyId);
      if (deleted) toast.success('Empleado eliminado correctamente.');
      else toast.error('No se pudo eliminar el empleado.');
      return deleted;
    },
    [companyId, currentUserId]
  );

  return {
    addEmployee: companyId && currentUserId ? addEmployeeWithAuth : addEmployee,
    deleteEmployee: companyId && currentUserId ? deleteEmployeeWithAuth : deleteEmployee,
  };
}
