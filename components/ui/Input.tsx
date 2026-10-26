'use client';

import React, { useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Input({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className = '',
  id,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

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
      <div className="relative">
        {leftIcon && (
          <div className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500">
            {leftIcon}
          </div>
        )}
        {rightIcon && (
          <div className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-500">
            {rightIcon}
          </div>
        )}
        <input
          id={inputId}
          className={`focus:ring-brand-secondary/50 w-full rounded-lg border bg-white/[0.03] px-3 py-2.5 text-sm placeholder-slate-500 transition-all focus:border-transparent focus:ring-2 focus:outline-none ${error ? 'border-red-500 focus:ring-red-500/50' : 'border-white/10 focus:border-white/30'} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-[10px] text-red-400">{error}</p>}
      {helperText && !error && <p className="text-[10px] text-slate-500">{helperText}</p>}
    </div>
  );
}
