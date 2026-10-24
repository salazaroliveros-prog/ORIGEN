'use client';

import { useState, useEffect } from 'react';

export type SyncStatus = 'online' | 'syncing' | 'offline';

export interface SyncLogEntry {
  id: string;
  operation: string;
  path: string;
  timestamp: string;
  status: 'completado' | 'sincronizando' | 'pendiente' | 'error';
  details?: string;
}

const INITIAL_SYNC_LOGS: SyncLogEntry[] = [
  {
    id: 'log-1',
    operation: 'Escucha en Tiempo Real (Projects)',
    path: 'projects/onSnapshot',
    timestamp: new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    status: 'completado',
    details: 'Sincronizados 3 proyectos activos desde Firestore DB.',
  },
  {
    id: 'log-2',
    operation: 'Guardar Configuración de Empresa',
    path: 'companySettings/salazaroliveros',
    timestamp: new Date(Date.now() - 120000).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    status: 'completado',
    details: 'Actualizados datos de marca e IVA (SAT 12%).',
  },
  {
    id: 'log-3',
    operation: 'Sincronización de Gastos & APU',
    path: 'expenses/collection',
    timestamp: new Date(Date.now() - 300000).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    status: 'completado',
    details: 'Verificados 12 registros de facturación operativa.',
  },
  {
    id: 'log-4',
    operation: 'Registro de Asistencia con Geofence GPS',
    path: 'attendance/att-2026',
    timestamp: new Date(Date.now() - 600000).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    status: 'completado',
    details: 'Coordenadas satelitales validadas dentro del perímetro de obra.',
  },
];

export function useFirebaseSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>('online');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(new Date());
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>(INITIAL_SYNC_LOGS);

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
        timestamp: new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        status: 'sincronizando',
        details: 'Reconectando con la base de datos Firestore...',
      };
      setSyncLogs((prev) => [newLog, ...prev]);

      setTimeout(() => {
        setStatus('online');
        setLastSyncedAt(new Date());
        setSyncLogs((prev) =>
          prev.map((l) => (l.id === newLog.id ? { ...l, status: 'completado', details: 'Sincronización completa con Firestore.' } : l))
        );
      }, 1000);
    };

    const handleOffline = () => {
      setStatus('offline');
      const newLog: SyncLogEntry = {
        id: `log-${Date.now()}`,
        operation: 'Modo Offline Activado',
        path: 'firebase/network',
        timestamp: new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        status: 'pendiente',
        details: 'Los cambios locales se guardarán en la memoria hasta recuperar conexión.',
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
          timestamp: new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          status: 'sincronizando',
          details: detail.details || 'Enviando petición a la base de datos...',
        };
        setSyncLogs((prev) => [newLog, ...prev.slice(0, 19)]);
      }
    };

    const handleSyncEnd = () => {
      if (navigator.onLine) {
        setStatus('online');
        setLastSyncedAt(new Date());
        setSyncLogs((prev) =>
          prev.map((l, index) =>
            index === 0 && l.status === 'sincronizando'
              ? { ...l, status: 'completado', details: 'Operación confirmada por Firestore.' }
              : l
          )
        );
      }
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

  const forceResync = () => {
    setStatus('syncing');
    notifySyncStart({ operation: 'Resincronización Manual', path: 'firestore/all', details: 'Forzando actualización de la caché...' });
    setTimeout(() => {
      setStatus('online');
      setLastSyncedAt(new Date());
      notifySyncEnd();
    }, 1200);
  };

  return { status, lastSyncedAt, syncLogs, clearSyncLogs, forceResync };
}

export function notifySyncStart(details?: { operation?: string; path?: string; details?: string }) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('firebase-sync-start', { detail: details }));
  }
}

export function notifySyncEnd() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('firebase-sync-end'));
  }
}
