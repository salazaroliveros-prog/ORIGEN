'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Search, Boxes, Package } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface InventoryItem {
  id: string;
  code: string;
  name: string;
  quantity: number;
  unit: string;
  warehouse: string;
  minStock: number;
}

/**
 * INVENTORY MODULE - Módulo de Inventario Mejorado
 */
export function InventoryModuleExpanded({
  items = [],
  canWrite = false,
}: {
  items?: InventoryItem[];
  canWrite?: boolean;
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  const stats = useMemo(
    () => ({
      total: items.length,
      lowStock: items.filter((i) => i.quantity <= i.minStock).length,
      totalValue: items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    [items]
  );

  return (
    <div className="min-h-screen space-y-6 bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            Inventario, Compras y Subcontratos
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Existencias por bodega, proveedores y órdenes de compra
          </p>
        </div>
        {canWrite && (
          <Button variant="primary" className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nuevo Artículo
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card variant="default">
          <p className="text-xs font-semibold uppercase text-primary-400">Total Artículos</p>
          <p className="mt-2 text-2xl font-bold text-white">{stats.total}</p>
        </Card>
        <Card variant="default">
          <p className="text-xs font-semibold uppercase text-amber-400">Stock Bajo</p>
          <p className="mt-2 text-2xl font-bold text-white">{stats.lowStock}</p>
        </Card>
        <Card variant="default">
          <p className="text-xs font-semibold uppercase text-sky-400">Existencias</p>
          <p className="mt-2 text-2xl font-bold text-white">{stats.totalValue.toLocaleString()}</p>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar artículo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/[0.05] py-2 pl-10 pr-4 text-sm text-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
        />
      </div>

      {/* Table */}
      <Card variant="default" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                <th className="px-4 py-3 text-left font-semibold text-slate-300">Código</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">Nombre</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">Bodega</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-300">Cantidad</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">Unidad</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-300">Mínimo</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-medium text-white">{item.code}</td>
                  <td className="px-4 py-3 text-slate-300">{item.name}</td>
                  <td className="px-4 py-3 text-slate-300">{item.warehouse}</td>
                  <td className="px-4 py-3 text-right text-white">
                    <span
                      className={
                        item.quantity <= item.minStock ? 'text-amber-300' : 'text-emerald-300'
                      }
                    >
                      {item.quantity.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{item.unit}</td>
                  <td className="px-4 py-3 text-right text-slate-400">{item.minStock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {filtered.length === 0 && (
        <Card variant="default" className="flex flex-col items-center justify-center py-12">
          <Boxes className="mb-4 h-12 w-12 text-slate-500" />
          <h3 className="text-lg font-semibold text-white">Sin inventario</h3>
        </Card>
      )}
    </div>
  );
}

export default InventoryModuleExpanded;
