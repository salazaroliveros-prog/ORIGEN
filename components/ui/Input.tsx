'use client';

import React, { useId } from 'react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: 'default' | 'error' | 'success' | 'disabled';
  inputSize?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  label?: string;
  helperText?: string;
  errorText?: string;
  /** Tema de colores: 'dark' (fondo oscuro, default) o 'light' (fondo claro) */
  formTheme?: 'dark' | 'light';
}

export function Input({
  variant = 'default',
  inputSize = 'md',
  leftIcon,
  rightIcon,
  label,
  helperText,
  errorText,
  className = '',
  disabled,
  formTheme = 'dark',
  id,
  'aria-describedby': ariaDescribedBy,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? `input-${generatedId}`;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;
  const describedBy = errorText ? errorId : helperText ? helperId : ariaDescribedBy;
  const isError = variant === 'error' || !!errorText;
  const isSuccess = variant === 'success';
  const isDisabled = variant === 'disabled' || disabled;
  const isLight = formTheme === 'light';

  // ✅ CORRECCIÓN: baseStyles con text-base para iOS (16px) + font-size en input evita zoom
  const baseStyles =
    'w-full rounded-lg py-3 px-4 text-base md:text-sm transition-all duration-[200ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/30 disabled:cursor-not-allowed font-size-base';

  const variantStyles = {
    default: isLight
      ? 'border border-slate-300 bg-slate-50 text-slate-900 focus-visible:border-brand-400'
      : 'border border-neutral-600 bg-white/[0.03] text-white focus-visible:border-brand-400',
    error: isLight
      ? 'border border-red-500/50 bg-red-50 text-slate-900 focus-visible:ring-red-500/30 focus-visible:border-red-500'
      : 'border border-danger-500/50 bg-danger/5 focus-visible:ring-danger-500/30 focus-visible:border-danger-500',
    success: isLight
      ? 'border border-emerald-500/50 bg-emerald-50 text-slate-900 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500'
      : 'border border-success-500/50 bg-success/5 focus-visible:ring-success-500/30 focus-visible:border-success-500',
    disabled: isLight
      ? 'bg-slate-100 text-slate-500 cursor-not-allowed border border-slate-200/30'
      : 'bg-neutral-900/20 text-neutral-500 cursor-not-allowed border border-neutral-700/30',
  };

  // ✅ CORRECCIÓN: Todos los tamaños ahora usan text-base mínimo en mobile
  const sizeStyles = {
    sm: 'py-2 px-3 text-base md:text-xs', // 16px mobile
    md: 'py-3 px-4 text-base md:text-sm', // 16px mobile
    lg: 'py-3.5 px-4 text-base md:text-lg', // 16px mobile
  };

  const labelStyles = isLight
    ? 'text-xs font-semibold uppercase tracking-wider text-slate-700'
    : 'text-xs font-semibold uppercase tracking-wider text-slate-300';

  const helperStyles = isLight ? 'text-xs text-slate-500' : 'text-xs text-slate-400';

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className={labelStyles}>
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div
            className={`absolute left-3 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}
          >
            {leftIcon}
          </div>
        )}
        {rightIcon && (
          <div
            className={`absolute right-3 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}
          >
            {rightIcon}
          </div>
        )}
        <input
          id={inputId}
          // ✅ CORRECCIÓN: font-size 16px inline para iOS (garantizado)
          style={{ fontSize: '16px' }}
          className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[inputSize]} ${className}`}
          disabled={isDisabled}
          aria-invalid={isError || undefined}
          aria-describedby={describedBy}
          {...props}
        />
      </div>
      {errorText && (
        <p id={errorId} className="text-xs text-danger">
          {errorText}
        </p>
      )}
      {helperText && !errorText && (
        <p id={helperId} className={helperStyles}>
          {helperText}
        </p>
      )}
    </div>
  );
}
