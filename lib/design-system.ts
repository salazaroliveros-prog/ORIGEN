/**
 * ORIGEN ERP - Design System Tokens
 * Sistema unificado de diseño para Desktop y Mobile
 * Basado en principios de diseño moderno: neumorfismo sutil, glassmorphism,
 * microinteracciones, y accesibilidad móvil (WCAG 2.1 AA)
 */

import type { CSSProperties } from 'react';

/* ============================================================
   COLORS - Paleta moderna con semántica clara
   ============================================================ */
export const colors = {
  // Brand - ORIGEN Azul Profundo / Ámbar Construcción
  brand: {
    50: '#fef3c7',
    100: '#fde68a',
    200: '#fcd34d',
    300: '#fbbf24',
    400: '#f59e0b',   // Primary - Ámbar construcción
    500: '#d97706',   // Hover
    600: '#b45309',   // Active
    700: '#92400e',
    800: '#78350f',
    900: '#451a03',
    glow: 'rgba(245, 158, 11, 0.4)',
    glowWeak: 'rgba(245, 158, 11, 0.15)',
  },
  secondary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#93c5fd',
    400: '#38bdf8',   // Secondary - Cielo construction
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
    glow: 'rgba(56, 189, 248, 0.3)',
    glowWeak: 'rgba(56, 189, 248, 0.1)',
  },
  // Semantic
  success: {
    base: '#10b981',
    bg: 'rgba(16, 185, 129, 0.15)',
    border: 'rgba(16, 185, 129, 0.25)',
    text: '#10b981',
  },
  warning: {
    base: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.15)',
    border: 'rgba(245, 158, 11, 0.25)',
    text: '#f59e0b',
  },
  danger: {
    base: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.1)',
    border: 'rgba(239, 68, 68, 0.2)',
    text: '#fca5a5',
  },
  info: {
    base: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.15)',
    border: 'rgba(59, 130, 246, 0.2)',
    text: '#3b82f6',
  },
  // Neutral (Dark theme base)
  neutral: {
    0: '#ffffff',
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
    1000: '#02020a',
  },
  // Surface / Elevation
  surface: {
    // Glassmorphism layers
    glassL1: 'rgba(255, 255, 255, 0.04)',
    glassL2: 'rgba(255, 255, 255, 0.06)',
    glassL3: 'rgba(255, 255, 255, 0.08)',
    glassL4: 'rgba(255, 255, 255, 0.12)',
    // Solid surfaces
    card: 'rgba(30, 41, 59, 0.6)',
    cardHover: 'rgba(30, 41, 59, 0.75)',
    elevated: 'rgba(30, 41, 59, 0.85)',
    modal: 'rgba(15, 23, 42, 0.88)',
    overlay: 'rgba(0, 0, 0, 0.4)',
    input: 'rgba(255, 255, 255, 0.03)',
    inputHover: 'rgba(255, 255, 255, 0.05)',
    inputFocus: 'rgba(255, 255, 255, 0.08)',
  },
} as const;

/* ============================================================
   TYPOGRAPHY - Tipografía moderna y legible
   ============================================================ */
export const typography = {
  fontFamily: {
    sans: 'var(--font-geist), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  },
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem', letterSpacing: '-0.01em' }],
    sm: ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '-0.01em' }],
    base: ['1rem', { lineHeight: '1.5rem', letterSpacing: '-0.01em' }],
    lg: ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
    xl: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
    '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.02em' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.02em' }],
    '5xl': ['3rem', { lineHeight: '3.25rem', letterSpacing: '-0.02em' }],
  },
  fontWeight: {
    thin: '300',
    light: '400',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
} as const;

/* ============================================================
   SPACING - Sistema de espaciado modular
   ============================================================ */
export const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '0.75rem',   // 12px
  lg: '1rem',      // 16px
  xl: '1.25rem',   // 20px
  '2xl': '1.5rem', // 24px
  '3xl': '2rem',   // 32px
  '4xl': '2.5rem', // 40px
  '5xl': '3rem',   // 48px
  '6xl': '3.5rem', // 56px
  '7xl': '4rem',   // 64px
} as const;

/* ============================================================
   BORDER RADIUS - Radio consistente
   ============================================================ */
export const radius = {
  none: '0',
  sm: '0.375rem',   // 6px
  md: '0.5rem',     // 8px
  lg: '0.75rem',    // 12px
  xl: '1rem',       // 16px
  '2xl': '1.25rem', // 20px
  '3xl': '1.5rem',  // 24px
  full: '9999px',
} as const;

/* ============================================================
   SHADOWS - Sombras con profundidad
   ============================================================ */
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  glow: '0 0 20px rgba(245, 158, 11, 0.4)',
  glowSoft: '0 0 20px rgba(245, 158, 11, 0.15)',
  glowSecondary: '0 0 15px rgba(56, 189, 248, 0.3)',
  inner: 'inset 0 2px 4px rgb(0 0 0 / 0.05)',
} as const;

/* ============================================================
   TRANSITIONS - Microinteracciones fluidas
   ============================================================ */
