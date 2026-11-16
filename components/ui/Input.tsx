'use client';

import React from 'react';

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
  ...props
}: InputProps) {
  const inputId = props.id ?? React.useId();
  const isError = variant === 'error' || !!errorText;
  const isSuccess = variant === 'success';
  const isDisabled = variant === 'disabled' || disabled;
  const isLight = formTheme === 'light';

  const baseStyles =
    'w-full rounded-lg py-3 px-4 text-sm transition-all duration-[200ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/30 disabled:cursor-not-allowed';

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

  const sizeStyles = {
    sm: 'py-2 px-3 text-xs',
    md: 'py-3 px-4 text-sm',
    lg: 'py-3.5 px-4 text-base',
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
          <div className={`absolute left-3 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>{leftIcon}</div>
        )}
        {rightIcon && (
          <div className={`absolute right-3 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>{rightIcon}</div>
        )}
        <input
          id={inputId}
          className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[inputSize]} ${className}`}
          disabled={isDisabled}
          {...props}
        />
      </div>
      {errorText && <p className="text-danger text-danger text-xs">{errorText}</p>}
      {helperText && !errorText && <p className={helperStyles}>{helperText}</p>}
    </div>
  );
}
