'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Container } from '@/styles/StyledComponents';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

const LoadingPage = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
`;

const Message = styled.p`
  text-align: center;
  font-size: 1.2rem;
  color: ${({ theme }) => theme.colors.textLight};
`;

export default function StudentLoginRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    // Just redirect to the student-access page
    setTimeout(() => {
      router.push('/student-access');
    }, 500); // Reduced delay for faster transition
  }, [router]);
  
  return (
    <Container>
      <LoadingPage>
        <LoadingSpinner size="large" />
        <Message>
          Taking you to the student login page...
        </Message>
      </LoadingPage>
    </Container>
  );
}