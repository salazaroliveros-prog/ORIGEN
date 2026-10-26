'use client';

import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'elevated' | 'subtle' | 'overlay';
  padding?: 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

export function Card({
  variant = 'elevated',
  padding = 'md',
  hoverable = false,
  className = '',
  children,
  ...props
}: CardProps) {
  const variants = {
    elevated: 'bg-white/[0.05] border border-white/10 shadow-lg',
    subtle: 'bg-white/[0.03] border border-white/10 shadow-sm',
    overlay: 'bg-white/[0.12] border border-white/25 shadow-xl',
  };

  const paddings = {
    sm: 'p-3',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={`rounded-xl transition-all duration-200 ${variants[variant]} ${paddings[padding]} ${hoverable ? 'hover:border-white/20 hover:shadow-xl' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
