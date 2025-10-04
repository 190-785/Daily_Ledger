import React from 'react';

/**
 * Button Component
 * Reusable button with consistent styling and variants
 * 
 * @param {string} variant - primary | secondary | success | danger | outline | ghost
 * @param {string} size - sm | md | lg
 * @param {boolean} disabled - Disable button
 * @param {boolean} loading - Show loading state
 * @param {boolean} fullWidth - Full width button
 * @param {string} className - Additional classes
 * @param {function} onClick - Click handler
 * @param {ReactNode} children - Button content
 * @param {string} type - button | submit | reset
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  className = '',
  onClick,
  children,
  type = 'button',
  ...props
}) {
  const baseClasses = 'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 focus:ring-blue-500 shadow-md hover:shadow-lg',
    secondary: 'bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800 focus:ring-purple-500 shadow-md hover:shadow-lg',
    success: 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 focus:ring-green-500 shadow-md hover:shadow-lg',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus:ring-red-500 shadow-md hover:shadow-lg',
    warning: 'bg-orange-600 text-white hover:bg-orange-700 active:bg-orange-800 focus:ring-orange-500 shadow-md hover:shadow-lg',
    outline: 'bg-transparent border-2 border-blue-600 text-blue-600 hover:bg-blue-50 active:bg-blue-100 focus:ring-blue-500',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200 focus:ring-gray-500',
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm rounded-md',
    md: 'px-4 py-2 text-base rounded-lg',
    lg: 'px-6 py-3 text-lg rounded-lg',
  };
  
  const disabledClasses = disabled || loading 
    ? 'opacity-50 cursor-not-allowed pointer-events-none' 
    : '';
  
  const widthClasses = fullWidth ? 'w-full' : '';
  
  const classes = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${disabledClasses}
    ${widthClasses}
    ${className}
  `.trim().replace(/\s+/g, ' ');
  
  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4"
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
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
