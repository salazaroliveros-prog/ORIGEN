'use client';

import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
}

const variantStyles = {
  primary: 'bg-brand-primary/15 text-brand-primary border border-brand-primary/30',
  secondary: 'bg-brand-secondary/15 text-brand-secondary border border-brand-secondary/30',
  success: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  warning: 'bg-orange-500/15 text-orange-200 border border-orange-500/30',
  danger: 'bg-red-500/15 text-red-300 border border-red-500/30',
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
