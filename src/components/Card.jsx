import React from 'react';

/**
 * Card Component
 * Reusable card with consistent styling and variants
 * 
 * @param {string} variant - default | elevated | flat | interactive
 * @param {string} padding - none | sm | md | lg
 * @param {string} className - Additional classes
 * @param {function} onClick - Click handler (makes card interactive)
 * @param {ReactNode} children - Card content
 */
export default function Card({
  variant = 'default',
  padding = 'md',
  className = '',
  onClick,
  children,
  ...props
}) {
  const variantClasses = {
    default: 'bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-shadow',
    elevated: 'bg-white rounded-xl shadow-lg border border-gray-100',
    flat: 'bg-white rounded-lg border border-gray-200',
    interactive: 'bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-xl hover:border-blue-300 hover:scale-[1.02] transition-all cursor-pointer',
  };
  
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6',
  };
  
  const interactiveClasses = onClick ? 'cursor-pointer' : '';
  
  const classes = `
    ${variantClasses[variant]}
    ${paddingClasses[padding]}
    ${interactiveClasses}
    ${className}
  `.trim().replace(/\s+/g, ' ');
  
  return (
    <div
      className={classes}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Card Header Component
 */
export function CardHeader({ className = '', children, ...props }) {
  return (
    <div className={`border-b border-gray-200 pb-4 mb-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

/**
 * Card Title Component
 */
export function CardTitle({ className = '', children, ...props }) {
  return (
    <h3 className={`text-xl font-bold text-gray-900 ${className}`} {...props}>
      {children}
    </h3>
  );
}

/**
 * Card Description Component
 */
export function CardDescription({ className = '', children, ...props }) {
  return (
    <p className={`text-sm text-gray-600 mt-1 ${className}`} {...props}>
      {children}
    </p>
  );
}

/**
 * Card Content Component
 */
export function CardContent({ className = '', children, ...props }) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

/**
 * Card Footer Component
 */
export function CardFooter({ className = '', children, ...props }) {
  return (
    <div className={`border-t border-gray-200 pt-4 mt-4 ${className}`} {...props}>
      {children}
    </div>
  );
}
