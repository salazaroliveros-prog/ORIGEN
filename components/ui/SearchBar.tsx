'use client';

import React, { useState } from 'react';
import { Input } from './Input';
import { Button } from './Button';
import { useDebounce } from '@/lib/hooks/usePagination'; // reuse hook or create simple one

export interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  immediate?: boolean;
}

/****
 * SearchBar Component
 * Barra de búsqueda global para filtrar en tiempo real
 * en proyectos, empleados, clientes, etc.
 *****/

export function SearchBar({ placeholder = 'Buscar en ORIGEN ERP', onSearch, immediate = false }: SearchBarProps) {
  const [query, setQuery] = useState('');

  const debouncedQuery = useDebounce(query, 300, immediate);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    if (immediate) {
      onSearch(value);
    }
  };

  // Trigger on blur or enter if not immediate
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch(query);
    }
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      <Input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className="w-full pl-12 pr-4 py-2 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary focus:outline-none"
        aria-label="Buscar en ORIGEN ERP"
      />
    </div>
  );
}