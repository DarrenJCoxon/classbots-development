// Utility functions for glassmorphism support

/**
 * Check if backdrop-filter is supported
 */
export const supportsBackdropFilter = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return (
    CSS.supports('backdrop-filter', 'blur(10px)') ||
    CSS.supports('-webkit-backdrop-filter', 'blur(10px)')
  );
};

/**
 * Get glassmorphism styles with fallback
 */
export const getGlassmorphismStyles = (variant: 'light' | 'medium' | 'dark' | 'colored-purple' | 'colored-cyan') => {
  const fallbackStyles = {
    light: {
      background: 'rgba(255, 255, 255, 0.95)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
    },
    medium: {
      background: 'rgba(255, 255, 255, 0.98)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
      border: '1px solid rgba(255, 255, 255, 0.4)',
    },
    dark: {
      background: 'rgba(26, 30, 46, 0.95)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    },
    'colored-purple': {
      background: 'rgba(152, 93, 215, 0.25)',
      boxShadow: '0 8px 32px rgba(152, 93, 215, 0.2)',
      border: '1px solid rgba(152, 93, 215, 0.3)',
    },
    'colored-cyan': {
      background: 'rgba(76, 190, 243, 0.25)',
      boxShadow: '0 8px 32px rgba(76, 190, 243, 0.2)',
      border: '1px solid rgba(76, 190, 243, 0.3)',
    },
  };
  
  return fallbackStyles[variant];
};