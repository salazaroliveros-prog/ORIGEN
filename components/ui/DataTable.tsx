'use client';

import React from 'react';

/**
 * DataTable semántico y accesible (WCAG 2.1 AA).
 *
 * Características:
 * - <caption> para lectores de pantalla (oculto visualmente)
 * - role="grid", role="row", role="gridcell" para navegación por teclado
 * - scope="col" en encabezados de columna
 * - Estados vacíos con mensaje descriptivo
 * - Celdas personalizables vía función render
 * - Hover y focus visibles
 * - ✅ Shadow inset para indicar scroll horizontal en mobile
 *
 * @example
 * <DataTable
 *   columns={[
 *     { key: 'name', header: 'Nombre', className: 'text-left' },
 *     { key: 'amount', header: 'Monto', className: 'text-right' },
 *   ]}
 *   data={items}
 *   getRowId={(item) => item.id}
 *   ariaLabel="Lista de gastos del proyecto"
 *   emptyMessage="No hay gastos registrados"
 * />
 */
interface DataTableColumn<T> {
  key: keyof T | string;
  header: string;
  className?: string;
  cell?: (value: unknown, row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowId: (row: T) => string;
  ariaLabel: string;
  className?: string;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
}

export function DataTable<T>({
  columns,
  data,
  getRowId,
  ariaLabel,
  className = '',
  emptyMessage = 'No hay datos disponibles',
  emptyIcon,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div
        role="region"
        aria-label={ariaLabel}
        className={`rounded-xl border p-8 text-center ${className}`}
      >
        {emptyIcon && (
          <div className="mx-auto mb-3 h-8 w-8 text-slate-400" aria-hidden="true">
            {emptyIcon}
          </div>
        )}
        <p className="text-sm text-slate-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label={ariaLabel}
      // ✅ CORRECCIÓN: Shadow inset para indicar scroll horizontal disponible
      className={`overflow-x-auto rounded-lg shadow-[inset_-15px_0_15px_-10px_rgba(0,0,0,0.3)] ${className}`}
    >
      <table
        role="grid"
        aria-label={ariaLabel}
        className="w-full border-collapse text-left text-xs"
      >
        <caption className="sr-only">{ariaLabel}</caption>
        <thead>
          <tr className="border-b border-slate-700/50 bg-slate-800/40">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                scope="col"
                className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-300 ${col.className ?? ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/30">
          {data.map((row) => (
            <tr key={String(getRowId(row))} role="row" className="transition hover:bg-slate-800/30">
              {columns.map((col) => {
                const rowObj = row as unknown as Record<string, unknown>;
                const key = String(col.key);
                const value = rowObj[key];
                return (
                  <td
                    key={String(col.key)}
                    role="gridcell"
                    className={`px-4 py-3 text-slate-200 ${col.className ?? ''}`}
                  >
                    {col.cell ? col.cell(value, row) : String(value ?? '')}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
