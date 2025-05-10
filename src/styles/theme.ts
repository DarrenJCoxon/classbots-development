// src/styles/theme.ts
import { DefaultTheme } from 'styled-components';

const theme: DefaultTheme = {
  colors: {
    // Primary colors - inspired by Canva's purple
    primary: '#6B50B7', // Canva-like purple
    primaryLight: '#9B8DD4', // Lighter purple
    primaryDark: '#4A3889', // Darker purple
    
    // Secondary colors - accent colors
    secondary: '#FFB849', // Warm accent orange
    secondaryLight: '#FFC978',
    secondaryDark: '#E5A03D',
    
    // Neutral colors
    background: '#FFFFFF', // Clean white
    backgroundDark: '#F5F5F5', // Light gray
    backgroundCard: '#F9FAFB', // Card background
    text: '#1A1E2E', // Deep dark blue
    textLight: '#5E6C7A', // Muted blue-gray
    textMuted: '#9CA3AF', // Light gray text
    
    // Accent colors
    green: '#4BCE97', // Success green
    red: '#F87F7F', // Error red/pink
    blue: '#4A9FFF', // Info blue
    
    // UI colors
    border: '#E5E7EB', // Light border
    borderDark: '#D1D5DB', // Darker border
    focus: '#6B50B7', // Focus ring color
    shadow: '0, 0, 0', // Shadow RGB
  },
  
  fonts: {
    heading: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "'SF Mono', 'Fira Code', Consolas, monospace",
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
    small: '6px', // Slightly bigger for modern look
    medium: '8px',
    large: '12px',
    xl: '16px', // Extra large for cards
    round: '50%',
  },
  
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.1)',
  },
  
  gradients: {
    primary: 'linear-gradient(135deg, #6B50B7, #8A74C5)',
    secondary: 'linear-gradient(135deg, #FFB849, #FFC978)',
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