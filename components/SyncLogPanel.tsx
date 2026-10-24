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

export const SyncLogPanel: React.FC<SyncLogPanelProps> = ({
  isOpen,
  onClose,
  status,
  lastSyncedAt,
  syncLogs,
  onClearLogs,
  onForceResync,
}) => {
  const [filterStatus, setFilterStatus] = useState<'todos' | 'completado' | 'sincronizando' | 'pendiente'>('todos');
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
  const pendingCount = syncLogs.filter((l) => l.status === 'sincronizando' || l.status === 'pendiente').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-6 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span
              className={`p-3 rounded-2xl border ${
                status === 'offline'
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  : status === 'syncing'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}
            >
              <Database className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-white tracking-tight">
                  Historial de Sincronización Firestore
                </h3>
                <span
                  className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase border ${
                    status === 'offline'
                      ? 'bg-rose-950 text-rose-300 border-rose-800'
                      : status === 'syncing'
                      ? 'bg-amber-950 text-amber-300 border-amber-800 animate-pulse'
                      : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  }`}
                >
                  {status === 'offline' ? 'Modo Offline' : status === 'syncing' ? 'Sincronizando' : 'En Línea'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Registro en tiempo real de operaciones de escritura y consultas a la base de datos de Firebase.
              </p>
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={onClose} className="p-2 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Sync Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
            <span className="text-[10px] text-slate-400 font-sans block">Estado Conexión:</span>
            <strong
              className={`text-xs block mt-0.5 ${
                status === 'offline'
                  ? 'text-rose-400'
                  : status === 'syncing'
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {status === 'offline' ? 'Sin Internet' : status === 'syncing' ? 'Sincronizando...' : 'Conectado a Firestore'}
            </strong>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
            <span className="text-[10px] text-slate-400 font-sans block">Operaciones Exitosas:</span>
            <strong className="text-emerald-400 text-xs block mt-0.5">
              {completedCount} de {syncLogs.length} confirmadas
            </strong>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
            <span className="text-[10px] text-slate-400 font-sans block">Último Refresco:</span>
            <strong className="text-sky-400 text-xs block mt-0.5">
              {lastSyncedAt ? lastSyncedAt.toLocaleTimeString('es-GT') : 'Reciente'}
            </strong>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-800/40 p-3 rounded-2xl border border-slate-800 text-xs">
          <div className="relative w-full sm:w-auto flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por colección, ruta o tipo..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700 w-full sm:w-auto">
            <button
              onClick={() => setFilterStatus('todos')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                filterStatus === 'todos' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos ({syncLogs.length})
            </button>
            <button
              onClick={() => setFilterStatus('completado')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                filterStatus === 'completado' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Exitosos
            </button>
            <button
              onClick={() => setFilterStatus('sincronizando')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                filterStatus === 'sincronizando' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              En Proceso
            </button>
          </div>
        </div>

        {/* Logs Feed */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {filteredLogs.map((log) => {
            const isSuccess = log.status === 'completado';
            const isSyncing = log.status === 'sincronizando';

            return (
              <div
                key={log.id}
                className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60 flex items-start justify-between gap-3 text-xs transition hover:border-slate-600"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`p-2 rounded-xl border mt-0.5 shrink-0 ${
                      isSuccess
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : isSyncing
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-spin'
                        : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {isSuccess ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : isSyncing ? (
                      <RefreshCw className="w-4 h-4" />
                    ) : (
                      <WifiOff className="w-4 h-4" />
                    )}
                  </span>

                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-white font-bold">{log.operation}</strong>
                      <span className="font-mono text-[10px] text-amber-400 bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 rounded">
                        {log.path}
                      </span>
                    </div>
                    {log.details && <p className="text-slate-400 text-[11px] mt-1">{log.details}</p>}
                  </div>
                </div>

                <div className="text-right shrink-0 font-mono">
                  <span className="text-[10px] text-slate-400 block">{log.timestamp}</span>
                  <span
                    className={`text-[9px] uppercase font-extrabold font-sans px-2 py-0.5 rounded mt-1 inline-block ${
                      isSuccess
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : isSyncing
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}
                  >
                    {log.status}
                  </span>
                </div>
              </div>
            );
          })}

          {filteredLogs.length === 0 && (
            <div className="p-8 text-center text-slate-400 space-y-2 bg-slate-950/60 rounded-2xl border border-slate-800">
              <Database className="w-8 h-8 opacity-30 mx-auto text-slate-500" />
              <p className="text-xs font-bold text-white">Sin registros de sincronización coincidentes</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={onClearLogs}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpiar Historial</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onForceResync}
              className="flex items-center gap-1.5 text-xs font-bold text-sky-300 border-sky-500/30 bg-sky-500/10"
            >
              <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
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
};
