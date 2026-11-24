/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './features/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ========== PALETA PRIMARIA PROFESIONAL (Sky - Confianza) ==========
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',   // PRIMARY - Acción principal
          600: '#0284c7',   // Hover
          700: '#0369a1',   // Active
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        
        // ========== SECUNDARIA (Amber - Alertas, energía) ==========
        accent: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',   // ACCENT - Alertas
          600: '#d97706',   // Hover
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },

        // ========== ESTADOS SEMÁNTICOS ==========
        success: {
          DEFAULT: '#10b981',
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',   // Completado, éxito
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },

        warning: {
          DEFAULT: '#f59e0b',
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',   // Pendiente, advertencia
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },

        danger: {
          DEFAULT: '#ef4444',
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',   // Error, rechazo
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },

        info: {
          DEFAULT: '#3b82f6',
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',   // Información
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },

        rejected: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',   // Rechazado
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
          950: '#3f0f5c',
        },

        // ========== CAPAS DE FONDO ==========
        'bg-primary': '#0f172a',      // Deep black - Base
        'bg-secondary': '#1e293b',    // Elevated - Cards
        'bg-tertiary': '#334155',     // Surface - Inputs

        // ========== BRAND (LEGACY - para compatibilidad) ==========
        brand: {
          primary: '#0ea5e9',         // Cambio de primario a Sky
          'primary-hover': '#0284c7',
          'primary-glow': 'rgba(14, 165, 233, 0.35)',
          secondary: '#38bdf8',
          'secondary-hover': '#0ea5e9',
          'secondary-glow': 'rgba(56, 189, 248, 0.3)',
          'on-brand': '#0f172a',
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },

        secondary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },

        action: {
          primary: '#10b981',
          'primary-hover': '#059669',
          danger: '#ef4444',
          'danger-hover': '#dc2626',
          warning: '#f59e0b',
          info: '#3b82f6',
        },

        surface: {
          elevated: 'rgba(255, 255, 255, 0.08)',
          subtle: 'rgba(255, 255, 255, 0.04)',
          overlay: 'rgba(255, 255, 255, 0.10)',
          input: 'rgba(255, 255, 255, 0.05)',
        },

        text: {
          primary: '#f8fafc',
          secondary: 'rgba(248, 250, 252, 0.75)',
          muted: 'rgba(248, 250, 252, 0.5)',
          inverse: '#0f172a',
        },

        border: {
          strong: 'rgba(255, 255, 255, 0.18)',
          weak: 'rgba(255, 255, 255, 0.08)',
          focus: 'rgba(14, 165, 233, 0.5)',      // Sky focus
          brand: 'rgba(14, 165, 233, 0.4)',      // Sky brand
        },

        deep: '#0f172a',

        bg: {
          deep: '#0f172a',
          ambient:
            'radial-gradient(circle at top right, #1e293b, #0f172a), radial-gradient(circle at bottom left, #1e1b4b, #0f172a)',
          mesh: 'radial-gradient(circle at 25% 25%, rgba(14, 165, 233, 0.12), transparent 50%), radial-gradient(circle at 75% 75%, rgba(248, 113, 113, 0.08), transparent 50%)',
        },

        glass: {
          'l1-bg': 'rgba(255, 255, 255, 0.05)',
          'l1-border': 'rgba(255, 255, 255, 0.1)',
          'l1-shadow': '0 8px 32px 0 rgba(0, 0, 0, 0.35)',
          'l2-bg': 'rgba(255, 255, 255, 0.08)',
          'l2-border': 'rgba(255, 255, 255, 0.15)',
          'l2-shadow': '0 12px 40px 0 rgba(0, 0, 0, 0.4)',
          'l3-bg': 'rgba(255, 255, 255, 0.12)',
          'l3-border': 'rgba(255, 255, 255, 0.25)',
          'l3-shadow': '0 16px 48px 0 rgba(0, 0, 0, 0.45)',
        },
      },

      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem', letterSpacing: '-0.01em' }],
        sm: ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '-0.01em' }],
        base: ['1rem', { lineHeight: '1.5rem', letterSpacing: '-0.01em' }],
        lg: ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
        xl: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.02em' }],
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.02em' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.02em' }],
        '5xl': ['3rem', { lineHeight: '1', letterSpacing: '-0.03em' }],
        '10px': ['0.625rem', { lineHeight: '0.75rem' }],
        '11px': ['0.6875rem', { lineHeight: '0.875rem' }],
        '13px': ['0.8125rem', { lineHeight: '1.125rem' }],
      },

      fontFamily: {
        sans: ['var(--font-geist)', 'Geist', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'Geist Mono', 'ui-monospace', 'monospace'],
      },

      spacing: {
        1: '0.25rem',
        2: '0.5rem',
        3: '0.75rem',
        4: '1rem',
        5: '1.25rem',
        6: '1.5rem',
        8: '2rem',
        10: '2.5rem',
        12: '3rem',
        16: '4rem',
        20: '5rem',
        24: '6rem',
      },

      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '32px',
        full: '9999px',
      },

      boxShadow: {
        xs: '0 1px 2px rgba(0, 0, 0, 0.05)',
        '2xs': '0 1px 1px rgba(0, 0, 0, 0.04)',
        sm: '0 1px 2px rgba(0, 0, 0, 0.1)',
        md: '0 4px 6px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 25px rgba(0, 0, 0, 0.15)',
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.35)',
        glow: '0 0 20px rgba(14, 165, 233, 0.4)',           // Sky glow
        'glow-brand': '0 0 24px rgba(14, 165, 233, 0.35)',  // Sky brand glow
        'glass-sm': '0 4px 16px 0 rgba(0, 0, 0, 0.3)',
        'glass-md': '0 8px 32px 0 rgba(0, 0, 0, 0.35)',
        'glass-lg': '0 12px 40px 0 rgba(0, 0, 0, 0.4)',
        'glass-xl': '0 16px 48px 0 rgba(0, 0, 0, 0.45)',
        inner: 'inset 0 1px 2px rgba(255, 255, 255, 0.1)',
      },

      backdropBlur: {
        xs: '2px',
        sm: '4px',
        DEFAULT: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '32px',
        '3xl': '48px',
      },

      transitionTimingFunction: {
        fast: 'cubic-bezier(0.4, 0, 0.2, 1)',
        normal: 'cubic-bezier(0.4, 0, 0.2, 1)',
        slow: 'cubic-bezier(0.4, 0, 0.2, 1)',
        bounce: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)',
      },

      transitionDuration: {
        fast: '150ms',
        normal: '250ms',
        slow: '350ms',
        slower: '500ms',
      },

      blur: {
        standard: '16px',
        md: '24px',
        lg: '32px',
      },

      backgroundImage: {
        'glass-gradient':
          'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
        'mesh-gradient':
          'radial-gradient(circle at 25% 25%, rgba(14, 165, 233, 0.12), transparent 50%), radial-gradient(circle at 75% 75%, rgba(248, 113, 113, 0.08), transparent 50%)',
        'brand-gradient': 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',  // Sky gradient
        'sky-gradient': 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)',    // Sky gradient
      },

      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        float: 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 2s infinite',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'slide-up': 'slideUp 0.4s ease-out forwards',
        'scale-in': 'scaleIn 0.3s ease-out forwards',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
      },

      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(14, 165, 233, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(14, 165, 233, 0.6)' },
        },
      },
    },
  },
  plugins: [],
};
