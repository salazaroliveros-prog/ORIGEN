'use client';

/**
 * Hook de gestión de Asistencia.
 * Encapsula registrar y eliminar registros de asistencia.
 */
import { useCallback } from 'react';
import type { AttendanceRecord } from '@/lib/types';
import {
  saveAttendanceToFirestore,
  deleteAttendanceFromFirestore,
} from '@/lib/firebaseService';
import { createLogger } from '@/lib/utils/logger';
import { createCacheKey, queryCache } from '@/lib/utils/cacheManager';
import { notifySyncEnd } from './useFirebaseSyncStatus';
import { toast } from 'react-hot-toast';

const log = createLogger('useAttendanceManagement');

interface UseAttendanceManagementParams {
  companyId: string;
  currentUserId: string;
  attendance: AttendanceRecord[];
}

export function useAttendanceManagement({
  companyId,
  currentUserId,
  attendance,
}: UseAttendanceManagementParams) {
  const addAttendance = useCallback(
    async (record: AttendanceRecord) => {
      toast.error('Usuario no autenticado');
      return false;
    },
    []
  );

  const addAttendanceWithAuth = useCallback(
    async (record: AttendanceRecord) => {
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
        log.error('Attendance creation error', err as Error, { companyId });
        toast.error('Error inesperado al guardar la asistencia');
        return false;
      }
    },
    [companyId, currentUserId]
  );

  const deleteAttendance = useCallback(
    async (attendanceId: string) => {
      toast.error('Inicia sesión para eliminar un registro de asistencia.');
      return false;
    },
    []
  );

  const deleteAttendanceWithAuth = useCallback(
    async (attendanceId: string) => {
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
    addAttendance: companyId && currentUserId ? addAttendanceWithAuth : addAttendance,
    deleteAttendance: companyId && currentUserId ? deleteAttendanceWithAuth : deleteAttendance,
  };
}
