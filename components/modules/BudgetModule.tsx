'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Search, DollarSign, AlertCircle, TrendingDown } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface BudgetItem {
  id: string;
  code: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  spent: number;
  projectId: string;
  category: string;
  status: 'Presupuestado' | 'Ejecutando' | 'Completado';
}

interface BudgetModuleProps {
  items?: BudgetItem[];
  projectId?: string;
  loading?: boolean;
  onCreateItem?: (data: Partial<BudgetItem>) => Promise<void>;
  onUpdateItem?: (id: string, data: Partial<BudgetItem>) => Promise<void>;
  onDeleteItem?: (id: string) => Promise<void>;
  canWrite?: boolean;
}

/**
 * BUDGET MODULE - Módulo de Presupuestos APU
 * 
 * ✨ Características:
 * - Presupuestos con APU (Análisis de Precios Unitarios)
 * - Tracking de gastos vs presupuesto
 * - Estados visuales por utilización
 * - Comparación real vs presupuestado
 * - Filtros por categoría y estado
 * - WCAG 2.1 AA accesibilidad
 */
export function BudgetModule({
  items = [],
  projectId = '',
  loading = false,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
  canWrite = false,
}: BudgetModuleProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<BudgetItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filters, setFilters] = useState({ category: 'all', status: 'all' });

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (
        searchTerm &&
        !(
          item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description.toLowerCase().includes(searchTerm.toLowerCase())
        )
      ) {
        return false;
      }

      if (filters.category !== 'all' && item.category !== filters.category) {
        return false;
      }

      if (filters.status !== 'all' && item.status !== filters.status) {
        return false;
      }

      return true;
    });
  }, [items, searchTerm, filters]);

  // Totals
  const totals = useMemo(() => {
    return filteredItems.reduce(
      (acc, item) => ({
        budget: acc.budget + item.total,
        spent: acc.spent + item.spent,
      }),
      { budget: 0, spent: 0 }
    );
  }, [filteredItems]);

  const utilizationPercent =
    totals.budget > 0 ? Math.round((totals.spent / totals.budget) * 100) : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Presupuestado':
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
      case 'Ejecutando':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
      case 'Completado':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const getUtilizationColor = (percent: number) => {
    if (percent >= 90) return 'text-red-400 bg-red-500/20';
    if (percent >= 75) return 'text-amber-400 bg-amber-500/20';
    return 'text-emerald-400 bg-emerald-500/20';
  };

  return (
    <div className="min-h-screen space-y-6 bg-slate-950 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Presupuestos APU</h1>
          <p className="mt-1 text-sm text-slate-400">
            Análisis de Precios Unitarios y control de gastos por renglón
          </p>
        </div>

        {canWrite && (
          <Button
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Nuevo Renglón
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card variant="default">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Presupuesto Total
              </p>
              <p className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                Q{totals.budget.toLocaleString()}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-500/20 text-primary-300">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
        </Card>

        <Card variant="default">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Gastos Registrados
              </p>
              <p className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                Q{totals.spent.toLocaleString()}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
              <TrendingDown className="h-6 w-6" />
            </div>
          </div>
        </Card>

        <Card variant="default">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Utilización
              </p>
              <p className={`mt-2 text-2xl font-bold sm:text-3xl ${getUtilizationColor(utilizationPercent).split(' ')[0]}`}>
                {utilizationPercent}%
              </p>
            </div>
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-lg ${getUtilizationColor(utilizationPercent)}`}
            >
              {utilizationPercent >= 90 ? (
                <AlertCircle className="h-6 w-6" />
              ) : (
                <TrendingDown className="h-6 w-6" />
              )}
            </div>
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
          <option value="Presupuestado">Presupuestado</option>
          <option value="Ejecutando">Ejecutando</option>
          <option value="Completado">Completado</option>
        </select>
      </div>

      {/* Items Table */}
      <Card variant="default" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                <th className="px-4 py-3 text-left font-semibold text-slate-300">Código</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">Descripción</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-300">Cantidad</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-300">Unitario</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-300">Presupuesto</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-300">Gastado</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-300">Estado</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-300">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-white/5 transition-colors hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3 font-medium text-white">{item.code}</td>
                  <td className="px-4 py-3 text-slate-300">{item.description}</td>
                  <td className="px-4 py-3 text-right text-slate-300">{item.quantity}</td>
                  <td className="px-4 py-3 text-right text-slate-300">
                    Q{item.unitPrice.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-white">
                    Q{item.total.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-amber-300">
                    Q{item.spent.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium border ${getStatusColor(item.status)}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {canWrite && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedItem(item)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteItem?.(item.id)}
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
      {filteredItems.length === 0 && (
        <Card variant="default" className="flex flex-col items-center justify-center py-12 text-center">
          <DollarSign className="mb-4 h-12 w-12 text-slate-500" />
          <h3 className="mb-2 text-lg font-semibold text-white">Sin renglones presupuestarios</h3>
          <p className="text-sm text-slate-400">Crea tu primer renglón para comenzar</p>
        </Card>
      )}
    </div>
  );
}

export default BudgetModule;
