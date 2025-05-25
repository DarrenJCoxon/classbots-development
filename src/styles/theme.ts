// src/styles/theme.ts
import { DefaultTheme } from 'styled-components';

// New Skolr Brand Colors (defined for clarity and easy reference)
const skolrPurple = '#985DD7';
const skolrCyan = '#4CBEF3';
const skolrMagenta = '#C848AF';
const skolrGreen = '#7BBC44';
const skolrCoral = '#FE4372';
const skolrOrange = '#FFB612';

// Helper function to generate lighter/darker shades (basic example, you might use a tool)
// This is a very simplistic way to generate shades. For best results, pick them manually or use a color tool.
const lighten = (color: string, percent: number): string => {
  const num = parseInt(color.replace("#",""), 16),
    amt = Math.round(2.55 * percent),
    R = (num >> 16) + amt,
    G = (num >> 8 & 0x00FF) + amt,
    B = (num & 0x0000FF) + amt;
  return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
};

const darken = (color: string, percent: number): string => {
  const num = parseInt(color.replace("#",""), 16),
    amt = Math.round(2.55 * percent),
    R = (num >> 16) - amt,
    G = (num >> 8 & 0x00FF) - amt,
    B = (num & 0x0000FF) - amt;
  return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
};


const theme: DefaultTheme = {
  colors: {
    // Primary colors
    primary: skolrPurple, 
    primaryLight: lighten(skolrPurple, 15), // Lighter purple (e.g., #b589e0)
    primaryDark: darken(skolrPurple, 15),  // Darker purple (e.g., #7a4bb5)
    
    // Secondary colors
    secondary: skolrOrange, 
    secondaryLight: lighten(skolrOrange, 10), // Lighter orange (e.g., #ffc74e)
    secondaryDark: darken(skolrOrange, 10),  // Darker orange (e.g., #e5a000)
    
    // Neutral colors (keeping these as the base for a light theme)
    background: '#FFFFFF', 
    backgroundDark: '#F5F5F5', 
    backgroundCard: '#F9FAFB', 
    text: '#1A1E2E', 
    textLight: '#5E6C7A', 
    textMuted: '#9CA3AF', 
    
    // Status colors (simplified palette)
    success: skolrCyan, // Using cyan instead of green
    warning: skolrMagenta, // Using magenta instead of orange
    danger: skolrCoral, // Pink/coral for errors
    info: skolrCyan, // Cyan for information
    
    // Core accent colors
    purple: skolrPurple,
    blue: skolrCyan,
    pink: skolrCoral,
    magenta: skolrMagenta,
    
    // Legacy colors (for compatibility, but should be phased out)
    green: skolrCyan, // Redirected to cyan
    red: skolrCoral, // Redirected to coral
    orange: skolrMagenta, // Redirected to magenta
    
    // UI colors
    border: '#E5E7EB', 
    borderDark: '#D1D5DB', 
    focus: skolrPurple, // Focus ring color now matches new primary
    shadow: '0, 0, 0', 
  },
  
  fonts: {
    heading: "var(--font-oxanium), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    body: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "'SF Mono', 'Fira Code', Consolas, monospace",
    display: "var(--font-orbitron), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  
  borderRadius: {
    small: '6px',
    medium: '8px',
    large: '12px',
    xl: '16px',
    round: '50%',
  },
  
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.1)',
  },
  
  gradients: {
    primary: `linear-gradient(135deg, ${skolrPurple}, ${lighten(skolrPurple, 20)})`, // Updated
    secondary: `linear-gradient(135deg, ${skolrOrange}, ${lighten(skolrOrange, 15)})`, // Updated
    // New animated gradient backgrounds
    animatedPurple: `linear-gradient(45deg, ${skolrPurple}, ${skolrMagenta}, ${skolrCyan})`,
    animatedWarm: `linear-gradient(45deg, ${skolrOrange}, ${skolrCoral}, ${skolrMagenta})`,
    animatedCool: `linear-gradient(45deg, ${skolrCyan}, ${skolrPurple}, ${skolrGreen})`,
  },
  
  glassmorphism: {
    // Glass effects with different intensities
    light: {
      background: 'rgba(255, 255, 255, 0.7)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    },
    medium: {
      background: 'rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.4)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
    },
    dark: {
      background: 'rgba(26, 30, 46, 0.8)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    },
    colored: {
      purple: {
        background: `rgba(152, 93, 215, 0.15)`,
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(152, 93, 215, 0.3)',
        boxShadow: '0 8px 32px rgba(152, 93, 215, 0.2)',
      },
      cyan: {
        background: `rgba(76, 190, 243, 0.15)`,
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(76, 190, 243, 0.3)',
        boxShadow: '0 8px 32px rgba(76, 190, 243, 0.2)',
      },
    },
  },
  
  breakpoints: {
    mobile: '480px',
    tablet: '768px',
    desktop: '1024px',
    wide: '1280px',
  },
  
  transitions: {
    fast: '0.15s ease',
    normal: '0.25s ease',
    slow: '0.35s ease',
  },
};

export default theme;