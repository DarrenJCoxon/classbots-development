'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';

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