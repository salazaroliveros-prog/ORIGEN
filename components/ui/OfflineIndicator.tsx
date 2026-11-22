'use client';

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

type ConnectionStatus = 'online' | 'offline' | 'reconnecting';

export function OfflineIndicator() {
  const [status, setStatus] = useState<ConnectionStatus>('online');
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setStatus('online');
      setShowBanner(false);
    };

    const handleOffline = () => {
      setStatus('offline');
      setShowBanner(true);
    };

    // Initial check
    setStatus(navigator.onLine ? 'online' : 'offline');
    setShowBanner(!navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    setStatus('reconnecting');
    // Simulate reconnection check
    setTimeout(() => {
      if (navigator.onLine) {
        setStatus('online');
        setShowBanner(false);
      } else {
        setStatus('offline');
      }
    }, 2000);
  };

  if (status === 'online' && !showBanner) {
    return null;
  }

  return (
    <div
      className={`fixed left-0 right-0 top-0 z-[9999] p-4 transition-all duration-300 ${
        status === 'offline' ? 'bg-amber-500' : 'bg-sky-500'
      }`}
      role="alert"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {status === 'offline' ? (
            <WifiOff className="h-5 w-5 text-white" aria-hidden="true" />
          ) : status === 'reconnecting' ? (
            <RefreshCw className="h-5 w-5 animate-spin text-white" aria-hidden="true" />
          ) : (
            <Wifi className="h-5 w-5 text-white" aria-hidden="true" />
          )}
          <div>
            <p className="font-semibold text-white">
              {status === 'offline'
                ? 'Sin conexión a internet'
                : status === 'reconnecting'
                  ? 'Reconectando...'
                  : 'Conexión restaurada'}
            </p>
            <p className="text-sm text-white/90">
              {status === 'offline'
                ? 'Algunas funciones pueden no estar disponibles. Los datos se sincronizarán cuando vuelvas a estar conectado.'
                : 'Tu conexión ha sido restaurada.'}
            </p>
          </div>
        </div>
        {status === 'offline' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRetry}
            className="bg-white/20 text-white hover:bg-white/30"
          >
            <>
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Reintentar
            </>
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Compact offline indicator for header/footer
 */
export function CompactOfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) {
    return null;
  }

  return (
    <div
      className="flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1.5 text-amber-400"
      role="status"
      aria-label="Sin conexión a internet"
    >
      <WifiOff className="h-4 w-4" aria-hidden="true" />
      <span className="text-xs font-semibold">Offline</span>
    </div>
  );
}

/**
 * Data sync status indicator
 */
export function DataSyncIndicator({
  syncStatus,
  pendingChanges,
}: {
  syncStatus: 'synced' | 'syncing' | 'error';
  pendingChanges?: number;
}) {
  if (syncStatus === 'synced' && !pendingChanges) {
    return null;
  }

  return (
    <div
      className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
        syncStatus === 'error'
          ? 'bg-rose-500/20 text-rose-400'
          : syncStatus === 'syncing'
            ? 'bg-sky-500/20 text-sky-400'
            : 'bg-amber-500/20 text-amber-400'
      }`}
      role="status"
      aria-label={
        syncStatus === 'error'
          ? 'Error de sincronización'
          : syncStatus === 'syncing'
            ? 'Sincronizando datos'
            : `${pendingChanges} cambios pendientes de sincronización`
      }
    >
      {syncStatus === 'error' ? (
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
      ) : syncStatus === 'syncing' ? (
        <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <WifiOff className="h-4 w-4" aria-hidden="true" />
      )}
      <span>
        {syncStatus === 'error'
          ? 'Error de sync'
          : syncStatus === 'syncing'
            ? 'Sincronizando...'
            : `${pendingChanges} pendientes`}
      </span>
    </div>
  );
}
