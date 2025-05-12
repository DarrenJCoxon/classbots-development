// styled-components.d.ts
import 'styled-components';

declare module 'styled-components' {
  export interface DefaultTheme {
    colors: {
      primary: string;
      primaryLight: string;
      primaryDark: string;
      secondary: string;
      secondaryLight: string;
      secondaryDark: string;
      background: string;
      backgroundDark: string;
      backgroundCard: string;
      text: string;
      textLight: string;
      textMuted: string;
      green: string;
      red: string;
      blue: string;
      magenta: string; // <<< ADDED THIS LINE
      border: string;
      borderDark: string;
      focus: string;
      shadow: string;
    };
    
    fonts: {
      heading: string;
      body: string;
      mono: string;
    };
    
    spacing: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
      xxl: string;
    };
    
    borderRadius: {
      small: string;
      medium: string;
      large: string;
      xl: string;
      round: string;
    };
    
    shadows: {
      sm: string;
      md: string;
      lg: string;
      xl: string;
    };
    
    gradients: {
      primary: string;
      secondary: string;
    };
    
    breakpoints: {
      mobile: string;
      tablet: string;
      desktop: string;
      wide: string;
    };
    
    transitions: {
      fast: string;
      normal: string;
      slow: string;
    };
  }
}