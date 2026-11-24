'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Search, Truck, Gauge } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Machinery {
  id: string;
  code: string;
  name: string;
  type: string;
  model: string;
  horometer: number;
  status: 'Activa' | 'Inactiva' | 'Mantenimiento';
  lastMaintenance?: string;
  projectId?: string;
}

/**
 * MACHINERY MODULE - Módulo de Maquinaria Mejorado
 */
export function MachineryModuleExpanded({
  machinery = [],
  canWrite = false,
}: {
  machinery?: Machinery[];
  canWrite?: boolean;
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    return machinery.filter(
      (m) =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [machinery, searchTerm]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Activa':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'Inactiva':
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
      case 'Mantenimiento':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="min-h-screen space-y-6 bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Maquinaria</h1>
          <p className="mt-1 text-sm text-slate-400">Control de flota de maquinaria y horómetros</p>
        </div>
        {canWrite && (
          <Button variant="primary" className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Agregar Equipo
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar maquinaria..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/[0.05] py-2 pl-10 pr-4 text-sm text-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((m) => (
          <Card key={m.id} variant="default">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold text-primary-300">{m.code}</span>
                  <h3 className="mt-1 font-semibold text-white">{m.name}</h3>
                </div>
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusColor(m.status)}`}
                >
                  {m.status}
                </span>
              </div>
              <div className="text-sm text-slate-300">
                <p>
                  {m.type} - {m.model}
                </p>
              </div>
              <div className="flex items-center gap-2 border-t border-white/10 pt-2 text-sm text-slate-400">
                <Gauge className="h-4 w-4" />
                <span>{m.horometer.toLocaleString()} horas</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card variant="default" className="flex flex-col items-center justify-center py-12">
          <Truck className="mb-4 h-12 w-12 text-slate-500" />
          <h3 className="text-lg font-semibold text-white">Sin maquinaria</h3>
        </Card>
      )}
    </div>
  );
}

export default MachineryModuleExpanded;
