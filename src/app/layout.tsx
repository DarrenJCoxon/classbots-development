// src/app/layout.tsx
import { Metadata, Viewport } from 'next';
import Providers from './providers';
import ConditionalHeader from '@/components/layout/ConditionalHeader';
import { APP_NAME, APP_DESCRIPTION } from '@/lib/utils/constants';
import { inter, orbitron, oxanium } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 1.0,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${orbitron.variable} ${oxanium.variable}`}>
      <body className={inter.className}>
        <Providers>
          <ConditionalHeader />
          {children}
        </Providers>
      </body>
    </html>
  );
}