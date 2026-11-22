'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'glass';
  size?: 'sm' | 'md' | 'lg' | 'icon';
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
  type = 'button',
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-[200ms] ease-[cubic-bezier(0.4,0,0.2,1)] disabled:opacity-50 disabled:pointer-events-none touch-manipulation select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 active:scale-95';

  const variants = {
    primary:
      'bg-brand-400 text-neutral-900 hover:bg-brand-500 active:bg-brand-600 shadow-glow active:shadow-none',
    secondary:
      'bg-neutral-800/50 text-neutral-50 hover:bg-neutral-800/70 border border-neutral-700/50',
    ghost: 'text-neutral-300 hover:bg-neutral-800/30 hover:text-slate-50',
    danger:
      'bg-danger/20 text-danger-400 hover:bg-danger/30 hover:text-danger-200 border border-danger/30',
    outline:
      'border border-neutral-500 text-neutral-300 hover:border-secondary-400 hover:bg-white/[0.04]',
    glass:
      'bg-white/[0.05] border border-white/12 backdrop-blur-md text-neutral-900 hover:bg-white/[0.1] hover:border-brand-400/50 shadow-glass-md active:shadow-none',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs min-h-[44px] min-w-[44px]',
    md: 'px-4 py-2 text-sm min-h-[48px] min-w-[48px]',
    lg: 'px-6 py-3 text-base min-h-[52px] min-w-[52px]',
    icon: 'p-2 min-h-[44px] min-w-[44px]',
  };

  return (
    <button
      type={type}
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
