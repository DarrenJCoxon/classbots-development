'use client';

import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';

// Load Header with no SSR to prevent hydration mismatches
const Header = dynamic(() => import('./Header'), {
  ssr: false,
  loading: () => (
    <div style={{ 
      height: '60px', 
      borderBottom: '1px solid #e2e8f0',
      background: '#ffffff'
    }} />
  )
});

export default function ConditionalHeader() {
  const pathname = usePathname();
  
  // Don't show header on teacher or student dashboard pages
  // These pages have their own navigation
  const hideHeaderPaths = [
    '/teacher-dashboard',
    '/student/dashboard',
    '/student/assessments',
    '/student/account-setup',
    '/student/pin-setup'
  ];
  
  const shouldHideHeader = hideHeaderPaths.some(path => pathname.startsWith(path));
  
  if (shouldHideHeader) {
    return null;
  }
  
  return <Header />;
}