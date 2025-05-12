// src/app/student/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Container } from '@/styles/StyledComponents'; // For basic layout if needed during redirect
import LoadingSpinner from '@/components/shared/LoadingSpinner'; // For a brief loading display

const RedirectPageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh; // Take up most of the viewport
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl};
`;

const Message = styled.p`
  margin-top: ${({ theme }) => theme.spacing.lg};
  font-size: 1.1rem;
  color: ${({ theme }) => theme.colors.textLight};
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
    <Container>
      <RedirectPageWrapper>
        <LoadingSpinner size="large" />
        <Message>Redirecting to your dashboard...</Message>
      </RedirectPageWrapper>
    </Container>
  );
}