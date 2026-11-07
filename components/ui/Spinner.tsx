'use client';

import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

const sizeStyles = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-[3px]',
  lg: 'h-12 w-12 border-4',
};

export function Spinner({ size = 'md', label = 'Cargando', className = '' }: SpinnerProps) {
  return (
    <span role="status" className={`inline-flex items-center justify-center ${className}`}>
      <span
        aria-hidden="true"
        className={`animate-spin rounded-full border-brand-secondary border-t-transparent ${sizeStyles[size]}`}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
