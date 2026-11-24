'use client';

import React from 'react';
import { PieChart, Download, Filter } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

/**
 * REPORTS MODULE - Módulo de Reportes Mejorado
 */
export function ReportsModuleExpanded() {
  const reports = [
    { id: 1, name: 'Resumen de Proyectos', icon: '📊', desc: 'Reporte general de todos los proyectos' },
    { id: 2, name: 'Presupuesto vs Gasto', icon: '💰', desc: 'Comparación de presupuesto ejecutado' },
    { id: 3, name: 'Personal Activo', icon: '👥', desc: 'Nomina y estado del personal' },
    { id: 4, name: 'Maquinaria', icon: '🚜', desc: 'Estado de equipos y mantenimiento' },
    { id: 5, name: 'Inventario', icon: '📦', desc: 'Existencias y movimientos' },
    { id: 6, name: 'Finanzas', icon: '📈', desc: 'Análisis financiero detallado' },
  ];

  return (
    <div className="min-h-screen space-y-6 bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Reportes Finales</h1>
          <p className="mt-1 text-sm text-slate-400">Generación de reportes ejecutivos y documentación de obra</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
          <Button variant="primary" size="sm" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <Card key={report.id} variant="default" className="group cursor-pointer hover:border-primary-500/50">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-3xl">{report.icon}</p>
                <h3 className="mt-3 font-semibold text-white">{report.name}</h3>
                <p className="mt-2 text-sm text-slate-400">{report.desc}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="mt-4 w-full">
              Ver Reporte
            </Button>
          </Card>
        ))}
      </div>

      {/* Quick Stats */}
      <Card variant="elevated" className="mt-8">
        <h3 className="text-lg font-semibold text-white mb-4">Estadísticas Rápidas</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Proyectos</p>
            <p className="mt-2 text-2xl font-bold text-white">0</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Presupuesto</p>
            <p className="mt-2 text-2xl font-bold text-white">Q0</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Gastado</p>
            <p className="mt-2 text-2xl font-bold text-white">Q0</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Empleados</p>
            <p className="mt-2 text-2xl font-bold text-white">0</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default ReportsModuleExpanded;
