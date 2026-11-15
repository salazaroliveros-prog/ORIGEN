'use client';

import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'base' | 'elevated' | 'interactive' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hoverable?: boolean;
}

export function Card({
  variant = 'base',
  padding = 'md',
  hoverable = false,
  className = '',
  children,
  ...props
}: CardProps) {
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
  };

  const variantClasses = {
    base: 'rounded-xl border border-white/10 bg-white/[0.05] backdrop-blur-md shadow-lg',
    elevated: 'rounded-xl border border-white/15 bg-white/[0.08] backdrop-blur-lg shadow-xl',
    interactive: 'rounded-xl border border-white/10 bg-white/[0.05] backdrop-blur-md shadow-lg hover:border-brand-400/50 hover:shadow-glow-soft transition-all',
    glass: 'rounded-xl border border-white/15 bg-white/[0.08] backdrop-blur-lg shadow-xl',
  };

  return (
    <div
      className={`${variantClasses[variant]} ${paddingClasses[padding]} ${hoverable ? 'transition-all duration-[200ms] hover:-translate-y-1 hover:shadow-glow' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function CardHeader({ className = '', ...props }: CardHeaderProps) {
  return (
    <div
      className={`flex flex-col space-y-1.5 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  className?: string;
}

export function CardTitle({ className = '', ...props }: CardTitleProps) {
  return (
    <h3
      className={`text-lg font-bold text-white tracking-tight ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
}

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  className?: string;
}

export function CardDescription({ className = '', ...props }: CardDescriptionProps) {
  return (
    <p
      className={`text-sm text-slate-400 ${className}`}
      {...props}
    >
      {children}
    </p>
  );
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function CardContent({ className = '', ...props }: CardContentProps) {
  return (
    <div
      className={`mt-4 space-y-2 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function CardFooter({ className = '', ...props }: CardFooterProps) {
  return (
    <div
      className={`mt-6 flex items-center gap-3 border-t border-white/10 pt-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
