// src/components/student/DashboardButton.tsx
'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import styled from 'styled-components';

const DashboardButtonWrapper = styled.div`
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  
  @media (max-width: 768px) {
    top: 10px;
    left: 10px;
    transform: none;
  }
`;

const DashboardLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  text-decoration: none;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  font-weight: 600;
  font-size: 0.9rem;
  box-shadow: ${({ theme }) => theme.shadows.md};
  transition: all ${({ theme }) => theme.transitions.fast};
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.primaryDark};
    transform: translateY(-1px);
    box-shadow: ${({ theme }) => theme.shadows.lg};
  }
  
  @media (max-width: 768px) {
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
  }
`;

const DashboardIcon = styled.span`
  font-size: 1.1em;
`;

interface DashboardButtonProps {
  className?: string;
}

export default function DashboardButton({ className }: DashboardButtonProps) {
  const searchParams = useSearchParams();
  
  // Preserve direct access parameters when navigating to dashboard
  const buildDashboardUrl = () => {
    const dashboardUrl = new URL('/student/dashboard', window.location.origin);
    
    // Preserve important student access parameters
    const uid = searchParams.get('uid');
    const userId = searchParams.get('user_id');
    const accessSignature = searchParams.get('access_signature');
    const timestamp = searchParams.get('ts');
    const direct = searchParams.get('direct');
    const pinVerified = searchParams.get('pin_verified');
    
    if (uid) dashboardUrl.searchParams.set('uid', uid);
    if (userId) dashboardUrl.searchParams.set('user_id', userId);
    if (accessSignature) dashboardUrl.searchParams.set('access_signature', accessSignature);
    if (timestamp) dashboardUrl.searchParams.set('ts', timestamp);
    if (direct) dashboardUrl.searchParams.set('direct', direct);
    if (pinVerified) dashboardUrl.searchParams.set('pin_verified', pinVerified);
    
    // Add a timestamp to indicate direct dashboard access
    dashboardUrl.searchParams.set('_t', Date.now().toString());
    
    return dashboardUrl.pathname + dashboardUrl.search;
  };

  return (
    <DashboardButtonWrapper className={className}>
      <DashboardLink href={buildDashboardUrl()}>
        <DashboardIcon>📊</DashboardIcon>
        Dashboard
      </DashboardLink>
    </DashboardButtonWrapper>
  );
}