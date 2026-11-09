'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center rounded-xl font-medium transition-transform transition-opacity duration-[200ms] ease-[cubic-bezier(0.4,0,0,0.2,1)] disabled:opacity-50 disabled:pointer-events-none touch-manipulation select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400';

  const variants = {
    primary:
      'bg-brand-primary text-slate-950 hover:bg-brand-primary-hover active:bg-brand-primary shadow-glow-brand',
    secondary:
      'bg-white/[0.08] border border-white/12 text-slate-100 hover:bg-white/[0.12] active:bg-white/[0.15] shadow-glass-sm',
    ghost: 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-200 active:bg-white/[0.1]',
    danger:
      'bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 hover:text-red-200 active:bg-red-500/30 shadow-glass-sm',
    outline:
      'border border-white/20 text-slate-300 hover:border-brand-secondary/60 hover:bg-white/[0.04] shadow-glass-sm',
    glass:
      'bg-white/[0.06] border border-white/12 backdrop-blur-md text-slate-100 hover:bg-white/[0.1] hover:border-brand-secondary/50 shadow-glass-md',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs min-h-[48px] sm:min-h-[44px]',
    md: 'px-4 py-2 text-sm min-h-[48px]',
    lg: 'px-6 py-3 text-base min-h-[52px]',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span className="sr-only">Cargando</span>
        </>
      ) : (
        leftIcon
      )}
      {children}
      {rightIcon}
    </button>
  );
}