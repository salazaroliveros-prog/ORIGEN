/**
 * ORIGEN ERP - Accessibility Components & Utilities
 * Priority 5 Features:
 * - ARIA labels and semantic HTML
 * - Keyboard navigation (Tab, Enter, Escape)
 * - Color contrast validation (WCAG AA)
 * - Screen reader support
 * - Focus management
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle } from 'lucide-react';

// FEATURE 5.1: Color contrast checker (WCAG AA)
export function getContrastRatio(color1: string, color2: string): number {
  const getLuminance = (hex: string): number => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;

    const [rs, gs, bs] = [r, g, b].map((x) => {
      x = x / 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  export default AccessibilityExports;

  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

export function isWCAGAACompliant(contrast: number): boolean {
  return contrast >= 4.5; // 4.5:1 for normal text, 3:1 for large text
}

// FEATURE 5.2: Accessible Form Input
interface AccessibleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export function AccessibleInput({
  id,
  label,
  error,
  hint,
  required,
  'aria-label': ariaLabel,
  ...props
}: AccessibleInputProps) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  return (
    <div>
      <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && (
          <span className="ml-1 text-red-600" aria-label="required">
            *
          </span>
        )}
      </label>

      <input
        id={inputId}
        aria-label={ariaLabel || label}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={`${error ? errorId : ''} ${hint ? hintId : ''}`}
        className={`w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:outline-none ${
          error ? 'border-red-500 focus:ring-red-500' : 'border-slate-300'
        }`}
        {...props}
      />

      {hint && (
        <p id={hintId} className="mt-1 text-xs text-slate-600">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// FEATURE 5.2: Accessible Select
interface AccessibleSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
  error?: string;
  hint?: string;
  required?: boolean;
}

export function AccessibleSelect({
  id,
  label,
  options,
  error,
  hint,
  required,
  'aria-label': ariaLabel,
  ...props
}: AccessibleSelectProps) {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = `${selectId}-error`;
  const hintId = `${selectId}-hint`;

  return (
    <div>
      <label htmlFor={selectId} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && (
          <span className="ml-1 text-red-600" aria-label="required">
            *
          </span>
        )}
      </label>

      <select
        id={selectId}
        aria-label={ariaLabel || label}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={`${error ? errorId : ''} ${hint ? hintId : ''}`}
        className={`w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:outline-none ${
          error ? 'border-red-500 focus:ring-red-500' : 'border-slate-300'
        }`}
        {...props}
      >
        <option value="">Selecciona una opción</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {hint && (
        <p id={hintId} className="mt-1 text-xs text-slate-600">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// FEATURE 5.2: Accessible Button
interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  ariaLabel?: string;
  ariaPressed?: boolean;
}

export function AccessibleButton({
  children,
  ariaLabel,
  ariaPressed,
  className,
  ...props
}: AccessibleButtonProps) {
  return (
    <button
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      className={`rounded-lg px-4 py-2 font-semibold transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:outline-none ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// FEATURE 5.3: Skip to main content link
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:top-0 focus:left-0 focus:z-50 focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white"
    >
      Saltar al contenido principal
    </a>
  );
}

// FEATURE 5.2: Focus trap for modals
export function useFocusTrap(ref: React.RefObject<HTMLDivElement>) {
  useEffect(() => {
    const modal = ref.current;
    if (!modal) return;

    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    modal.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => modal.removeEventListener('keydown', handleKeyDown);
  }, [ref]);
}

// FEATURE 5.1: Accessible Alert
interface AccessibleAlertProps {
  variant: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  onClose?: () => void;
}

export function AccessibleAlert({ variant, title, message, onClose }: AccessibleAlertProps) {
  const variants = {
    info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: '✓' },
    success: { bg: 'bg-green-50', border: 'border-green-200', icon: '✓' },
    warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: '⚠' },
    error: { bg: 'bg-red-50', border: 'border-red-200', icon: '✕' },
  };

  const v = variants[variant];

  return (
    <div role="alert" className={`${v.bg} border ${v.border} flex gap-3 rounded-lg p-4`}>
      <div className="text-lg">{v.icon}</div>
      <div className="flex-1">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-700">{message}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Cerrar alerta"
          className="flex-shrink-0 focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 focus:outline-none"
        >
          ✕
        </button>
      )}
    </div>
  );
}

// FEATURE 5.2: Keyboard navigation helper
export function useKeyboardNavigation(items: string[], onSelect?: (index: number) => void) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return;

      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % items.length);
          break;
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          onSelect?.(selectedIndex);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [items.length, selectedIndex, onSelect]);

  return { selectedIndex, containerRef };
}

// FEATURE 5.1: Color contrast validator component
export function ContrastValidator() {
  const [color1, setColor1] = useState('#FFFFFF');
  const [color2, setColor2] = useState('#000000');

  const contrast = getContrastRatio(color1, color2);
  const isCompliant = isWCAGAACompliant(contrast);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="mb-3 text-sm font-semibold text-slate-900">Validador de Contraste WCAG AA</p>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-slate-700">Color de Fondo</label>
          <input
            type="color"
            value={color1}
            onChange={(e) => setColor1(e.target.value)}
            className="h-10 w-full cursor-pointer rounded"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-700">Color de Texto</label>
          <input
            type="color"
            value={color2}
            onChange={(e) => setColor2(e.target.value)}
            className="h-10 w-full cursor-pointer rounded"
          />
        </div>

        <div
          className="rounded p-4 text-center font-bold"
          style={{ backgroundColor: color1, color: color2 }}
        >
          Vista Previa del Texto
        </div>

        <div
          className={`flex items-start gap-2 rounded-lg p-3 ${
            isCompliant ? 'border border-green-200 bg-green-50' : 'border border-red-200 bg-red-50'
          }`}
        >
          <AlertCircle
            className={`mt-0.5 h-5 w-5 flex-shrink-0 ${
              isCompliant ? 'text-green-600' : 'text-red-600'
            }`}
          />
          <div className="text-sm">
            <p className="font-semibold text-slate-900">Contraste: {contrast.toFixed(2)}:1</p>
            <p className={isCompliant ? 'text-green-700' : 'text-red-700'}>
              {isCompliant
                ? '✓ Cumple con WCAG AA (4.5:1)'
                : '✕ No cumple con WCAG AA (requiere 4.5:1)'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Utility: Screen reader only text
export function ScreenReaderOnly({ children }: { children: React.ReactNode }) {
  return <span className="sr-only">{children}</span>;
}

const AccessibilityExports = {
  getContrastRatio,
  isWCAGAACompliant,
  AccessibleInput,
  AccessibleSelect,
  AccessibleButton,
  AccessibleAlert,
  SkipLink,
  useFocusTrap,
  useKeyboardNavigation,
  ContrastValidator,
  ScreenReaderOnly,
};
