import React from 'react';

/**
 * LoadingSpinner Component
 * Reusable spinner with different sizes
 * 
 * @param {string} size - sm | md | lg | xl
 * @param {string} color - Spinner color (Tailwind class)
 * @param {string} text - Optional loading text
 */
export default function LoadingSpinner({ size = 'md', color = 'text-blue-600', text }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <svg
        className={`${sizes[size]} ${color} animate-spin`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
      {text && <p className="text-gray-600 text-sm font-medium">{text}</p>}
    </div>
  );
}

/**
 * Skeleton Component
 * Loading placeholder with shimmer effect
 */
export function Skeleton({ className = '', variant = 'text' }) {
  const variants = {
    text: 'h-4',
    title: 'h-6',
    avatar: 'w-12 h-12 rounded-full',
    button: 'h-10 rounded-lg',
    card: 'h-48 rounded-lg'
  };

  return (
    <div
      className={`bg-gray-200 animate-pulse ${variants[variant]} ${className}`}
      style={{
        backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite'
      }}
    />
  );
}

/**
 * EmptyState Component
 * Display when no data is available
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  actionLabel,
  className = ''
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center ${className}`}>
      {icon && (
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4 text-gray-400">
          {icon}
        </div>
      )}
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      
      {description && (
        <p className="text-gray-600 mb-6 max-w-md">
          {description}
        </p>
      )}
      
      {action && actionLabel && (
        <button
          onClick={action}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/**
 * ProgressBar Component
 * Show progress with percentage
 */
export function ProgressBar({
  value = 0,
  max = 100,
  color = 'bg-blue-600',
  size = 'md',
  showLabel = false,
  className = ''
}) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  const sizes = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  return (
    <div className={`w-full ${className}`}>
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizes[size]}`}>
        <div
          className={`${color} ${sizes[size]} transition-all duration-300 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-sm text-gray-600 mt-1 text-right">
          {Math.round(percentage)}%
        </p>
      )}
    </div>
  );
}

/**
 * LoadingOverlay Component
 * Full-screen loading overlay
 */
export function LoadingOverlay({ show, text = 'Loading...' }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 shadow-2xl">
        <LoadingSpinner size="lg" text={text} />
      </div>
    </div>
  );
}

/**
 * TableSkeleton Component
 * Skeleton loader for tables
 */
export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4">
        {Array(columns).fill(0).map((_, i) => (
          <Skeleton key={i} variant="text" className="flex-1" />
        ))}
      </div>
      
      {/* Rows */}
      {Array(rows).fill(0).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array(columns).fill(0).map((_, colIndex) => (
            <Skeleton key={colIndex} variant="text" className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * CardSkeleton Component
 * Skeleton loader for cards
 */
export function CardSkeleton({ count = 1 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array(count).fill(0).map((_, i) => (
        <div key={i} className="bg-white p-6 rounded-lg border border-gray-200">
          <Skeleton variant="title" className="mb-3" />
          <Skeleton variant="text" className="mb-2 w-3/4" />
          <Skeleton variant="text" className="w-1/2" />
        </div>
      ))}
    </div>
  );
}
