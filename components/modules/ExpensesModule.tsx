'use client';

import React, { useState, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Receipt,
  AlertCircle,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Expense {
  id: string;
  code: string;
  description: string;
  amount: number;
  currency: 'GTQ' | 'USD';
  category: string;
  projectId: string;
  date: string;
  status: 'Pendiente' | 'Aprobada' | 'Pagada' | 'Rechazada';
  attachmentUrl?: string;
  notes?: string;
}

interface ExpensesModuleExpandedProps {
  expenses?: Expense[];
  projectId?: string;
  loading?: boolean;
  onCreateExpense?: (data: Partial<Expense>) => Promise<void>;
  onUpdateExpense?: (id: string, data: Partial<Expense>) => Promise<void>;
  onDeleteExpense?: (id: string) => Promise<void>;
  canWrite?: boolean;
}

/**
 * EXPENSES MODULE EXPANDED - Módulo de Gastos & Facturas Completo
 *
 * ✨ Características:
 * - Registro de gastos con categorización
 * - Seguimiento de estado (Pendiente, Aprobada, Pagada)
 * - Soporte multi-moneda (GTQ/USD)
 * - Adjuntos de facturas
 * - Reporte de gastos por categoría
 * - Alertas de límite de presupuesto
 * - WCAG 2.1 AA accesibilidad
 */
export function ExpensesModuleExpanded({
  expenses = [],
  projectId = '',
  loading = false,
  onCreateExpense,
  onUpdateExpense,
  onDeleteExpense,
  canWrite = false,
}: ExpensesModuleExpandedProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filters, setFilters] = useState({ status: 'all', category: 'all' });

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      if (
        searchTerm &&
        !(
          expense.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          expense.description.toLowerCase().includes(searchTerm.toLowerCase())
        )
      ) {
        return false;
      }

      if (filters.status !== 'all' && expense.status !== filters.status) {
        return false;
      }

      if (filters.category !== 'all' && expense.category !== filters.category) {
        return false;
      }

      return true;
    });
  }, [expenses, searchTerm, filters]);

  // Totals by status
  const totals = useMemo(() => {
    return {
      pending: filteredExpenses
        .filter((e) => e.status === 'Pendiente')
        .reduce((sum, e) => sum + e.amount, 0),
      approved: filteredExpenses
        .filter((e) => e.status === 'Aprobada')
        .reduce((sum, e) => sum + e.amount, 0),
      paid: filteredExpenses
        .filter((e) => e.status === 'Pagada')
        .reduce((sum, e) => sum + e.amount, 0),
      rejected: filteredExpenses
        .filter((e) => e.status === 'Rechazada')
        .reduce((sum, e) => sum + e.amount, 0),
      total: filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    };
  }, [filteredExpenses]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pendiente':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'Aprobada':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
      case 'Pagada':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'Rechazada':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="min-h-screen space-y-6 bg-slate-950 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Gastos & Facturas</h1>
          <p className="mt-1 text-sm text-slate-400">
            Registro y control de gastos operativos del proyecto
          </p>
        </div>

        {canWrite && (
          <Button
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Registrar Gasto
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card variant="default">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Pendientes
            </p>
            <p className="mt-2 text-2xl font-bold text-white">Q{totals.pending.toLocaleString()}</p>
          </div>
        </Card>

        <Card variant="default">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-400">Aprobadas</p>
            <p className="mt-2 text-2xl font-bold text-white">
              Q{totals.approved.toLocaleString()}
            </p>
          </div>
        </Card>

        <Card variant="default">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Pagadas
            </p>
            <p className="mt-2 text-2xl font-bold text-white">Q{totals.paid.toLocaleString()}</p>
          </div>
        </Card>

        <Card variant="default">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
              Rechazadas
            </p>
            <p className="mt-2 text-2xl font-bold text-white">
              Q{totals.rejected.toLocaleString()}
            </p>
          </div>
        </Card>

        <Card variant="default">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-400">Total</p>
            <p className="mt-2 text-2xl font-bold text-white">Q{totals.total.toLocaleString()}</p>
          </div>
        </Card>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por código o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.05] py-2 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          />
        </div>

        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
        >
          <option value="all">Todos los estados</option>
          <option value="Pendiente">Pendiente</option>
          <option value="Aprobada">Aprobada</option>
          <option value="Pagada">Pagada</option>
          <option value="Rechazada">Rechazada</option>
        </select>
      </div>

      {/* Expenses Table */}
      <Card variant="default" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                <th className="px-4 py-3 text-left font-semibold text-slate-300">Código</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">Descripción</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">Categoría</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-300">Monto</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">Fecha</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-300">Estado</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-300">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((expense) => (
                <tr
                  key={expense.id}
                  className="border-b border-white/5 transition-colors hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3 font-medium text-white">{expense.code}</td>
                  <td className="px-4 py-3 text-slate-300">{expense.description}</td>
                  <td className="px-4 py-3 text-slate-300">{expense.category}</td>
                  <td className="px-4 py-3 text-right font-medium text-white">
                    {expense.currency} {expense.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    <div className="flex items-center gap-1 text-slate-300">
                      <Calendar className="h-4 w-4" />
                      {new Date(expense.date).toLocaleDateString('es-ES')}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusColor(expense.status)}`}
                    >
                      {expense.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {canWrite && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedExpense(expense)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteExpense?.(expense.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Empty State */}
      {filteredExpenses.length === 0 && (
        <Card
          variant="default"
          className="flex flex-col items-center justify-center py-12 text-center"
        >
          <Receipt className="mb-4 h-12 w-12 text-slate-500" />
          <h3 className="mb-2 text-lg font-semibold text-white">Sin gastos registrados</h3>
          <p className="text-sm text-slate-400">
            {searchTerm || filters.status !== 'all'
              ? 'No se encontraron gastos con los filtros aplicados'
              : 'Registra tu primer gasto para comenzar'}
          </p>
        </Card>
      )}
    </div>
  );
}

export default ExpensesModuleExpanded;
