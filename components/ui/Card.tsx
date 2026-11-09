'use client';

import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'elevated' | 'subtle' | 'overlay' | 'glass-l1' | 'glass-l2' | 'glass-l3';
  padding?: 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

export function Card({
  variant = 'glass-l2',
  padding = 'md',
  hoverable = false,
  className = '',
  children,
  ...props
}: CardProps) {
  const variants = {
    elevated: 'bg-surface-elevated border border-border-strong shadow-glass-lg',
    subtle: 'bg-surface-subtle border border-border-weak shadow-glass-sm',
    overlay: 'bg-surface-overlay border border-border-strong shadow-glass-xl',
    'glass-l1': 'bg-glass-l1-bg border border-glass-l1-border backdrop-blur-sm shadow-glass-sm',
    'glass-l2': 'bg-glass-l2-bg border border-glass-l2-border backdrop-blur-md shadow-glass-md',
    'glass-l3': 'bg-glass-l3-bg border border-glass-l3-border backdrop-blur-lg shadow-glass-lg',
  };

  const paddings = {
    sm: 'p-3',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={`rounded-2xl transition duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${variants[variant]} ${paddings[padding]} ${hoverable ? 'hover:border-brand-secondary/50 hover:bg-white/[0.12] hover:shadow-glass-lg' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
