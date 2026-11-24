'use client';

import React, { useMemo, useState } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  render?: (value: any, row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

export interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  pageSize?: number;
  sortable?: boolean;
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

/**
 * ADVANCED TABLE COMPONENT - Base Reutilizable
 *
 * Features:
 * - Sortable columns
 * - Pagination
 * - Custom rendering
 * - Responsive mobile
 * - Keyboard accessible
 * - Loading states
 *
 * Usado en: Presupuestos, Personal, Gastos, Inventario, etc.
 */
export function Table<T extends { id?: string; [key: string]: any }>({
  data,
  columns,
  pageSize = 10,
  sortable = true,
  striped = true,
  hoverable = true,
  compact = false,
  loading = false,
  emptyMessage = 'No hay datos disponibles',
  onRowClick,
}: TableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof T | null;
    direction: 'asc' | 'desc';
  }>({
    key: null,
    direction: 'asc',
  });

  const [currentPage, setCurrentPage] = useState(1);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortable) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof T];
      const bValue = b[sortConfig.key as keyof T];

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig, sortable]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key: keyof T) => {
    if (!sortable) return;

    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  if (loading) {
    return (
      <Card variant="default" padding="md">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin">
            <div className="h-8 w-8 rounded-full border-4 border-primary-500/20 border-t-primary-500" />
          </div>
        </div>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card variant="default" padding="md">
        <div className="flex items-center justify-center py-12 text-slate-400">
          <p>{emptyMessage}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="default" padding="md" className="overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 ${
                    column.width ? `w-${column.width}` : ''
                  } ${column.align === 'center' ? 'text-center' : ''} ${column.align === 'right' ? 'text-right' : ''}`}
                  onClick={() => column.sortable && handleSort(column.key)}
                  style={{ cursor: column.sortable ? 'pointer' : 'default' }}
                  role={column.sortable ? 'button' : undefined}
                  tabIndex={column.sortable ? 0 : undefined}
                  onKeyDown={
                    column.sortable
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') handleSort(column.key);
                        }
                      : undefined
                  }
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {column.sortable && sortConfig.key === column.key && (
                      <span>
                        {sortConfig.direction === 'asc' ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, idx) => (
              <tr
                key={row.id ?? idx}
                className={`border-b border-white/5 transition-colors ${
                  striped && idx % 2 === 0 ? 'bg-white/[0.02]' : 'bg-transparent'
                } ${hoverable ? 'hover:bg-white/[0.08]' : ''} ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick?.(row)}
                role={onRowClick ? 'button' : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === 'Enter') onRowClick(row);
                      }
                    : undefined
                }
              >
                {columns.map((column) => (
                  <td
                    key={String(column.key)}
                    className={`px-4 py-3 text-sm text-slate-300 ${
                      column.align === 'center' ? 'text-center' : ''
                    } ${column.align === 'right' ? 'text-right' : ''}`}
                  >
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="space-y-3 sm:hidden">
        {paginatedData.map((row, idx) => (
          <div
            key={row.id ?? idx}
            className={`cursor-pointer rounded-lg border border-white/10 p-4 transition-all hover:border-white/20 hover:bg-white/[0.05] ${onRowClick ? '' : 'pointer-events-none'}`}
            onClick={() => onRowClick?.(row)}
          >
            {columns.map((column) => (
              <div
                key={String(column.key)}
                className="mb-2 flex justify-between gap-2 text-xs last:mb-0"
              >
                <span className="font-medium text-slate-400">{column.label}:</span>
                <span className="text-right font-semibold text-white">
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/10 pt-4">
          <div className="text-xs text-slate-400">
            Página {currentPage} de {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }).map((_, idx) => (
              <Button
                key={idx + 1}
                variant={currentPage === idx + 1 ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setCurrentPage(idx + 1)}
              >
                {idx + 1}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              aria-label="Página siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export default Table;
