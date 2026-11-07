'use client';

import React, { useId } from 'react';
import { ChevronDown } from 'lucide-react';

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
  const messageId = `${inputId}-message`;

  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400"
        >
          {label}
        </label>
      )}
      <div className="group relative">
        {leftIcon && (
          <div className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500">
            {leftIcon}
          </div>
        )}
        <select
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || helperText ? messageId : undefined}
          className={`w-full cursor-pointer appearance-none rounded-lg border bg-white/[0.03] px-3 py-2.5 text-sm text-slate-100 transition-all duration-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-secondary/50 ${leftIcon ? 'pl-9' : ''} ${error ? 'border-red-500 focus:ring-red-500/50' : 'border-white/10 focus:border-white/30'} ${className}`}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors duration-300 group-hover:text-slate-300"
          aria-hidden="true"
        />
      </div>
      {error ? (
        <p id={messageId} className="text-xs text-red-400">
          {error}
        </p>
      ) : (
        helperText && (
          <p id={messageId} className="text-xs text-slate-500">
            {helperText}
          </p>
        )
      )}
    </div>
  );
}
