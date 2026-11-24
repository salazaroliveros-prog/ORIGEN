'use client';

import React, { ReactNode } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'textarea' | 'select' | 'checkbox';
  value?: string | number | boolean;
  onChange?: (value: string | number | boolean) => void;
  onBlur?: () => void;
  placeholder?: string;
  description?: string;
  error?: string;
  success?: boolean;
  disabled?: boolean;
  required?: boolean;
  children?: ReactNode; // Para select options
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * FORM FIELD COMPONENT - Base Reutilizable
 *
 * Features:
 * - Label + Input + Description
 * - Validation inline
 * - Error messages
 * - Success indicator
 * - Disabled state
 * - Required indicator
 * - Accessible (WCAG 2.1 AA)
 *
 * Usado en: Proyectos, Presupuestos, Personal, Gastos, etc.
 */
export function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  description,
  error,
  success,
  disabled = false,
  required = false,
  children,
  className = '',
  size = 'md',
}: FormFieldProps) {
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-3 text-base',
  };

  const baseInputStyles = `
    w-full rounded-lg border transition-all duration-200
    bg-white/[0.05] text-white placeholder-slate-500
    focus:outline-none focus:ring-2 focus:ring-offset-0
    disabled:opacity-50 disabled:cursor-not-allowed
    ${sizeStyles[size]}
  `;

  const borderStyles = error
    ? 'border-danger-500/50 focus:border-danger-500 focus:ring-danger-500/30'
    : success
      ? 'border-success-500/50 focus:border-success-500 focus:ring-success-500/30'
      : 'border-white/10 focus:border-primary-500 focus:ring-primary-500/30';

  const inputClassName = `${baseInputStyles} ${borderStyles} ${className}`;

  return (
    <div className="space-y-2">
      {/* Label */}
      <label htmlFor={name} className="block text-sm font-medium text-white">
        {label}
        {required && (
          <span className="ml-1 text-danger-500" aria-label="requerido">
            *
          </span>
        )}
      </label>

      {/* Input Container */}
      <div className="relative">
        {type === 'textarea' ? (
          <textarea
            id={name}
            name={name}
            value={value as string}
            onChange={(e) => onChange?.(e.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            className={`${inputClassName} min-h-[100px] resize-none`}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${name}-error` : description ? `${name}-description` : undefined
            }
          />
        ) : type === 'select' ? (
          <select
            id={name}
            name={name}
            value={value as string}
            onChange={(e) => onChange?.(e.target.value)}
            onBlur={onBlur}
            disabled={disabled}
            className={inputClassName}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${name}-error` : description ? `${name}-description` : undefined
            }
          >
            <option value="">Selecciona una opción</option>
            {children}
          </select>
        ) : type === 'checkbox' ? (
          <input
            id={name}
            type="checkbox"
            name={name}
            checked={value as boolean}
            onChange={(e) => onChange?.(e.target.checked)}
            onBlur={onBlur}
            disabled={disabled}
            className="h-5 w-5 rounded border-white/20 bg-white/[0.05] text-primary-500 focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
            aria-invalid={!!error}
          />
        ) : (
          <input
            id={name}
            type={type}
            name={name}
            value={value as string | number}
            onChange={(e) =>
              onChange?.(type === 'number' ? parseFloat(e.target.value) : e.target.value)
            }
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            className={inputClassName}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${name}-error` : description ? `${name}-description` : undefined
            }
          />
        )}

        {/* Success Indicator */}
        {success && !error && (
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
            <CheckCircle2 className="h-5 w-5 text-success-500" aria-hidden="true" />
          </div>
        )}

        {/* Error Indicator */}
        {error && (
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
            <AlertCircle className="h-5 w-5 text-danger-500" aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Description or Error Message */}
      {error ? (
        <p
          id={`${name}-error`}
          className="flex items-center gap-1 text-xs text-danger-400"
          role="alert"
        >
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      ) : description ? (
        <p id={`${name}-description`} className="text-xs text-slate-400">
          {description}
        </p>
      ) : null}
    </div>
  );
}

/**
 * FORM - Contenedor reutilizable
 */
export interface FormProps {
  onSubmit: (e: React.FormEvent) => void;
  children: ReactNode;
  className?: string;
}

export function Form({ onSubmit, children, className = '' }: FormProps) {
  return (
    <form onSubmit={onSubmit} className={`space-y-6 ${className}`} noValidate>
      {children}
    </form>
  );
}

export default FormField;
