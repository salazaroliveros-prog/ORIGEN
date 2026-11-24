'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  compact?: boolean;
}

/** Pagination controls component optimized for both desktop and mobile */
export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  canGoPrevious,
  canGoNext,
  compact = false,
}) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxButtons = compact ? 3 : 5;
    const halfWindow = Math.floor(maxButtons / 2);

    if (totalPages <= maxButtons + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      const rangeStart = Math.max(2, currentPage - halfWindow);
      const rangeEnd = Math.min(totalPages - 1, currentPage + halfWindow);

      if (rangeStart > 2) pages.push('…');
      for (let i = rangeStart; i <= rangeEnd; i++) {
        pages.push(i);
      }
      if (rangeEnd < totalPages - 1) pages.push('…');
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  if (totalPages <= 1) return null;

  return (
    <div
      className="items-center justify-between gap-2 space-y-2 sm:flex-row sm:flex-col"
      role="navigation"
      aria-label="Paginación"
    >
      <div className="text-xs text-slate-400 sm:text-sm">
        Mostrando <span className="font-semibold text-white">{startItem}</span> a{' '}
        <span className="font-semibold text-white">{endItem}</span> de{' '}
        <span className="font-semibold text-white">{totalItems}</span> elementos
      </div>

      <div className="flex flex-col items-center gap-2 sm:flex-row">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrevious}
          className="w-full sm:w-auto"
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
          {!compact && <span className="sr-only">Página anterior</span>}
        </Button>

        <div className="flex justify-center gap-2 sm:justify-end sm:gap-1">
          {pageNumbers.map((page, idx) => {
            if (page === '…') {
              return (
                <span key={`ellipsis-${idx}`} className="px-2 py-1 text-slate-500">
                  …
                </span>
              );
            }
            return (
              <Button
                key={page}
                variant={page === currentPage ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => onPageChange(page as number)}
                className={`w-16 min-w-10 text-center`}
                aria-current={page === currentPage ? 'page' : undefined}
              >
                {page}
              </Button>
            );
          })}
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          className="w-full sm:w-auto"
          aria-label="Siguiente página"
        >
          {!compact && <span className="sr-only">Siguiente</span>}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default PaginationControls;
