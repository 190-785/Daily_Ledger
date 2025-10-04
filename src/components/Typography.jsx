import React from 'react';

/**
 * Heading Component
 * Consistent heading styles with variants
 * 
 * @param {string} level - h1 | h2 | h3 | h4 | h5 | h6
 * @param {string} variant - primary | secondary | muted
 * @param {string} className - Additional classes
 */
export function Heading({ 
  level = 'h2', 
  variant = 'primary', 
  children, 
  className = '',
  ...props 
}) {
  const Component = level;
  
  const baseClasses = 'font-bold';
  
  const levelClasses = {
    h1: 'text-4xl md:text-5xl',
    h2: 'text-3xl md:text-4xl',
    h3: 'text-2xl md:text-3xl',
    h4: 'text-xl md:text-2xl',
    h5: 'text-lg md:text-xl',
    h6: 'text-base md:text-lg'
  };
  
  const variantClasses = {
    primary: 'text-gray-900',
    secondary: 'text-gray-700',
    muted: 'text-gray-600'
  };
  
  const classes = `${baseClasses} ${levelClasses[level]} ${variantClasses[variant]} ${className}`.trim();
  
  return (
    <Component className={classes} {...props}>
      {children}
    </Component>
  );
}

/**
 * Text Component
 * Consistent body text styles
 */
export function Text({ 
  size = 'base', 
  variant = 'default', 
  weight = 'normal',
  children, 
  className = '',
  as = 'p',
  ...props 
}) {
  const Component = as;
  
  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };
  
  const variantClasses = {
    default: 'text-gray-900',
    muted: 'text-gray-600',
    subtle: 'text-gray-500',
    emphasized: 'text-gray-900 font-medium',
    success: 'text-green-600',
    warning: 'text-orange-600',
    error: 'text-red-600',
    info: 'text-blue-600'
  };
  
  const weightClasses = {
    light: 'font-light',
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold'
  };
  
  const classes = `${sizeClasses[size]} ${variantClasses[variant]} ${weightClasses[weight]} ${className}`.trim();
  
  return (
    <Component className={classes} {...props}>
      {children}
    </Component>
  );
}

/**
 * Label Component
 * Consistent label styles
 */
export function Label({ 
  children, 
  required = false,
  htmlFor,
  className = '',
  ...props 
}) {
  return (
    <label 
      htmlFor={htmlFor}
      className={`block text-sm font-medium text-gray-700 mb-1 ${className}`.trim()}
      {...props}
    >
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}

/**
 * Badge Component
 * Small status indicators
 */
export function Badge({ 
  children, 
  variant = 'default',
  size = 'md',
  className = '',
  ...props 
}) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  };
  
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-blue-100 text-blue-800',
    secondary: 'bg-purple-100 text-purple-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-orange-100 text-orange-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-cyan-100 text-cyan-800'
  };
  
  const classes = `inline-flex items-center rounded-full font-medium ${sizeClasses[size]} ${variantClasses[variant]} ${className}`.trim();
  
  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
}

/**
 * Code Component
 * Inline code display
 */
export function Code({ children, className = '', ...props }) {
  return (
    <code 
      className={`px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-sm font-mono ${className}`.trim()}
      {...props}
    >
      {children}
    </code>
  );
}

/**
 * Link Component
 * Consistent link styles
 */
export function Link({ 
  children, 
  href,
  variant = 'default',
  className = '',
  ...props 
}) {
  const variantClasses = {
    default: 'text-blue-600 hover:text-blue-700 hover:underline',
    muted: 'text-gray-600 hover:text-gray-900 hover:underline',
    button: 'px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 no-underline'
  };
  
  const classes = `transition-colors ${variantClasses[variant]} ${className}`.trim();
  
  return (
    <a href={href} className={classes} {...props}>
      {children}
    </a>
  );
}

/**
 * Divider Component
 * Visual separator
 */
export function Divider({ 
  orientation = 'horizontal',
  className = '',
  ...props 
}) {
  const orientationClasses = {
    horizontal: 'w-full h-px',
    vertical: 'w-px h-full'
  };
  
  const classes = `bg-gray-200 ${orientationClasses[orientation]} ${className}`.trim();
  
  return <div className={classes} {...props} />;
}

/**
 * Blockquote Component
 * Styled quotation block
 */
export function Blockquote({ children, className = '', ...props }) {
  return (
    <blockquote 
      className={`border-l-4 border-blue-500 pl-4 py-2 italic text-gray-700 ${className}`.trim()}
      {...props}
    >
      {children}
    </blockquote>
  );
}
