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
      <div className="relative">
        {leftIcon && (
          <div
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            aria-hidden="true"
          >
            {leftIcon}
          </div>
        )}
        {rightIcon && (
          <div
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            aria-hidden="true"
          >
            {rightIcon}
          </div>
        )}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || helperText ? messageId : undefined}
          className={`w-full rounded-lg border bg-white/[0.03] px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition duration-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-secondary/50 ${leftIcon ? 'pl-9' : ''} ${rightIcon ? 'pr-9' : ''} ${error ? 'border-red-500 focus:ring-red-500/50' : 'border-white/10 focus:border-white/30'} ${className}`}
          {...props}
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
