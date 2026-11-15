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
  ...props
}: InputProps) {
  const isError = variant === 'error' || !!errorText;
  const isSuccess = variant === 'success';
  const isDisabled = variant === 'disabled' || disabled;

  const baseStyles =
    'w-full rounded-lg py-3 px-4 text-sm text-white transition-all duration-[200ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:border-brand-400 focus-visible:ring-brand-400/30 disabled:cursor-not-allowed';

  const variantStyles = {
    default: 'border border-neutral-600 bg-white/[0.03]',
    error: 'border border-danger-500/50 bg-danger/5 focus-visible:ring-danger-500/30 focus-visible:border-danger-500',
    success: 'border border-success-500/50 bg-success/5 focus-visible:ring-success-500/30 focus-visible:border-success-500',
    disabled: 'bg-neutral-900/20 text-neutral-500 cursor-not-allowed border border-neutral-700/30',
  };

  const sizeStyles = {
    sm: 'py-2 px-3 text-xs',
    md: 'py-3 px-4 text-sm',
    lg: 'py-3.5 px-4 text-base',
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          className="text-xs font-semibold text-slate-400 uppercase tracking-wider"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            {leftIcon}
          </div>
        )}
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
            {rightIcon}
          </div>
        )}
        <input
          className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[inputSize]} ${className}`}
          disabled={isDisabled}
          {...props}
        />
      </div>
      {errorText && (
        <p className="text-xs text-danger text-danger">{errorText}</p>
      )}
      {helperText && !errorText && (
        <p className="text-xs text-slate-500">{helperText}</p>
      )}
    </div>
  );
}
