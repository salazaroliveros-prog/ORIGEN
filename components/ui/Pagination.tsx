'use client';

import React from 'react';

/**
 * Componente de paginación accesible (WCAG 2.1 AA).
 *
 * Características:
 * - Aria-label para navegación
 * - Botones Anterior/Siguiente con estados disabled
 * - Números de página con indicador de página actual (aria-current="page")
 * - Rango de resultados mostrados
 * - Tamaño de página configurable
 * - Focus visible y contraste adecuado
 *
 * @example
 * <Pagination
 *   totalItems={filteredProjects.length}
 *   pageSize={10}
 *   currentPage={currentPage}
 *   onPageChange={setCurrentPage}
 *   ariaLabel="Paginación de proyectos"
 * />
 */
interface PaginationProps {
  totalItems: number;
  pageSize: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  ariaLabel?: string;
  className?: string;
}

export function Pagination({
  totalItems,
  pageSize,
  currentPage,
  onPageChange,
  onPageSizeChange,
  ariaLabel = 'Paginación',
  className = '',
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safePage = Math.max(1, Math.min(currentPage, totalPages));
  const startIndex = (safePage - 1) * pageSize + 1;
  const endIndex = Math.min(safePage * pageSize, totalItems);

  const goToPage = (page: number) => {
    const p = Math.max(1, Math.min(page, totalPages));
    if (p !== safePage) {
      onPageChange(p);
    }
  };

  if (totalItems === 0) {
    return (
      <div
        className={`flex items-center justify-between gap-2 text-xs text-slate-400 ${className}`}
      >
        <span>No hay elementos para mostrar</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Resumen de resultados */}
      <p className="text-xs text-slate-400">
        Mostrando <strong>{startIndex}</strong> a <strong>{endIndex}</strong> de{' '}
        <strong>{totalItems}</strong> resultados
      </p>

      {/* Controles de paginación */}
      <nav
        aria-label={ariaLabel}
        className="flex items-center justify-between gap-2"
      >
        <button
          onClick={() => goToPage(safePage - 1)}
          disabled={safePage === 1}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            safePage === 1
              ? 'border border-slate-300 bg-slate-100 text-slate-400'
              : 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50'
          }`}
          aria-label="Página anterior"
        >
          <span className="hidden sm:inline">Anterior</span>
          <span className="sm:hidden">‹</span>
        </button>

        {/* Números de página (mostrar máximo 5) */}
        <div className="flex items-center gap-1">
          {(() => {
            const pages: number[] = [];
            const showDotsLeft = safePage > 3;
            const showDotsRight = safePage < totalPages - 2;

            let start = Math.max(1, safePage - 2);
            let end = Math.min(totalPages, safePage + 2);

            if (showDotsLeft) start = 2;
            if (showDotsRight) end = totalPages - 1;

            if (start > 1) pages.push(1);
            if (showDotsLeft) pages.push(-1); // -1 representa "..."

            for (let i = start; i <= end; i++) pages.push(i);
            if (showDotsRight) pages.push(-1);
            if (end < totalPages) pages.push(totalPages);

            return pages.map((p) => {
              if (p === -1) {
                return (
                  <span key="dots" className="px-2 text-xs text-slate-400">
                    …
                  </span>
                );
              }
              const isActive = p === safePage;
              return (
                <button
                  key={p}
                  onClick={() => goToPage(p)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-brand-400 text-neutral-900 shadow-glow'
                      : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {p}
                </button>
              );
            });
          })()}
        </div>

        <button
          onClick={() => goToPage(safePage + 1)}
          disabled={safePage === totalPages}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            safePage === totalPages
              ? 'border border-slate-300 bg-slate-100 text-slate-400'
              : 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50'
          }`}
          aria-label="Página siguiente"
        >
          <span className="hidden sm:inline">Siguiente</span>
          <span className="sm:hidden">›</span>
        </button>
      </nav>

      {/* Selector de tamaño de página */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-400">Elementos por página:</span>
        <select
          value={pageSize}
          onChange={(e) => {
            const newSize = parseInt(e.target.value, 10);
            if (!isNaN(newSize) && newSize > 0) {
              onPageSizeChange?.(newSize);
              onPageChange(1);
            }
          }}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-400"
        >
          <option value="5">5</option>
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
        </select>
      </div>
    </div>
  );
}
