/**
 * ORIGEN ERP - Design System Constants
 * Centralized style and spacing definitions for consistency
 */

// ============================================
// COLORS
// ============================================

export const COLORS = {
  // Backgrounds
  bg: {
    primary: 'bg-white',
    secondary: 'bg-slate-50',
    tertiary: 'bg-slate-100',
    dark: 'bg-slate-900',
    gradient: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900',
  },

  // Text
  text: {
    primary: 'text-slate-900',
    secondary: 'text-slate-600',
    tertiary: 'text-slate-500',
    light: 'text-slate-400',
    white: 'text-white',
    inverse: 'text-slate-900',
  },

  // Semantic
  success: 'bg-green-50 border-green-200 text-green-700',
  error: 'bg-red-50 border-red-200 text-red-700',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  info: 'bg-blue-50 border-blue-200 text-blue-700',

  // Buttons
  button: {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-slate-200 hover:bg-slate-300 text-slate-700',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    disabled: 'bg-slate-400 text-slate-200 cursor-not-allowed opacity-50',
  },

  // Borders
  border: {
    primary: 'border-slate-200',
    secondary: 'border-slate-300',
    light: 'border-slate-100',
    dark: 'border-slate-600',
    focus: 'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
  },

  // Badges
  badge: {
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    purple: 'bg-purple-100 text-purple-800',
  },

  // Status Colors (Projects, etc.)
  status: {
    planning: 'bg-blue-100 text-blue-800',
    inProgress: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    archived: 'bg-slate-100 text-slate-800',
  },

  // Expense Categories (6 distinct colors)
  expenseCategories: {
    materials: { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-800' },
    labor: { bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-100 text-green-800' },
    machinery: { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-800' },
    permits: { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-800' },
    contingency: { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-800' },
    other: { bg: 'bg-slate-50', border: 'border-slate-200', badge: 'bg-slate-100 text-slate-800' },
  },

  // KPI Dashboard Colors
  kpi: {
    budget: { bg: 'bg-blue-500/10 text-blue-600', text: 'text-blue-600' },
    expense: { bg: 'bg-green-500/10 text-green-600', text: 'text-green-600' },
    active: { bg: 'bg-purple-500/10 text-purple-600', text: 'text-purple-600' },
    completed: { bg: 'bg-orange-500/10 text-orange-600', text: 'text-orange-600' },
  },

  // Budget Utilization (Performance-based colors)
  budgetUtilization: {
    low: 'bg-green-500',      // 0-50%
    medium: 'bg-yellow-500',  // 50-80%
    high: 'bg-red-500',       // 80%+
  },

  // Attendance & Personnel
  attendance: {
    present: 'bg-green-100 text-green-800',
    absent: 'bg-red-100 text-red-800',
    overtime: 'bg-orange-100 text-orange-800',
    pending: 'bg-slate-100 text-slate-800',
  },

  // Payroll & Financial
  financial: {
    gross: 'text-slate-900',
    deduction: 'text-orange-600',
    tax: 'text-red-600',
    net: 'text-blue-900 bg-blue-50',
  },

  // Quotation Status
  quotationStatus: {
    draft: 'bg-slate-100 text-slate-800',
    sent: 'bg-blue-100 text-blue-800',
    accepted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    expired: 'bg-amber-100 text-amber-800',
  },
};

// ============================================
// SPACING
// ============================================

export const SPACING = {
  // Padding
  px: {
    xs: 'px-2',
    sm: 'px-3',
    md: 'px-4',
    lg: 'px-6',
    xl: 'px-8',
  },
  py: {
    xs: 'py-1',
    sm: 'py-2',
    md: 'py-3',
    lg: 'py-4',
    xl: 'py-6',
  },
  p: {
    xs: 'p-2',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
  },

  // Margin
  mx: {
    xs: 'mx-2',
    sm: 'mx-3',
    md: 'mx-4',
    lg: 'mx-6',
    xl: 'mx-8',
  },
  my: {
    xs: 'my-2',
    sm: 'my-3',
    md: 'my-4',
    lg: 'my-6',
    xl: 'my-8',
  },

  // Gap
  gap: {
    xs: 'gap-2',
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  },

  // Space between
  space: {
    xs: 'space-y-2',
    sm: 'space-y-3',
    md: 'space-y-4',
    lg: 'space-y-6',
    xl: 'space-y-8',
  },
};

// ============================================
// SHADOWS
// ============================================

export const SHADOWS = {
  none: 'shadow-none',
  sm: 'shadow-sm',
  md: 'shadow',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  hover: 'hover:shadow-md transition-shadow',
};

// ============================================
// BORDERS & RADIUS
// ============================================

export const BORDERS = {
  radius: {
    sm: 'rounded',
    md: 'rounded-lg',
    lg: 'rounded-xl',
    full: 'rounded-full',
  },
  width: {
    thin: 'border',
    thick: 'border-2',
    none: 'border-0',
  },
  standard: 'border border-slate-200',
  input: 'border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent',
  card: 'border border-slate-200 rounded-lg',
};

// ============================================
// TYPOGRAPHY
// ============================================

export const TYPOGRAPHY = {
  // Headings
  h1: 'text-4xl font-bold',
  h2: 'text-3xl font-bold',
  h3: 'text-2xl font-bold',
  h4: 'text-xl font-bold',
  h5: 'text-lg font-semibold',
  h6: 'text-base font-semibold',

  // Text sizes
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',

  // Font weights
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
};

// ============================================
// FORMS
// ============================================

export const FORMS = {
  input: `w-full px-3 py-2 border border-slate-300 rounded-lg
           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
           disabled:opacity-50 disabled:cursor-not-allowed
           transition-colors`,
  
  label: 'block text-sm font-medium text-slate-700 mb-1',
  
  error: 'text-xs text-red-600 mt-1 flex items-center gap-1',
  
  helper: 'text-xs text-slate-500 mt-1',

  checkbox: `w-4 h-4 rounded border-slate-300 text-blue-600 
             focus:ring-2 focus:ring-blue-500 disabled:opacity-50`,

  select: `w-full px-3 py-2 border border-slate-300 rounded-lg
           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
           disabled:opacity-50 disabled:cursor-not-allowed
           transition-colors`,

  textarea: `w-full px-3 py-2 border border-slate-300 rounded-lg
             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
             disabled:opacity-50 disabled:cursor-not-allowed
             transition-colors resize-vertical`,
};

// ============================================
// BUTTONS
// ============================================

export const BUTTONS = {
  base: `font-semibold rounded-lg transition-colors 
         focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500
         disabled:opacity-50 disabled:cursor-not-allowed`,

  size: {
    sm: 'px-3 py-1 text-sm min-h-[36px]',
    md: 'px-4 py-2 text-base min-h-[44px]',
    lg: 'px-6 py-3 text-lg min-h-[48px]',
  },

  variant: {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-slate-200 hover:bg-slate-300 text-slate-700',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    outline: 'border border-slate-300 hover:bg-slate-50 text-slate-700',
    ghost: 'hover:bg-slate-100 text-slate-700',
  },
};

// ============================================
// MODALS & DIALOGS
// ============================================

export const MODALS = {
  backdrop: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50',
  container: 'bg-white rounded-lg overflow-hidden max-w-2xl w-full shadow-lg',
  header: 'border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 bg-white',
  content: 'p-6',
  footer: 'border-t border-slate-200 p-4 flex justify-end gap-2',
};

// ============================================
// RESPONSIVE
// ============================================

export const RESPONSIVE = {
  mobile: 'block sm:hidden',
  tablet: 'hidden sm:block md:hidden',
  desktop: 'hidden md:block',
  mobileOnly: 'sm:hidden',
  desktopOnly: 'hidden md:block',
};

// ============================================
// ICONS
// ============================================

export const ICONS = {
  size: {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-8 w-8',
    xxl: 'h-12 w-12',
  },
};

// ============================================
// ANIMATIONS
// ============================================

export const ANIMATIONS = {
  fadeIn: 'animate-fade-in',
  slideUp: 'animate-slide-up',
  slideDown: 'animate-slide-down',
  pulse: 'animate-pulse',
  spin: 'animate-spin',
  bounce: 'animate-bounce',
  transition: 'transition-all',
  transitionFast: 'transition-colors duration-200',
};

// ============================================
// GRID LAYOUTS
// ============================================

export const GRID = {
  cols: {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  },
  gap: 'gap-4',
};

// ============================================
// FLEX UTILITIES
// ============================================

export const FLEX = {
  center: 'flex items-center justify-center',
  between: 'flex items-center justify-between',
  col: 'flex flex-col',
  colCenter: 'flex flex-col items-center justify-center',
};

export default {
  COLORS,
  SPACING,
  SHADOWS,
  BORDERS,
  TYPOGRAPHY,
  FORMS,
  BUTTONS,
  MODALS,
  RESPONSIVE,
  ICONS,
  ANIMATIONS,
  GRID,
  FLEX,
};
