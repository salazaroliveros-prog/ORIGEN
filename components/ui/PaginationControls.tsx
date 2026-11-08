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

/**
 * Pagination controls component
 * Shows page buttons, previous/next navigation
 */
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
  // Calculate which items are displayed
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers to display (e.g., 1, 2, 3, ..., 10, 11, 12)
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxButtons = compact ? 3 : 5;
    const halfWindow = Math.floor(maxButtons / 2);

    if (totalPages <= maxButtons + 2) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Calculate range around current page
      const rangeStart = Math.max(2, currentPage - halfWindow);
      const rangeEnd = Math.min(totalPages - 1, currentPage + halfWindow);

      if (rangeStart > 2) pages.push('…');
      for (let i = rangeStart; i <= rangeEnd; i++) {
        pages.push(i);
      }
      if (rangeEnd < totalPages - 1) pages.push('…');

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
      {/* Info text */}
      <div className="text-xs text-slate-400 sm:text-sm">
        Mostrando <span className="font-semibold text-white">{startItem}</span> a{' '}
        <span className="font-semibold text-white">{endItem}</span> de{' '}
        <span className="font-semibold text-white">{totalItems}</span> elementos
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center gap-2">
        {/* Previous button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrevious}
          className="gap-1"
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
          {!compact && <span>Anterior</span>}
        </Button>

        {/* Page buttons */}
        <div className="flex gap-1">
          {pageNumbers.map((page, idx) =>
            page === '…' ? (
              <span key={`ellipsis-${idx}`} className="px-2 py-1 text-slate-500">
                ...
              </span>
            ) : (
              <Button
                key={page}
                variant={page === currentPage ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => onPageChange(page as number)}
                className="min-w-10"
                aria-current={page === currentPage ? 'page' : undefined}
              >
                {page}
              </Button>
            )
          )}
        </div>

        {/* Next button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          className="gap-1"
          aria-label="Siguiente página"
        >
          {!compact && <span>Siguiente</span>}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default PaginationControls;
