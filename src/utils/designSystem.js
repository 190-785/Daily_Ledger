/**
 * Design System Configuration
 * Centralized theme configuration for consistent styling across the app
 * Based on modern SaaS design principles (Linear, Notion, Stripe)
 */

export const colors = {
  // Primary - Blue (main brand color)
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',  // Main primary
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  
  // Secondary - Purple (accent color)
  secondary: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',  // Main secondary
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21a8',
    900: '#581c87',
  },
  
  // Success - Green
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',  // Main success
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  
  // Warning - Orange/Amber
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',  // Main warning
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  
  // Error - Red
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',  // Main error
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  
  // Info - Cyan
  info: {
    50: '#ecfeff',
    100: '#cffafe',
    200: '#a5f3fc',
    300: '#67e8f9',
    400: '#22d3ee',
    500: '#06b6d4',  // Main info
    600: '#0891b2',
    700: '#0e7490',
    800: '#155e75',
    900: '#164e63',
  },
  
  // Grayscale
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  
  // Semantic colors (shortcuts)
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
};

export const typography = {
  fontFamily: {
    sans: [
      'Inter',
      'system-ui',
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'Roboto',
      'Helvetica Neue',
      'Arial',
      'sans-serif',
    ].join(', '),
    mono: [
      'JetBrains Mono',
      'Fira Code',
      'Consolas',
      'Monaco',
      'Courier New',
      'monospace',
    ].join(', '),
  },
  
  fontSize: {
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
    '5xl': '3rem',      // 48px
    '6xl': '3.75rem',   // 60px
  },
  
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
  
  lineHeight: {
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
  
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
};

export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
};

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  
  // Colored shadows for emphasis
  primarySm: '0 1px 3px 0 rgba(59, 130, 246, 0.3)',
  primaryMd: '0 4px 6px -1px rgba(59, 130, 246, 0.3)',
  primaryLg: '0 10px 15px -3px rgba(59, 130, 246, 0.3)',
};

export const borderRadius = {
  none: '0',
  sm: '0.125rem',   // 2px
  base: '0.25rem',  // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  '3xl': '1.5rem',  // 24px
  full: '9999px',
};

export const transitions = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  slower: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
  
  // Specific transition types
  colors: 'background-color 200ms, color 200ms, border-color 200ms',
  transform: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  all: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
};

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modalBackdrop: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
};

/**
 * Button Variants
 * Consistent button styling across the app
 */
export const buttonVariants = {
  primary: {
    base: `bg-blue-600 text-white font-semibold hover:bg-blue-700 active:bg-blue-800 
           disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md hover:shadow-lg`,
    sizes: {
      sm: 'px-3 py-1.5 text-sm rounded-md',
      md: 'px-4 py-2 text-base rounded-lg',
      lg: 'px-6 py-3 text-lg rounded-lg',
    },
  },
  secondary: {
    base: `bg-purple-600 text-white font-semibold hover:bg-purple-700 active:bg-purple-800 
           disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md hover:shadow-lg`,
    sizes: {
      sm: 'px-3 py-1.5 text-sm rounded-md',
      md: 'px-4 py-2 text-base rounded-lg',
      lg: 'px-6 py-3 text-lg rounded-lg',
    },
  },
  success: {
    base: `bg-green-600 text-white font-semibold hover:bg-green-700 active:bg-green-800 
           disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md hover:shadow-lg`,
    sizes: {
      sm: 'px-3 py-1.5 text-sm rounded-md',
      md: 'px-4 py-2 text-base rounded-lg',
      lg: 'px-6 py-3 text-lg rounded-lg',
    },
  },
  danger: {
    base: `bg-red-600 text-white font-semibold hover:bg-red-700 active:bg-red-800 
           disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md hover:shadow-lg`,
    sizes: {
      sm: 'px-3 py-1.5 text-sm rounded-md',
      md: 'px-4 py-2 text-base rounded-lg',
      lg: 'px-6 py-3 text-lg rounded-lg',
    },
  },
  outline: {
    base: `bg-transparent border-2 border-blue-600 text-blue-600 font-semibold 
           hover:bg-blue-50 active:bg-blue-100 disabled:border-gray-300 
           disabled:text-gray-400 disabled:cursor-not-allowed`,
    sizes: {
      sm: 'px-3 py-1.5 text-sm rounded-md',
      md: 'px-4 py-2 text-base rounded-lg',
      lg: 'px-6 py-3 text-lg rounded-lg',
    },
  },
  ghost: {
    base: `bg-transparent text-gray-700 font-semibold hover:bg-gray-100 
           active:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed`,
    sizes: {
      sm: 'px-3 py-1.5 text-sm rounded-md',
      md: 'px-4 py-2 text-base rounded-lg',
      lg: 'px-6 py-3 text-lg rounded-lg',
    },
  },
};

/**
 * Card Variants
 * Consistent card styling across the app
 */
export const cardVariants = {
  default: 'bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-shadow',
  elevated: 'bg-white rounded-xl shadow-lg border border-gray-100',
  flat: 'bg-white rounded-lg border border-gray-200',
  interactive: 'bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer',
};

/**
 * Input Variants
 * Consistent input styling across the app
 */
export const inputVariants = {
  default: `w-full px-4 py-2 border border-gray-300 rounded-lg 
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:bg-gray-100 disabled:cursor-not-allowed
            transition-colors`,
  error: `w-full px-4 py-2 border-2 border-red-500 rounded-lg 
          focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent
          transition-colors`,
  success: `w-full px-4 py-2 border-2 border-green-500 rounded-lg 
            focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
            transition-colors`,
};

/**
 * Export default theme object
 */
export default {
  colors,
  typography,
  spacing,
  shadows,
  borderRadius,
  transitions,
  breakpoints,
  zIndex,
  buttonVariants,
  cardVariants,
  inputVariants,
};
