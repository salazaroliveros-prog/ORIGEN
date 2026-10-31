'use client';

import React, { useId, useState, useCallback, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { designTokens } from '@/lib/design-tokens';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  leftIcon?: React.ReactNode;
  className?: string;
}

export function Select({
  label,
  error,
  helperText,
  options,
  leftIcon,
  className = '',
  id,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLSelectElement | null>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const closeMenu = useCallback(() => setIsOpen(false), []);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        closeMenu();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeMenu]);

  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold tracking-wider text-slate-400 uppercase"
        >
          {label}
        </label>
      )}
      <div className="relative group">
        {leftIcon && (
          <div className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500">
            {leftIcon}
          </div>
        )}
        <select
          id={inputId}
          ref={triggerRef}
          onBlur={closeMenu}
          className={`focus:ring-brand-secondary/50 w-full rounded-lg border bg-white/[0.03] px-3 py-2.5 text-sm transition-all focus:border-transparent focus:ring-2 focus:outline-none cursor-pointer appearance-none ${error ? 'border-red-500 focus:ring-red-500/50' : 'border-white/10 focus:border-white/30'} ${className}`}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className={`absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} text-slate-400 group-hover:text-slate-300 pointer-events-none`}
        />
      </div>
      {error && <p className="text-[10px] text-red-400">{error}</p>}
      {helperText && !error && <p className="text-[10px] text-slate-500">{helperText}</p>}
    </div>
  );
}