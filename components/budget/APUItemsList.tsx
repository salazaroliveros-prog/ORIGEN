'use client';

import React, { useState } from 'react';
import { APUItem } from '@/lib/types';
import { usePagination } from '@/lib/hooks/usePagination';
import PaginationControls from '@/components/ui/PaginationControls';
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('APUItemsList');

interface APUItemsListProps {
  items: APUItem[];
  onEdit?: (item: APUItem) => void;
  onDelete?: (itemId: string) => void;
  onSelect?: (item: APUItem) => void;
  readonly?: boolean;
  itemsPerPage?: number;
}

/**
 * APU Items List Component (Refactored Sub-Component)
 * Displays paginated list of APU items with actions
 *
 * Part of the refactored BudgetAndAPU component
 * Features:
 * - Pagination (25 items per page by default)
 * - Sort by code, description, or total price
 * - Edit/Delete actions
 * - Responsive table design
 */
export const APUItemsList = React.memo<APUItemsListProps>(
  ({ items, onEdit, onDelete, onSelect, readonly = false, itemsPerPage = 25 }) => {
    const [sortBy, setSortBy] = useState<'code' | 'description' | 'total'>('code');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // Sort items
    const sortedItems = React.useMemo(() => {
      const sorted = [...items];
      sorted.sort((a, b) => {
        let aVal: any =
          a[
            sortBy === 'code' ? 'code' : sortBy === 'description' ? 'description' : 'totalPriceGTQ'
          ];
        let bVal: any =
          b[
            sortBy === 'code' ? 'code' : sortBy === 'description' ? 'description' : 'totalPriceGTQ'
          ];

        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = (bVal as string).toLowerCase();
        }

        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortOrder === 'asc' ? comparison : -comparison;
      });
      return sorted;
    }, [items, sortBy, sortOrder]);

    // Pagination
    const {
      paginatedItems,
      currentPage,
      totalPages,
      goToPage,
      canGoPrevious,
      canGoNext,
      totalItems,
    } = usePagination(sortedItems, { itemsPerPage });

    const handleDelete = (itemId: string, itemCode: string) => {
      if (!window.confirm(`¿Eliminar renglón ${itemCode}?`)) return;
      log.info('Deleting APU item', { itemId, itemCode });
      onDelete?.(itemId);
    };

    if (items.length === 0) {
      return (
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-slate-400">No hay renglones APU. Crea el primero para comenzar.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Table Header with Sort Controls */}
        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
          <div className="text-sm font-semibold text-slate-200">
            {totalItems} renglones ({currentPage}/{totalPages} páginas)
          </div>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded border border-white/10 bg-slate-950 px-2 py-1 text-xs text-white"
              aria-label="Ordenar por"
            >
              <option value="code">Código</option>
              <option value="description">Descripción</option>
              <option value="total">Precio Total</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="rounded border border-white/10 bg-slate-950 px-2 py-1 text-xs text-white hover:bg-slate-900"
              aria-label={`Ordenar ${sortOrder === 'asc' ? 'descendente' : 'ascendente'}`}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Código
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Descripción
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Cant.
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Precio Unit.
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Total
                </th>
                {!readonly && (
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-300">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-white/5 hover:bg-white/5"
                  onClick={() => onSelect?.(item)}
                  role="button"
                  tabIndex={0}
                >
                  <td className="px-4 py-3 font-mono text-white">{item.code}</td>
                  <td className="px-4 py-3 text-slate-300">{item.description}</td>
                  <td className="px-4 py-3 text-right text-white">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300">
                    Q{item.totalUnitCostGTQ.toLocaleString('es-GT', { maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-400">
                    Q{item.totalPriceGTQ.toLocaleString('es-GT', { maximumFractionDigits: 2 })}
                  </td>
                  {!readonly && (
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        {onEdit && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(item);
                            }}
                            className="rounded bg-sky-500/20 px-2 py-1 text-xs text-sky-300 hover:bg-sky-500/30"
                            aria-label="Editar"
                          >
                            Editar
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item.id, item.code);
                            }}
                            className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-300 hover:bg-red-500/30"
                            aria-label="Eliminar"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={goToPage}
            canGoPrevious={canGoPrevious}
            canGoNext={canGoNext}
          />
        )}
      </div>
    );
  }
);

APUItemsList.displayName = 'APUItemsList';
