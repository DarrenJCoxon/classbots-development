// src/app/student/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styled, { keyframes } from 'styled-components';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const RedirectPageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  text-align: center;
  position: relative;
  background: ${({ theme }) => theme.colors.background};
  
  /* Modern animated background */
  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 50%, rgba(76, 190, 243, 0.03) 0%, transparent 50%),
      radial-gradient(circle at 80% 80%, rgba(152, 93, 215, 0.03) 0%, transparent 50%),
      radial-gradient(circle at 40% 20%, rgba(200, 72, 175, 0.03) 0%, transparent 50%);
    pointer-events: none;
    z-index: -1;
  }
`;

const LoadingContent = styled.div`
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 48px;
  box-shadow: 0 8px 32px rgba(152, 93, 215, 0.1);
  border: 1px solid rgba(152, 93, 215, 0.1);
  text-align: center;
  animation: ${fadeIn} 0.5s ease-out;
`;

const Message = styled.p`
  margin-top: 1.5rem;
  font-size: 1.1rem;
  color: ${({ theme }) => theme.colors.text};
  font-weight: 500;
`;

export default function StudentRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Perform the redirect as soon as the component mounts
    console.log('[Student Page] Redirecting to /student/dashboard...');
    router.replace('/student/dashboard'); // Use replace to not add this page to history
  }, [router]);

  // Display a loading/redirecting message while the redirect happens
  return (
    <RedirectPageWrapper>
      <LoadingContent>
        <LoadingSpinner size="large" />
        <Message>Redirecting to your dashboard...</Message>
      </LoadingContent>
    </RedirectPageWrapper>
  );
}