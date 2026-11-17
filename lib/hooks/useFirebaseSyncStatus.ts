'use client';

import { useState, useEffect } from 'react';
import { enableNetwork, waitForPendingWrites } from 'firebase/firestore';

export type SyncStatus = 'online' | 'syncing' | 'offline';

export interface SyncLogEntry {
  id: string;
  operation: string;
  path: string;
  timestamp: string;
  status: 'completado' | 'sincronizando' | 'pendiente' | 'error';
  details?: string;
}

const INITIAL_SYNC_LOGS: SyncLogEntry[] = [];

export function settleSyncLog(
  entries: SyncLogEntry[],
  succeeded: boolean
): SyncLogEntry[] {
  const index = entries.findIndex((entry) => entry.status === 'sincronizando');
  if (index < 0) return entries;

  const next = [...entries];
  next[index] = succeeded
    ? {
        ...next[index],
        status: 'completado',
        details: 'Operación confirmada por Firestore.',
      }
    : {
        ...next[index],
        status: 'error',
        details: 'La operación no se confirmó correctamente. No se registró como sincronización exitosa.',
      };
  return next;
}

export function useFirebaseSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>('online');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>(INITIAL_SYNC_LOGS);

  const syncPendingWrites = async (logId?: string) => {
    if (typeof navigator === 'undefined' || !navigator.onLine) {
      setStatus('offline');
      return false;
    }

    setStatus('syncing');
    try {
      // Importación diferida para evitar el ciclo de dependencias:
      // firebaseService emite los eventos que consume este hook.
      const { getDbOrThrow } = await import('../firebaseService');
      const firestore = getDbOrThrow();
      await enableNetwork(firestore);
      await waitForPendingWrites(firestore);

      setStatus('online');
      setLastSyncedAt(new Date());
      setSyncLogs((prev) =>
        prev.map((entry) =>
          logId && entry.id === logId
            ? { ...entry, status: 'completado', details: 'Firestore confirmó las escrituras pendientes.' }
            : entry
        )
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      setStatus(navigator.onLine ? 'online' : 'offline');
      setSyncLogs((prev) =>
        prev.map((entry) =>
          logId && entry.id === logId
            ? { ...entry, status: 'error', details: `No se pudo confirmar la sincronización: ${message}` }
            : entry
        )
      );
      return false;
    }
  };

  useEffect(() => {
    // Initial online check
    if (typeof window !== 'undefined') {
      setStatus(navigator.onLine ? 'online' : 'offline');
    }

    const handleOnline = () => {
      setStatus('syncing');
      const newLog: SyncLogEntry = {
        id: `log-${Date.now()}`,
        operation: 'Conexión Restablecida',
        path: 'firebase/network',
        timestamp: new Date().toLocaleTimeString('es-GT', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        status: 'sincronizando',
        details: 'Reconectando con la base de datos Firestore…',
      };
      setSyncLogs((prev) => [newLog, ...prev]);

      void syncPendingWrites(newLog.id);
    };

    const handleOffline = () => {
      setStatus('offline');
      const newLog: SyncLogEntry = {
        id: `log-${Date.now()}`,
        operation: 'Modo Offline Activado',
        path: 'firebase/network',
        timestamp: new Date().toLocaleTimeString('es-GT', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        status: 'pendiente',
        details: 'Las operaciones compatibles se conservan localmente; otras requieren conexión. Se reintentarán al recuperar Internet.',
      };
      setSyncLogs((prev) => [newLog, ...prev]);
    };

    const handleSyncStart = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail || {};
      if (navigator.onLine) {
        setStatus('syncing');
        const newLog: SyncLogEntry = {
          id: `log-${Date.now()}`,
          operation: detail.operation || 'Escritura / Consulta Firestore',
          path: detail.path || 'firestore/db',
          timestamp: new Date().toLocaleTimeString('es-GT', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          status: 'sincronizando',
          details: detail.details || 'Enviando petición a la base de datos…',
        };
        setSyncLogs((prev) => [newLog, ...prev.slice(0, 19)]);
      }
    };

    const handleSyncEnd = (event: Event) => {
      const succeeded = (event as CustomEvent<{ success?: boolean }>).detail?.success === true;
      setStatus(navigator.onLine ? 'online' : 'offline');

      setSyncLogs((prev) => settleSyncLog(prev, succeeded));

      // An end/error event alone is not evidence of a successful sync.
      if (succeeded) setLastSyncedAt(new Date());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('firebase-sync-start', handleSyncStart);
    window.addEventListener('firebase-sync-end', handleSyncEnd);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('firebase-sync-start', handleSyncStart);
      window.removeEventListener('firebase-sync-end', handleSyncEnd);
    };
  }, []);

  const clearSyncLogs = () => {
    setSyncLogs([]);
  };

  const forceResync = async () => {
    const logId = `log-${Date.now()}`;
    const entry: SyncLogEntry = {
      id: logId,
      operation: 'Reintento de escrituras pendientes',
      path: 'firestore/pending-writes',
      timestamp: new Date().toLocaleTimeString('es-GT'),
      status: 'sincronizando',
      details: 'Restableciendo la conexión y esperando confirmación de Firestore…',
    };
    setSyncLogs((prev) => [entry, ...prev.slice(0, 19)]);
    await syncPendingWrites(logId);
  };

  return { status, lastSyncedAt, syncLogs, clearSyncLogs, forceResync };
}

export function notifySyncStart(details?: { operation?: string; path?: string; details?: string }) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('firebase-sync-start', { detail: details }));
  }
}

export function notifySyncEnd(success = false) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('firebase-sync-end', { detail: { success } })
    );
  }
}
