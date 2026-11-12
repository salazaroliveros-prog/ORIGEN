'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AttendanceRecord, CompanyRole } from '@/lib/types';
import {
  subscribeAttendance,
  saveAttendanceToFirestore,
  deleteAttendanceFromFirestore,
} from '@/lib/firebaseService';
import { validateAttendanceRecord } from '@/lib/validation/entity.schemas';
import { canReadAttendance } from '@/lib/permissions';
import { toast } from 'react-hot-toast';
import { notifySyncEnd } from '../useFirebaseSyncStatus';
import { createLogger } from '@/lib/utils/logger';
import { queryCache, createCacheKey } from '@/lib/utils/cacheManager';

const log = createLogger('useAttendance');

export interface UseAttendanceOptions {
  companyId?: string;
  currentUserId?: string;
  role?: CompanyRole;
  projectIds?: string[];
}

export interface UseAttendanceReturn {
  attendance: AttendanceRecord[];
  allAttendance: AttendanceRecord[];
  loading: boolean;
  addAttendance: (record: AttendanceRecord) => Promise<boolean>;
  deleteAttendance: (attendanceId: string) => Promise<boolean>;
}

export function useAttendance({ companyId, currentUserId, role, projectIds = [] }: UseAttendanceOptions): UseAttendanceReturn {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const hasInitializedRef = useRef(false);
  const lastCompanyIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!companyId || !currentUserId || !role) {
      if (!hasInitializedRef.current) return;
      log.debug('Missing auth context, clearing attendance');
      setAllAttendance([]);
      setLoading(false);
      hasInitializedRef.current = false;
      lastCompanyIdRef.current = null;
      return;
    }

    if (!canReadAttendance(role)) {
      setAllAttendance([]);
      return;
    }

    if (hasInitializedRef.current && lastCompanyIdRef.current === companyId) return;

    hasInitializedRef.current = true;
    lastCompanyIdRef.current = companyId;

    log.info('Starting attendance subscription', { companyId, role });
    setLoading(true);

    const unsubAttendance = subscribeAttendance(companyId, (data) => {
      log.debug('Attendance updated', { count: data.length });
      const cacheKey = createCacheKey('attendance', { companyId });
      queryCache.set(cacheKey, data, 5 * 60 * 1000);
      setAllAttendance(data);
      setLoading(false);
    });

    return () => {
      log.info('Unsubscribing from attendance');
      unsubAttendance();
    };
  }, [companyId, currentUserId, role]);

  // Filter attendance by projectIds - use useMemo instead of useEffect to avoid cascading updates
  const filteredAttendance = useMemo(() => {
    if (projectIds.length === 0) {
      return allAttendance;
    }
    const projectIdSet = new Set(projectIds);
    return allAttendance.filter((a) => projectIdSet.has(a.projectId));
  }, [allAttendance, projectIds]);

  const addAttendance = useCallback(
    async (record: AttendanceRecord) => {
      if (!companyId || !currentUserId) {
        log.warn('Attendance creation attempted without auth');
        toast.error('Usuario no autenticado');
        return false;
      }

      try {
        log.info('Recording attendance', {
          projectId: record.projectId,
          employeeId: record.employeeId,
          date: record.date,
        });
        const saved = await saveAttendanceToFirestore(record, companyId, currentUserId);
        if (saved) {
          log.info('Attendance recorded successfully', { attendanceId: record.id });
          toast.success('Asistencia registrada correctamente');
          const cacheKey = createCacheKey('attendance', { companyId });
          queryCache.clear(cacheKey);
          return true;
        }

        log.error('Attendance recording failed', { attendanceId: record.id });
        toast.error('No se pudo guardar la asistencia');
        return false;
      } catch (err) {
        notifySyncEnd();
        log.error('Attendance recording error', err as Error, { companyId });
        toast.error('Error inesperado al guardar la asistencia');
        return false;
      }
    },
    [companyId, currentUserId]
  );

  const deleteAttendance = useCallback(
    async (attendanceId: string) => {
      if (!companyId || !currentUserId) {
        log.warn('Attendance deletion attempted without auth');
        toast.error('Inicia sesión para eliminar un registro de asistencia.');
        return false;
      }

      if (!attendance.some((record) => record.id === attendanceId)) {
        log.warn('Attendance record not found', { attendanceId });
        toast.error('No se encontró el registro de asistencia.');
        return false;
      }

      if (!window.confirm('¿Eliminar este registro de asistencia?')) return false;

      try {
        log.info('Deleting attendance', { attendanceId });
        const deleted = await deleteAttendanceFromFirestore(attendanceId);
        if (deleted) {
          log.info('Attendance deleted successfully', { attendanceId });
          toast.success('Registro de asistencia eliminado.');
          const cacheKey = createCacheKey('attendance', { companyId });
          queryCache.clear(cacheKey);
        } else {
          log.error('Attendance deletion failed', { attendanceId });
          toast.error('No se pudo eliminar el registro de asistencia.');
        }
        return deleted;
      } catch (err) {
        log.error('Attendance deletion error', err as Error, { attendanceId });
        toast.error('Error al eliminar la asistencia.');
        return false;
      }
    },
    [attendance, companyId, currentUserId]
  );

  return {
    attendance: filteredAttendance,
    allAttendance,
    loading,
    addAttendance,
    deleteAttendance,
  };
}