export const transitions = {
  instant: '0ms',
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  normal: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  slower: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: '300ms cubic-bezier(0.68, -0.55, 0.27, 1.55)',
  elastic: '400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

/* ============================================================
   TOUCH - Accesibilidad móvil (WCAG 2.1 AA)
   ============================================================ */
export const touch = {
  minSize: '48px',      // Mínimo 48px para accesibilidad táctil
  minSizeComfortable: '56px', // Tamaño cómodo para dedo
  tapTarget: '44px',    // Mínimo Apple HIG
} as const;

/* ============================================================
   BREAKPOINTS - Responsive design
   ============================================================ */
export const breakpoints = {
  xs: '320px',    // Móvil pequeño
  sm: '640px',    // Móvil grande / Tablet pequeña
  md: '768px',    // Tablet
  lg: '1024px',   // Laptop pequeña
  xl: '1280px',   // Desktop
  '2xl': '1536px', // Desktop grande
} as const;

/* ============================================================
   Z-INDEX - Capas de apilamiento
   ============================================================ */
export const zIndex = {
  hide: -1,
  base: 0,
  docked: 10,
  dropdown: 100,
  sticky: 200,
  modal: 300,
  popover: 400,
  toast: 500,
  tooltip: 600,
} as const;

/* ============================================================
   ANIMATIONS - Microinteracciones
   ============================================================ */
export const animations = {
  fadeIn: 'fadeIn 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  fadeOut: 'fadeOut 150ms cubic-bezier(0.4, 0, 0.2, 1)',
  slideInUp: 'slideInUp 300ms cubic-bezier(0.4, 0, 0.2, 1)',
  slideInDown: 'slideInDown 300ms cubic-bezier(0.4, 0, 0.2, 1)',
  slideInRight: 'slideInRight 300ms cubic-bezier(0.4, 0, 0.2, 1)',
  slideOutRight: 'slideOutRight 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  scaleIn: 'scaleIn 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
  bounce: 'bounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

/* ============================================================
   COMPONENT VARIANTS - Variantes predefinidas
   ============================================================ */
export const variants = {
  button: {
    primary: 'bg-brand-400 text-neutral-900 hover:bg-brand-500 active:bg-brand-600 shadow-glow',
    secondary: 'bg-neutral-800/50 text-neutral-50 hover:bg-neutral-800/70 border border-neutral-700/50',
    ghost: 'text-neutral-400 hover:bg-neutral-800/30 hover:text-neutral-50',
    danger: 'bg-danger/20 text-danger-300 hover:bg-danger/30 hover:text-danger-100 border border-danger/30',
    outline: 'border border-neutral-600 text-neutral-300 hover:border-secondary-400 hover:bg-white/[0.04]',
    glass: 'bg-white/[0.05] border border-white/12 backdrop-blur-md text-neutral-900 hover:bg-white/[0.1] shadow-glass-md',
    link: 'text-secondary-400 hover:text-secondary-300 underline-offset-4 hover:underline',
  },
  card: {
    base: 'rounded-xl border border-white/10 bg-white/[0.05] backdrop-blur-md shadow-lg',
    elevated: 'rounded-xl border border-white/15 bg-white/[0.08] backdrop-blur-lg shadow-xl',
    interactive: 'rounded-xl border border-white/10 bg-white/[0.05] backdrop-blur-md shadow-lg hover:border-brand-400/50 hover:shadow-glowSoft transition-all',
    glass: 'rounded-xl border border-white/15 bg-white/[0.08] backdrop-blur-lg shadow-xl',
  },
  input: {
    base: 'w-full rounded-lg border border-neutral-600 bg-white/[0.03] text-neutral-50 py-3 px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-400 focus-visible:border-secondary-400 transition-all',
    error: 'border-danger-500/50 focus-visible:ring-danger-500 focus-visible:border-danger-500',
    success: 'border-success-500/50 focus-visible:ring-success-500 focus-visible:border-success-500',
    disabled: 'bg-neutral-900/20 text-neutral-500 cursor-not-allowed',
  },
  badge: {
    default: 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
    primary: 'bg-brand-400/20 text-brand-400 border border-brand-400/30',
    secondary: 'bg-secondary-400/20 text-secondary-400 border border-secondary-400/30',
    success: 'bg-success/20 text-success border border-success/30',
    warning: 'bg-warning/20 text-warning border border-warning/30',
    danger: 'bg-danger/20 text-danger border border-danger/30',
    neutral: 'bg-neutral-800/50 text-neutral-300 border border-neutral-600/50',
  },
} as const;

/* ============================================================
   MOBILE-SPECIFIC - Estilos específicos móvil
   ============================================================ */
export const mobile = {
  // Bottom navigation
  bottomNavHeight: '72px',
  bottomNavItemHeight: '56px',
  bottomNavItemWidth: '72px',
  // Sheet/Drawer
  sheetBackdropBlur: '20px',
  sheetCornerRadius: '1.5rem',
  sheetHandleHeight: '4px',
  sheetHandleWidth: '36px',
  // Touch feedback
  activeOpacity: '0.85',
  activeScale: '0.95',
  rippleDuration: '600ms',
} as const;

export type DesignTokens = typeof colors & typeof typography & typeof spacing & typeof radius & typeof shadows & typeof transitions & typeof touch & typeof breakpoints & typeof zIndex & typeof animations & typeof variants & typeof mobile;

export default {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  transitions,
  touch,
  breakpoints,
  zIndex,
  animations,
  variants,
  mobile,
};
