// src/app/auth/page.tsx
'use client';

import { useState, Suspense } from 'react';
import styled from 'styled-components';
import { useSearchParams } from 'next/navigation';
import AuthForm from '@/components/auth/AuthForm';
import { Container } from '@/styles/StyledComponents';

const AuthPage = styled.div`
  padding: ${({ theme }) => theme.spacing.xl};
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
`;

const ToggleButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;
  margin-top: ${({ theme }) => theme.spacing.md};
  text-align: center;
  display: block;
  width: 100%;

  &:hover {
    text-decoration: underline;
  }
`;

const LoadingFallback = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.lg};
  color: ${({ theme }) => theme.colors.textMuted};
`;

// Separate component for content that uses search params
function AuthContent() {
  const searchParams = useSearchParams();
  const urlAuthTypeParam = searchParams?.get('type'); // Get the 'type' param

  // MODIFIED: Logic to determine initial authType
  // Default to 'signup' if type includes 'signup' (e.g., 'student_signup', 'teacher_signup')
  // or if it's just 'student' (which implies student signup).
  // Otherwise, default to 'login'.
  const determineInitialAuthType = () => {
    if (urlAuthTypeParam) {
      if (urlAuthTypeParam.includes('signup') || urlAuthTypeParam === 'student') {
        return 'signup';
      }
    }
    return 'login'; // Default to login if no specific signup type is indicated
  };

  const [authType, setAuthType] = useState<'login' | 'signup'>(determineInitialAuthType());

  return (
    <>
      <AuthForm type={authType} />
      <ToggleButton onClick={() => setAuthType(authType === 'login' ? 'signup' : 'login')}>
        {authType === 'login' ? 'Need an account? Sign up' : 'Already have an account? Login'}
      </ToggleButton>
    </>
  );
}

export default function Auth() {
  return (
    <AuthPage>
      <Container>
        <Suspense fallback={<LoadingFallback>Loading...</LoadingFallback>}>
          <AuthContent />
        </Suspense>
      </Container>
    </AuthPage>
  );
}