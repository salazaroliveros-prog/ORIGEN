'use client';

import React from 'react';
import { CalendarDays, Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

/**
 * GANTT MODULE - Módulo de Cronograma & Hitos
 */
export function GanttModuleExpanded() {
  return (
    <div className="min-h-screen space-y-6 bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Seguimiento & Hitos</h1>
          <p className="mt-1 text-sm text-slate-400">Cronograma de obra y seguimiento de hitos</p>
        </div>
        <Button variant="primary" className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Nuevo Hito
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card variant="default">
          <p className="text-xs font-semibold uppercase text-primary-400">Hitos Totales</p>
          <p className="mt-2 text-2xl font-bold text-white">0</p>
        </Card>
        <Card variant="default">
          <p className="text-xs font-semibold uppercase text-emerald-400">Completados</p>
          <p className="mt-2 text-2xl font-bold text-white">0%</p>
        </Card>
        <Card variant="default">
          <p className="text-xs font-semibold uppercase text-amber-400">En Progreso</p>
          <p className="mt-2 text-2xl font-bold text-white">0</p>
        </Card>
      </div>

      {/* Gantt Timeline */}
      <Card variant="default" className="p-6">
        <div className="flex flex-col items-center justify-center py-20">
          <CalendarDays className="mb-4 h-12 w-12 text-primary-500" />
          <h2 className="text-xl font-bold text-white">Cronograma Gantt</h2>
          <p className="mt-2 text-sm text-slate-400">Visualización de timeline del proyecto</p>
          <Button variant="primary" className="mt-6">
            Ver Cronograma Completo
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default GanttModuleExpanded;
