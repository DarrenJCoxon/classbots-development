// src/app/layout.tsx
import { Metadata } from 'next';
import Providers from './providers';
import Header from '@/components/layout/Header';
import { APP_NAME, APP_DESCRIPTION } from '@/lib/utils/constants';
import './globals.css';

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  viewport: 'width=device-width, initial-scale=1.0, maximum-scale=1.0',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}