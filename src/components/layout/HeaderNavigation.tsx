// src/components/layout/HeaderNavigation.tsx
'use client';

import { Suspense } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import styled from 'styled-components';
import type { User } from '@supabase/supabase-js';

const Nav = styled.nav`
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  gap: ${({ theme }) => theme.spacing.lg};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    position: relative;
    left: auto;
    transform: none;
    order: 3;
    width: 100%;
    justify-content: center;
    margin-top: ${({ theme }) => theme.spacing.sm};
    gap: ${({ theme }) => theme.spacing.md};
  }
`;

const NavLink = styled(Link)<{ $isActive?: boolean }>`
  color: ${({ theme, $isActive }) => $isActive ? theme.colors.primary : theme.colors.text};
  text-decoration: none;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  transition: all ${({ theme }) => theme.transitions.fast};
  font-weight: ${({ $isActive }) => $isActive ? '600' : '500'};
  background: ${({ theme, $isActive }) => $isActive ? (theme.colors.primary + '20') : 'transparent'};
  
  &:hover {
    background: ${({ theme, $isActive }) => $isActive ? (theme.colors.primary + '30') : theme.colors.backgroundDark};
    color: ${({ theme }) => theme.colors.primary};
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${({ theme }) => theme.spacing.sm};
    flex: 1;
    text-align: center;
  }
`;

const DashboardIcon = styled(Link)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  text-decoration: none;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  font-weight: 600;
  font-size: 0.9rem;
  transition: all ${({ theme }) => theme.transitions.fast};
  
  &:hover {
    background: ${({ theme }) => theme.colors.primaryDark};
    transform: translateY(-1px);
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
    font-size: 0.8rem;
    gap: 4px;
    
    span {
      font-size: 0.7rem;
    }
  }
`;

interface HeaderNavigationProps {
  user: User | null;
  userRole: string | null;
  pathname: string;
}

function HeaderNavigationContent({ user, userRole, pathname }: HeaderNavigationProps) {
  const searchParams = useSearchParams();

  const isLinkActive = (href: string) => {
    if (href === '/teacher-dashboard' || href === '/student/dashboard') {
        return pathname.startsWith(href);
    }
    return pathname === href;
  };

  // Check if we're on a student page with direct access
  const isStudentDirectAccess = () => {
    const uid = searchParams.get('uid');
    const accessSignature = searchParams.get('access_signature');
    const direct = searchParams.get('direct');
    const studentId = typeof window !== 'undefined' ? localStorage.getItem('student_direct_access_id') : null;
    
    return (
      (pathname.startsWith('/student/') || pathname.startsWith('/room/') || pathname.startsWith('/chat/')) &&
      (uid || accessSignature || direct || studentId) &&
      pathname !== '/student-login' &&
      pathname !== '/student-access'
    );
  };

  // Build dashboard URL with preserved parameters
  const buildDashboardUrl = () => {
    // Use relative URL to avoid window reference during SSR
    const basePath = '/student/dashboard';
    const params = new URLSearchParams();
    
    // Preserve important student access parameters
    const uid = searchParams.get('uid');
    const userId = searchParams.get('user_id');
    const accessSignature = searchParams.get('access_signature');
    const timestamp = searchParams.get('ts');
    const direct = searchParams.get('direct');
    const pinVerified = searchParams.get('pin_verified');
    
    if (uid) params.set('uid', uid);
    if (userId) params.set('user_id', userId);
    if (accessSignature) params.set('access_signature', accessSignature);
    if (timestamp) params.set('ts', timestamp);
    if (direct) params.set('direct', direct);
    if (pinVerified) params.set('pin_verified', pinVerified);
    
    const queryString = params.toString();
    return queryString ? `${basePath}?${queryString}` : basePath;
  };

  return (
    <Nav>
      {/* Dashboard links removed - using slide-out nav instead */}
    </Nav>
  );
}

function HeaderNavigationFallback() {
  return <Nav>Loading...</Nav>;
}

export default function HeaderNavigation(props: HeaderNavigationProps) {
  return (
    <Suspense fallback={<HeaderNavigationFallback />}>
      <HeaderNavigationContent {...props} />
    </Suspense>
  );
}