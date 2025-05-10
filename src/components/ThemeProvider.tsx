// src/components/ThemeProvider.tsx
'use client';

import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import theme from '@/styles/theme';
import { GlobalStyles } from '@/styles/GlobalStyles';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <StyledThemeProvider theme={theme}>
      <GlobalStyles />
      {children}
    </StyledThemeProvider>
  );
}