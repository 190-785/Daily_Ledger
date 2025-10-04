import React from 'react';

/**
 * Animations Configuration
 * CSS animations and transition utilities
 */

/**
 * FadeIn Component
 * Fade in animation wrapper
 */
export function FadeIn({ 
  children, 
  duration = 300, 
  delay = 0,
  className = '',
  ...props 
}) {
  return (
    <div
      className={`animate-fadeIn ${className}`}
      style={{
        animationDuration: `${duration}ms`,
        animationDelay: `${delay}ms`,
        animationFillMode: 'both'
      }}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * SlideIn Component
 * Slide in animation from different directions
 */
export function SlideIn({ 
  children, 
  direction = 'up',
  duration = 300,
  delay = 0,
  className = '',
  ...props 
}) {
  const animations = {
    up: 'animate-slideInUp',
    down: 'animate-slideInDown',
    left: 'animate-slideInLeft',
    right: 'animate-slideInRight'
  };

  return (
    <div
      className={`${animations[direction]} ${className}`}
      style={{
        animationDuration: `${duration}ms`,
        animationDelay: `${delay}ms`,
        animationFillMode: 'both'
      }}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * ScaleIn Component
 * Scale in animation
 */
export function ScaleIn({ 
  children, 
  duration = 200,
  delay = 0,
  className = '',
  ...props 
}) {
  return (
    <div
      className={`animate-scaleIn ${className}`}
      style={{
        animationDuration: `${duration}ms`,
        animationDelay: `${delay}ms`,
        animationFillMode: 'both'
      }}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Stagger Component
 * Stagger children animations
 */
export function Stagger({ 
  children, 
  staggerDelay = 50,
  className = '',
  ...props 
}) {
  return (
    <div className={className} {...props}>
      {React.Children.map(children, (child, index) => (
        <div
          className="animate-fadeIn"
          style={{
            animationDelay: `${index * staggerDelay}ms`,
            animationFillMode: 'both'
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

/**
 * Collapse Component
 * Smooth height collapse/expand
 */
export function Collapse({ 
  isOpen, 
  children,
  duration = 300,
  className = '',
  ...props 
}) {
  const [height, setHeight] = React.useState(isOpen ? 'auto' : 0);
  const contentRef = React.useRef(null);

  React.useEffect(() => {
    if (isOpen) {
      const contentHeight = contentRef.current?.scrollHeight;
      setHeight(contentHeight);
      setTimeout(() => setHeight('auto'), duration);
    } else {
      const contentHeight = contentRef.current?.scrollHeight;
      setHeight(contentHeight);
      setTimeout(() => setHeight(0), 10);
    }
  }, [isOpen, duration]);

  return (
    <div
      ref={contentRef}
      className={`overflow-hidden transition-all ${className}`}
      style={{
        height,
        transitionDuration: `${duration}ms`,
        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
      }}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Modal Animations
 * Smooth modal entrance/exit
 */
export function ModalBackdrop({ show, children, onClick, className = '' }) {
  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fadeIn ${className}`}
      style={{ animationDuration: '200ms' }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function ModalContent({ children, className = '', ...props }) {
  return (
    <div
      className={`bg-white rounded-lg shadow-2xl animate-scaleIn ${className}`}
      style={{ animationDuration: '300ms' }}
      onClick={(e) => e.stopPropagation()}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Ripple Effect Component
 * Material Design ripple effect for buttons
 */
export function Ripple({ children, className = '', ...props }) {
  const [ripples, setRipples] = React.useState([]);

  const addRipple = (event) => {
    const rippleContainer = event.currentTarget.getBoundingClientRect();
    const size = Math.max(rippleContainer.width, rippleContainer.height);
    const x = event.clientX - rippleContainer.left - size / 2;
    const y = event.clientY - rippleContainer.top - size / 2;
    const newRipple = { x, y, size, id: Date.now() };

    setRipples([...ripples, newRipple]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 600);
  };

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      onMouseDown={addRipple}
      {...props}
    >
      {children}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute bg-white bg-opacity-50 rounded-full animate-ripple pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size
          }}
        />
      ))}
    </div>
  );
}

/**
 * Toast Animation Component
 * Smooth toast notification entrance
 */
export function Toast({ 
  show, 
  children, 
  position = 'top-right',
  className = '',
  ...props 
}) {
  if (!show) return null;

  const positions = {
    'top-right': 'top-4 right-4 animate-slideInRight',
    'top-left': 'top-4 left-4 animate-slideInLeft',
    'bottom-right': 'bottom-4 right-4 animate-slideInRight',
    'bottom-left': 'bottom-4 left-4 animate-slideInLeft',
    'top-center': 'top-4 left-1/2 -translate-x-1/2 animate-slideInDown',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2 animate-slideInUp'
  };

  return (
    <div
      className={`fixed z-50 ${positions[position]} ${className}`}
      style={{ animationDuration: '300ms' }}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Pulse Component
 * Continuous pulse animation
 */
export function Pulse({ children, className = '', ...props }) {
  return (
    <div className={`animate-pulse ${className}`} {...props}>
      {children}
    </div>
  );
}

/**
 * Bounce Component
 * Bounce animation
 */
export function Bounce({ children, className = '', ...props }) {
  return (
    <div className={`animate-bounce ${className}`} {...props}>
      {children}
    </div>
  );
}

/**
 * Spin Component
 * Continuous spin animation
 */
export function Spin({ children, speed = 'normal', className = '', ...props }) {
  const speeds = {
    slow: 'animate-spin-slow',
    normal: 'animate-spin',
    fast: 'animate-spin-fast'
  };

  return (
    <div className={`${speeds[speed]} ${className}`} {...props}>
      {children}
    </div>
  );
}

/**
 * CSS Animation Keyframes
 * Add these to your global CSS or index.css
 */
export const animationStyles = `
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideInUp {
  from { 
    opacity: 0;
    transform: translateY(20px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInDown {
  from { 
    opacity: 0;
    transform: translateY(-20px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInLeft {
  from { 
    opacity: 0;
    transform: translateX(-20px);
  }
  to { 
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInRight {
  from { 
    opacity: 0;
    transform: translateX(20px);
  }
  to { 
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes scaleIn {
  from { 
    opacity: 0;
    transform: scale(0.95);
  }
  to { 
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes ripple {
  to {
    transform: scale(4);
    opacity: 0;
  }
}

.animate-fadeIn { animation: fadeIn; }
.animate-slideInUp { animation: slideInUp; }
.animate-slideInDown { animation: slideInDown; }
.animate-slideInLeft { animation: slideInLeft; }
.animate-slideInRight { animation: slideInRight; }
.animate-scaleIn { animation: scaleIn; }
.animate-ripple { animation: ripple 600ms ease-out; }
.animate-spin-slow { animation: spin 3s linear infinite; }
.animate-spin-fast { animation: spin 0.5s linear infinite; }
`;
