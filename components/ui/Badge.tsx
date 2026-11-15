'use client';

import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
}

const variantStyles = {
  primary: 'bg-brand-400/20 text-brand-700 border border-brand-400/30',
  secondary: 'bg-secondary-400/20 text-secondary-700 border border-secondary-400/30',
  success: 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/30',
  warning: 'bg-orange-500/15 text-orange-700 border border-orange-500/30',
  danger: 'bg-red-500/15 text-red-700 border border-red-500/30',
};

const sizeStyles = {
  sm: 'text-[10px] px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
};

export function Badge({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-bold backdrop-blur-sm ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
