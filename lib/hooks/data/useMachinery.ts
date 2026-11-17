'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Machinery, MachineryLog } from '@/lib/types';
import {
  subscribeMachinery,
  saveMachineryToFirestore,
  updateMachineryStatusInFirestore,
  updateMachineryInFirestore,
  subscribeMachineryLogs,
  recordMachineryUse,
  deleteMachineryFromFirestore,
} from '@/lib/firebaseService';
import { validateMachinery } from '@/lib/validation/entity.schemas';
import { canDeleteMachinery, MACHINERY_DELETION_BLOCKED_MESSAGE } from '@/lib/domain/machinery';
import { toast } from 'react-hot-toast';
import { createLogger } from '@/lib/utils/logger';
import { queryCache, createCacheKey } from '@/lib/utils/cacheManager';

const log = createLogger('useMachinery');

export interface UseMachineryOptions {
  companyId?: string;
  currentUserId?: string;
}

export interface UseMachineryReturn {
  machinery: Machinery[];
  machineryLogs: MachineryLog[];
  loading: boolean;
  addMachinery: (item: Machinery) => Promise<boolean>;
  addMachineryLog: (log_: MachineryLog) => Promise<boolean>;
  setMachineryStatus: (machineryId: string, status: Machinery['status']) => Promise<boolean>;
  updateMachinery: (machineryId: string, data: Partial<Machinery>) => Promise<boolean>;
  deleteMachinery: (machineryId: string) => Promise<boolean>;
}

export function useMachinery({
  companyId,
  currentUserId,
}: UseMachineryOptions): UseMachineryReturn {
  const [machinery, setMachinery] = useState<Machinery[]>([]);
  const [machineryLogs, setMachineryLogs] = useState<MachineryLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId || !currentUserId) {
      log.debug('Missing auth context, clearing machinery');
      setMachinery([]);
      setMachineryLogs([]);
      setLoading(false);
      return;
    }

    log.info('Starting machinery subscription', { companyId });
    setMachinery([]);
    setMachineryLogs([]);
    setLoading(true);

    const unsubMachinery = subscribeMachinery(companyId, (data) => {
      log.debug('Machinery updated', { count: data.length });
      const cacheKey = createCacheKey('machinery', { companyId });
      queryCache.set(cacheKey, data, 5 * 60 * 1000);
      setMachinery(data);
    });

    const unsubMachineryLogs = subscribeMachineryLogs(companyId, (data) => {
      log.debug('Machinery logs updated', { count: data.length });
      setMachineryLogs(data);
      setLoading(false);
    });

    return () => {
      log.info('Unsubscribing from machinery');
      unsubMachinery();
      unsubMachineryLogs();
    };
  }, [companyId, currentUserId]);

  const addMachinery = useCallback(
    async (item: Machinery) => {
      if (!companyId || !currentUserId) {
        log.warn('Machinery creation attempted without auth');
        toast.error('Inicia sesión en una empresa para registrar maquinaria.');
        return false;
      }

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
    async (log_: MachineryLog) => {
      if (!companyId || !currentUserId) {
        log.warn('Machinery log creation attempted without auth');
        toast.error('Inicia sesión en una empresa para registrar horas de maquinaria.');
        return false;
      }

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
    async (machineryId: string, status: Machinery['status']) => {
      if (!companyId || !currentUserId) {
        log.warn('Machinery status update attempted without auth');
        toast.error('Inicia sesión en una empresa para actualizar maquinaria.');
        return false;
      }

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

        log.info('Machinery status updated successfully', { machineryId, newStatus: status });
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

  const updateMachinery = useCallback(
    async (machineryId: string, data: Partial<Machinery>) => {
      if (!companyId || !currentUserId) {
        toast.error('Inicia sesión en una empresa para actualizar maquinaria.');
        return false;
      }
      const equipment = machinery.find((item) => item.id === machineryId);
      if (!equipment) {
        toast.error('No se encontró la maquinaria seleccionada.');
        return false;
      }
      try {
        log.info('Updating machinery', { machineryId, fields: Object.keys(data) });
        const saved = await updateMachineryInFirestore(equipment, data, companyId, currentUserId);
        if (!saved) {
          toast.error('No se pudo actualizar la maquinaria.');
          return false;
        }
        log.info('Machinery updated successfully', { machineryId });
        const cacheKey = createCacheKey('machinery', { companyId });
        queryCache.clear(cacheKey);
        return true;
      } catch (err) {
        log.error('Machinery update error', err as Error, { machineryId });
        toast.error('Error al actualizar la maquinaria.');
        return false;
      }
    },
    [companyId, currentUserId, machinery]
  );

  const deleteMachinery = useCallback(
    async (machineryId: string) => {
      if (!companyId || !currentUserId) {
        toast.error('Inicia sesión en una empresa para eliminar maquinaria.');
        return false;
      }
      if (!canDeleteMachinery(machineryId, machineryLogs)) {
        toast.error(MACHINERY_DELETION_BLOCKED_MESSAGE);
        return false;
      }
      try {
        const deleted = await deleteMachineryFromFirestore(machineryId, companyId);
        if (deleted) toast.success('Maquinaria eliminada correctamente.');
        else toast.error('No se pudo eliminar la maquinaria.');
        return deleted;
      } catch (err) {
        log.error('Machinery deletion blocked', err as Error, { machineryId });
        toast.error(err instanceof Error ? err.message : 'No se pudo eliminar la maquinaria.');
        return false;
      }
    },
    [companyId, currentUserId, machineryLogs]
  );

  return {
    machinery,
    machineryLogs,
    loading,
    addMachinery,
    addMachineryLog,
    setMachineryStatus,
    updateMachinery,
    deleteMachinery,
  };
}
