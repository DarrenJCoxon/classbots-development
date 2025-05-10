// src/app/providers.tsx
'use client';

import StyledComponentsRegistry from '@/lib/StyledComponentsRegistry';
import ThemeProvider from '@/components/ThemeProvider';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StyledComponentsRegistry>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </StyledComponentsRegistry>
  );
}