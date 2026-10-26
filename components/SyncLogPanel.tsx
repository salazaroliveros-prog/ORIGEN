'use client';

import React, { useState } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  WifiOff,
  Database,
  Trash2,
  X,
  Search,
  Check,
  ShieldCheck,
  ArrowRight,
  Activity,
  Layers,
} from 'lucide-react';
import { SyncLogEntry, SyncStatus } from '@/lib/hooks/useFirebaseSyncStatus';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface SyncLogPanelProps {
  isOpen: boolean;
  onClose: () => void;
  status: SyncStatus;
  lastSyncedAt: Date | null;
  syncLogs: SyncLogEntry[];
  onClearLogs: () => void;
  onForceResync: () => void;
}

export function SyncLogPanel({
  isOpen,
  onClose,
  status,
  lastSyncedAt,
  syncLogs,
  onClearLogs,
  onForceResync,
}: SyncLogPanelProps) {
  const [filterStatus, setFilterStatus] = useState<
    'todos' | 'completado' | 'sincronizando' | 'pendiente'
  >('todos');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredLogs = syncLogs.filter((log) => {
    const matchesStatus = filterStatus === 'todos' || log.status === filterStatus;
    const matchesSearch =
      log.operation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const completedCount = syncLogs.filter((l) => l.status === 'completado').length;
  const pendingCount = syncLogs.filter(
    (l) => l.status === 'sincronizando' || l.status === 'pendiente'
  ).length;

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md duration-200">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col space-y-6 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <span
              className={`rounded-2xl border p-3 ${
                status === 'offline'
                  ? 'border-rose-500/30 bg-rose-500/20 text-rose-400'
                  : status === 'syncing'
                    ? 'animate-pulse border-amber-500/30 bg-amber-500/20 text-amber-400'
                    : 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400'
              }`}
            >
              <Database className="h-6 w-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold tracking-tight text-white">
                  Historial de Sincronización Firestore
                </h3>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                    status === 'offline'
                      ? 'border-rose-800 bg-rose-950 text-rose-300'
                      : status === 'syncing'
                        ? 'animate-pulse border-amber-800 bg-amber-950 text-amber-300'
                        : 'border-emerald-800 bg-emerald-950 text-emerald-300'
                  }`}
                >
                  {status === 'offline'
                    ? 'Modo Offline'
                    : status === 'syncing'
                      ? 'Sincronizando'
                      : 'En Línea'}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                Registro en tiempo real de operaciones de escritura y consultas a la base de datos
                de Firebase.
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Sync Summary Cards */}
        <div className="grid grid-cols-1 gap-3 font-mono text-xs sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-700/60 bg-slate-800/60 p-3">
            <span className="block font-sans text-[10px] text-slate-400">Estado Conexión:</span>
            <strong
              className={`mt-0.5 block text-xs ${
                status === 'offline'
                  ? 'text-rose-400'
                  : status === 'syncing'
                    ? 'text-amber-400'
                    : 'text-emerald-400'
              }`}
            >
              {status === 'offline'
                ? 'Sin Internet'
                : status === 'syncing'
                  ? 'Sincronizando...'
                  : 'Conectado a Firestore'}
            </strong>
          </div>

          <div className="rounded-2xl border border-slate-700/60 bg-slate-800/60 p-3">
            <span className="block font-sans text-[10px] text-slate-400">
              Operaciones Exitosas:
            </span>
            <strong className="mt-0.5 block text-xs text-emerald-400">
              {completedCount} de {syncLogs.length} confirmadas
            </strong>
          </div>

          <div className="rounded-2xl border border-slate-700/60 bg-slate-800/60 p-3">
            <span className="block font-sans text-[10px] text-slate-400">Último Refresco:</span>
            <strong className="mt-0.5 block text-xs text-sky-400">
              {lastSyncedAt ? lastSyncedAt.toLocaleTimeString('es-GT') : 'Reciente'}
            </strong>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-800/40 p-3 text-xs sm:flex-row">
          <div className="relative w-full flex-1 sm:w-auto">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por colección, ruta o tipo..."
              className="w-full rounded-xl border border-slate-700 bg-slate-900 py-1.5 pr-3 pl-9 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex w-full items-center gap-1 rounded-xl border border-slate-700 bg-slate-900 p-1 sm:w-auto">
            <button
              onClick={() => setFilterStatus('todos')}
              className={`cursor-pointer rounded-lg px-2.5 py-1 font-bold transition ${
                filterStatus === 'todos'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos ({syncLogs.length})
            </button>
            <button
              onClick={() => setFilterStatus('completado')}
              className={`cursor-pointer rounded-lg px-2.5 py-1 font-bold transition ${
                filterStatus === 'completado'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Exitosos
            </button>
            <button
              onClick={() => setFilterStatus('sincronizando')}
              className={`cursor-pointer rounded-lg px-2.5 py-1 font-bold transition ${
                filterStatus === 'sincronizando'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              En Proceso
            </button>
          </div>
        </div>

        {/* Logs Feed */}
        <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
          {filteredLogs.map((log) => {
            const isSuccess = log.status === 'completado';
            const isSyncing = log.status === 'sincronizando';

            return (
              <div
                key={log.id}
                className="flex items-start justify-between gap-3 rounded-2xl border border-slate-700/60 bg-slate-800/60 p-3.5 text-xs transition hover:border-slate-600"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 shrink-0 rounded-xl border p-2 ${
                      isSuccess
                        ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400'
                        : isSyncing
                          ? 'animate-spin border-amber-500/30 bg-amber-500/20 text-amber-400'
                          : 'border-rose-500/30 bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {isSuccess ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : isSyncing ? (
                      <RefreshCw className="h-4 w-4" />
                    ) : (
                      <WifiOff className="h-4 w-4" />
                    )}
                  </span>

                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="font-bold text-white">{log.operation}</strong>
                      <span className="rounded border border-amber-800/80 bg-amber-950/60 px-2 py-0.5 font-mono text-[10px] text-amber-400">
                        {log.path}
                      </span>
                    </div>
                    {log.details && (
                      <p className="mt-1 text-[11px] text-slate-400">{log.details}</p>
                    )}
                  </div>
                </div>

                <div className="shrink-0 text-right font-mono">
                  <span className="block text-[10px] text-slate-400">{log.timestamp}</span>
                  <span
                    className={`mt-1 inline-block rounded px-2 py-0.5 font-sans text-[9px] font-extrabold uppercase ${
                      isSuccess
                        ? 'border border-emerald-800 bg-emerald-950 text-emerald-300'
                        : isSyncing
                          ? 'border border-amber-800 bg-amber-950 text-amber-300'
                          : 'border border-rose-800 bg-rose-950 text-rose-300'
                    }`}
                  >
                    {log.status}
                  </span>
                </div>
              </div>
            );
          })}

          {filteredLogs.length === 0 && (
            <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-8 text-center text-slate-400">
              <Database className="mx-auto h-8 w-8 text-slate-500 opacity-30" />
              <p className="text-xs font-bold text-white">
                Sin registros de sincronización coincidentes
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onClearLogs}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Limpiar Historial</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onForceResync}
              className="flex items-center gap-1.5 border-sky-500/30 bg-sky-500/10 text-xs font-bold text-sky-300"
            >
              <RefreshCw className="h-3.5 w-3.5 text-sky-400" />
              <span>Forzar Resincronización</span>
            </Button>

            <Button variant="primary" size="md" onClick={onClose}>
              Aceptar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
