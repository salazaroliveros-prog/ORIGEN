'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Search, Users, Mail, Phone, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Employee {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  position: string;
  department: string;
  startDate: string;
  status: 'Activo' | 'Inactivo';
  dailyRateGTQ?: number;
}

interface PersonalModuleProps {
  employees?: Employee[];
  loading?: boolean;
  canWrite?: boolean;
}

/**
 * PERSONAL MODULE - Módulo de Personal & IGSS
 * 
 * ✨ Características:
 * - Directorio de personal
 * - Datos de IGSS
 * - Tarjetas de horario
 * - Control de asistencia
 * - Estados de empleado
 */
export function PersonalModule({
  employees = [],
  loading = false,
  canWrite = false,
}: PersonalModuleProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) =>
      emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [employees, searchTerm]);

  return (
    <div className="min-h-screen space-y-6 bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Personal & IGSS</h1>
          <p className="mt-1 text-sm text-slate-400">Control de cuadrillas y cumplimiento laboral</p>
        </div>
        {canWrite && (
          <Button variant="primary" className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Agregar Empleado
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar empleado..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/[0.05] py-2 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredEmployees.map((emp) => (
          <Card key={emp.id} variant="default">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-white">{emp.fullName}</h3>
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-medium border ${
                    emp.status === 'Activo'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-slate-500/20 text-slate-300 border-slate-500/30'
                  }`}
                >
                  {emp.status}
                </span>
              </div>
              <p className="text-sm text-slate-300">{emp.position}</p>
              {emp.email && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Mail className="h-4 w-4" />
                  {emp.email}
                </div>
              )}
              {emp.phone && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Phone className="h-4 w-4" />
                  {emp.phone}
                </div>
              )}
              {emp.startDate && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Calendar className="h-4 w-4" />
                  {new Date(emp.startDate).toLocaleDateString('es-ES')}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {filteredEmployees.length === 0 && (
        <Card variant="default" className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="mb-4 h-12 w-12 text-slate-500" />
          <h3 className="mb-2 text-lg font-semibold text-white">Sin empleados</h3>
        </Card>
      )}
    </div>
  );
}

export default PersonalModule;
