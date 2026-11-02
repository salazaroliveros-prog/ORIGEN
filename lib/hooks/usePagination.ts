/**
 * Generic Pagination Hook
 * Provides pagination utilities for lists
 */

import { useState, useMemo } from 'react';

interface UsePaginationOptions {
  itemsPerPage?: number;
  initialPage?: number;
}

interface PaginationState {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  startIndex: number;
  endIndex: number;
}

/**
 * Hook for managing pagination state
 */
export function usePagination<T>(
  items: T[],
  options: UsePaginationOptions = {}
): {
  paginatedItems: T[];
  currentPage: number;
  totalPages: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  itemsPerPage: number;
  totalItems: number;
} {
  const itemsPerPage = options.itemsPerPage ?? 25;
  const [currentPage, setCurrentPage] = useState(options.initialPage ?? 1);

  const state = useMemo<PaginationState>(() => {
    const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));
    const validPage = Math.min(Math.max(1, currentPage), totalPages);
    const startIndex = (validPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, items.length);

    return {
      currentPage: validPage,
      totalPages,
      itemsPerPage,
      startIndex,
      endIndex,
    };
  }, [items.length, currentPage, itemsPerPage]);

  const paginatedItems = useMemo(
    () => items.slice(state.startIndex, state.endIndex),
    [items, state.startIndex, state.endIndex]
  );

  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, state.totalPages));
    setCurrentPage(validPage);
  };

  const nextPage = () => {
    goToPage(state.currentPage + 1);
  };

  const previousPage = () => {
    goToPage(state.currentPage - 1);
  };

  return {
    paginatedItems,
    currentPage: state.currentPage,
    totalPages: state.totalPages,
    goToPage,
    nextPage,
    previousPage,
    canGoPrevious: state.currentPage > 1,
    canGoNext: state.currentPage < state.totalPages,
    itemsPerPage: state.itemsPerPage,
    totalItems: items.length,
  };
}
