// Design Tokens - Sistema de diseño centralizado para ORIGEN ConstructERP
// Basado en principios de design-to-code para consistencia visual

export const designTokens = {
  // Colores - Paleta principal
  colors: {
    // Brand colors
    brand: {
      primary: '#f59e0b',      // amber-500
      primaryHover: '#d97706', // amber-600
      primaryActive: '#b45309', // amber-700
      primaryGlow: 'rgba(245, 158, 11, 0.4)',
    },
    secondary: {
      base: '#06b6d4',         // sky-500
      hover: '#0891b2',        // sky-600
      glow: 'rgba(6, 182, 212, 0.3)',
    },
    // Semantic colors
    success: {
      base: '#10b981',         // emerald-500
      bg: 'rgba(16, 185, 129, 0.2)',
      border: 'rgba(16, 185, 129, 0.3)',
    },
    warning: {
      base: '#f59e0b',         // amber-500
      bg: 'rgba(245, 158, 11, 0.2)',
      border: 'rgba(245, 158, 11, 0.3)',
    },
    danger: {
      base: '#ef4444',         // red-500
      bg: 'rgba(239, 68, 68, 0.1)',
      border: 'rgba(239, 68, 68, 0.3)',
      text: '#fca5a5',         // red-300
    },
    // Neutral colors (dark theme)
    neutral: {
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
    },
  },

  // Espaciado
  spacing: {
    xs: '0.5rem',    // 8px
    sm: '0.75rem',   // 12px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
  },

  // Tipografía
  typography: {
    fontFamily: {
      sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      mono: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.125rem', { lineHeight: '1.75rem' }],
      xl: ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },

  // Border radius
  radius: {
    sm: '0.375rem',  // 6px
    md: '0.625rem',  // 10px
    lg: '0.875rem',  // 14px
    xl: '1rem',      // 16px
    full: '9999px',
  },

  // Sombras
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    glow: '0 0 20px rgba(245, 158, 11, 0.4)',
  },

  // Transiciones
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // Touch targets (accesibilidad móvil)
  touch: {
    minSize: '44px',  // Mínimo 44px para accesibilidad táctil
  },
} as const;

// Helper para obtener colores con opacidad
export function getColorWithOpacity(color: string, opacity: number): string {
  // Convierte hex a rgba
  const hex = color.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// Export types for TypeScript
export type DesignTokens = typeof designTokens;