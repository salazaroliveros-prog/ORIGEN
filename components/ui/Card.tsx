'use client';

import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'flat' | 'outlined';
  onClick?: () => void;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
}

/**
 * CARD COMPONENT - Base Reutilizable
 * 
 * Usado en: Dashboard, Proyectos, Presupuestos, etc.
 * 
 * Variantes:
 * - default: Glass morphism (recomendado)
 * - elevated: Con sombra
 * - flat: Sin bordes
 * - outlined: Con borde visible
 */
export function Card({
  children,
  className = '',
  variant = 'default',
  onClick,
  hover = true,
  padding = 'md',
}: CardProps) {
  const baseStyles =
    'rounded-xl border transition-all duration-300 ease-out';

  const variants = {
    default:
      'bg-glass-l2-bg border-glass-l2-border backdrop-blur-xl shadow-glass-md hover:shadow-glass-lg hover:border-white/20',
    elevated:
      'bg-white/[0.08] border-white/10 shadow-lg hover:shadow-xl hover:border-white/20 hover:bg-white/[0.1]',
    flat:
      'bg-white/[0.05] border-transparent hover:bg-white/[0.08] hover:border-white/10',
    outlined:
      'bg-transparent border-white/20 hover:border-white/40 hover:bg-white/[0.02]',
  };

  const paddingStyles = {
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  const interactiveStyles = onClick && hover ? 'cursor-pointer' : '';
  const hoverScale = hover ? 'hover:scale-105 hover:-translate-y-1' : '';

  return (
    <div
      className={`${baseStyles} ${variants[variant]} ${paddingStyles[padding]} ${interactiveStyles} ${hoverScale} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onClick();
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}

/**
 * STAT CARD - Para KPIs y métricas
 * 
 * Features:
 * - Título + valor
 * - Cambio con indicador
 * - Icono opcional
 * - Colores por estado
 */
export interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'positive' | 'negative' | 'neutral';
    label: string;
  };
  icon?: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  onClick?: () => void;
  loading?: boolean;
}

export function StatCard({
  title,
  value,
  change,
  icon,
  color = 'primary',
  onClick,
  loading = false,
}: StatCardProps) {
  const colorStyles = {
    primary: 'bg-primary-500/20 ring-primary-500/30',
    success: 'bg-success-500/20 ring-success-500/30',
    warning: 'bg-warning-500/20 ring-warning-500/30',
    error: 'bg-danger-500/20 ring-danger-500/30',
    info: 'bg-info-500/20 ring-info-500/30',
  };

  const changeTypeStyles = {
    positive: 'text-success-300',
    negative: 'text-danger-300',
    neutral: 'text-slate-400',
  };

  return (
    <Card
      variant="elevated"
      padding="md"
      onClick={onClick}
      hover={!!onClick}
      className={colorStyles[color]}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {title}
          </p>
          <p className="text-2xl font-bold text-white sm:text-3xl">
            {loading ? '...' : value}
          </p>
          {change && (
            <p className={`text-xs font-medium ${changeTypeStyles[change.type]}`}>
              {change.label}
            </p>
          )}
        </div>
        {icon && (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/[0.1] text-slate-300 backdrop-blur-lg sm:h-14 sm:w-14">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

export default Card;
