'use client';

import { useCallback } from 'react';
import type { Machinery, MachineryLog } from '@/lib/types';
import {
  saveMachineryToFirestore,
  updateMachineryStatusInFirestore,
  subscribeMachineryLogs,
  recordMachineryUse,
  deleteMachineryFromFirestore,
} from '@/lib/firebaseService';
import { createLogger } from '@/lib/utils/logger';
import { createCacheKey, queryCache } from '@/lib/utils/cacheManager';
import { notifySyncEnd } from './useFirebaseSyncStatus';
import { toast } from 'react-hot-toast';

const log = createLogger('useMachineryManagement');

interface UseMachineryManagementParams {
  companyId: string;
  currentUserId: string;
  machinery: Machinery[];
}

export function useMachineryManagement({
  companyId,
  currentUserId,
  machinery,
}: UseMachineryManagementParams) {
  const addMachinery = useCallback(
    async (_item: Machinery) => {
      toast.error('Inicia sesión en una empresa para registrar maquinaria.');
      return false;
    },
    []
  );

  const addMachineryWithAuth = useCallback(
    async (item: Machinery) => {
      try {
        log.info('Creating machinery', {
          machineryName: item.name,
          hourlyRate: item.hourlyRateGTQ,
        });
        const saved = await saveMachineryToFirestore(item, companyId, currentUserId);
        if (!saved) {
          log.error('Machinery creation failed', { machineryId: item.id });
          toast.error('No se pudo guardar la maquinaria.');
          return false;
        }

        log.info('Machinery created successfully', { machineryId: item.id });
        const cacheKey = createCacheKey('machinery', { companyId });
        queryCache.clear(cacheKey);
        return true;
      } catch (err) {
        log.error('Machinery creation error', err as Error, { companyId });
        toast.error('Error al guardar la maquinaria.');
        return false;
      }
    },
    [companyId, currentUserId]
  );

  const addMachineryLog = useCallback(
    async (_log_: MachineryLog) => {
      toast.error('Inicia sesión en una empresa para registrar horas de maquinaria.');
      return false;
    },
    []
  );

  const addMachineryLogWithAuth = useCallback(
    async (log_: MachineryLog) => {
      const equipment = machinery.find((item) => item.id === log_.machineryId);
      if (!equipment) {
        log.warn('Machinery not found for log', { machineryId: log_.machineryId });
        toast.error('No se encontró la maquinaria seleccionada.');
        return false;
      }

      try {
        log.info('Creating machinery log', {
          machineryId: log_.machineryId,
          hoursWorked: log_.hoursWorked,
        });
        const saved = await recordMachineryUse(log_, equipment, companyId, currentUserId);
        if (!saved) {
          log.error('Machinery log creation failed', { logId: log_.id });
          toast.error('No se pudo registrar el uso y costo de maquinaria.');
          return false;
        }

        log.info('Machinery log created successfully', { logId: log_.id });
        return true;
      } catch (err) {
        log.error('Machinery log creation error', err as Error, { companyId });
        toast.error('Error al registrar el uso de maquinaria.');
        return false;
      }
    },
    [companyId, currentUserId, machinery]
  );
  const setMachineryStatus = useCallback(
    async (_machineryId: string, _status: Machinery['status']) => {
      toast.error('Inicia sesión en una empresa para actualizar maquinaria.');
      return false;
    },
    []
  );

  const setMachineryStatusWithAuth = useCallback(
    async (machineryId: string, status: Machinery['status']) => {
      const equipment = machinery.find((item) => item.id === machineryId);
      if (!equipment) {
        log.warn('Machinery not found for status update', { machineryId });
        toast.error('No se encontró la maquinaria seleccionada.');
        return false;
      }

      try {
        log.info('Updating machinery status', { machineryId, newStatus: status });
        const saved = await updateMachineryStatusInFirestore(
          equipment,
          status,
          companyId,
          currentUserId
        );
        if (!saved) {
          log.error('Machinery status update failed', { machineryId });
          toast.error('No se pudo actualizar el estado de la maquinaria.');
          return false;
        }

        log.info('Machinery status updated successfully', {
          machineryId,
          newStatus: status,
        });
        const cacheKey = createCacheKey('machinery', { companyId });
        queryCache.clear(cacheKey);
        return true;
      } catch (err) {
        log.error('Machinery status update error', err as Error, { machineryId });
        toast.error('Error al actualizar la maquinaria.');
        return false;
      }
    },
    [companyId, currentUserId, machinery]
  );

  const deleteMachinery = useCallback(
    async (_machineryId: string) => {
      toast.error('Inicia sesión en una empresa para eliminar maquinaria.');
      return false;
    },
    []
  );

  const deleteMachineryWithAuth = useCallback(
    async (machineryId: string) => {
      const deleted = await deleteMachineryFromFirestore(machineryId, companyId);
      if (deleted) toast.success('Maquinaria eliminada correctamente.');
      else toast.error('No se pudo eliminar la maquinaria.');
      return deleted;
    },
    [companyId, currentUserId]
  );

  const subscribeMachineryLogsHook = useCallback(
    (callback: (logs: any[]) => void) => {
      return subscribeMachineryLogs(companyId, callback as any);
    },
    [companyId]
  );

  return {
    addMachinery: companyId && currentUserId ? addMachineryWithAuth : addMachinery,
    addMachineryLog: companyId && currentUserId ? addMachineryLogWithAuth : addMachineryLog,
    setMachineryStatus:
      companyId && currentUserId ? setMachineryStatusWithAuth : setMachineryStatus,
    deleteMachinery: companyId && currentUserId ? deleteMachineryWithAuth : deleteMachinery,
    subscribeMachineryLogs: subscribeMachineryLogsHook,
  };
}
