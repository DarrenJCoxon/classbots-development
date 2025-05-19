'use client';

import { useState, Suspense, useEffect } from 'react';
import styled from 'styled-components';
import { useSearchParams, useRouter } from 'next/navigation';
import AuthForm from '@/components/auth/AuthForm';
import { Container, Alert, Button } from '@/styles/StyledComponents';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

const AuthPage = styled.div`
  padding: ${({ theme }) => theme.spacing.xl};
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
`;

const StyledAlert = styled(Alert)`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const TabContainer = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const TabButtons = styled.div`
  display: flex;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const TabButton = styled.button<{ $active: boolean }>`
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  background: none;
  border: none;
  border-bottom: 3px solid ${({ theme, $active }) => $active ? theme.colors.primary : 'transparent'};
  color: ${({ theme, $active }) => $active ? theme.colors.primary : theme.colors.textLight};
  font-weight: ${({ $active }) => $active ? 'bold' : 'normal'};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
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

const StudentRedirectCard = styled.div`
  background: ${({ theme }) => theme.colors.backgroundDark};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  padding: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  text-align: center;
`;

function AuthContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlLoginType = searchParams?.get('login');
  const urlType = searchParams?.get('type');
  const [redirecting, setRedirecting] = useState(false);
  
  // Redirect student logins to the new student access page
  useEffect(() => {
    if (urlLoginType === 'student') {
      setRedirecting(true);
      setTimeout(() => {
        router.push('/student-access');
      }, 2000);
    }
  }, [urlLoginType, router]);
  
  // Determine if we should show signup instead of login
  // Check if the URL has type=teacher_signup parameter
  const isSignup = urlType === 'teacher_signup';
  
  if (redirecting) {
    return (
      <AuthPage>
        <Container>
          <StudentRedirectCard>
            <h2>Student Login</h2>
            <p>We&apos;ve improved the student login experience!</p>
            <p>Redirecting you to the new student login page...</p>
            <div style={{ margin: '1rem auto', textAlign: 'center' }}>
              <LoadingSpinner size="medium" />
            </div>
            <Button onClick={() => router.push('/student-access')}>
              Go to Student Login Now
            </Button>
          </StudentRedirectCard>
        </Container>
      </AuthPage>
    );
  }
  
  return (
    <AuthPage>
      <Container>
        {urlLoginType === 'student' ? (
          <StyledAlert variant="info">
            The student login page has moved. Please use the new student access page.
            <Button onClick={() => router.push('/student-access')} style={{ marginTop: '1rem' }}>
              Go to Student Access
            </Button>
          </StyledAlert>
        ) : (
          <Suspense fallback={<LoadingFallback>Loading...</LoadingFallback>}>
            <TabContainer>
              <TabButtons>
                <TabButton 
                  $active={!isSignup}
                  onClick={() => router.push('/auth')}
                >
                  Teacher Login
                </TabButton>
                <TabButton 
                  $active={isSignup}
                  onClick={() => router.push('/auth?type=teacher_signup')}
                >
                  Teacher Sign Up
                </TabButton>
              </TabButtons>
              
              <AuthForm type={isSignup ? 'signup' : 'login'} />
            </TabContainer>
            
            {!isSignup ? (
              <ToggleButton onClick={() => router.push('/auth?type=teacher_signup')}>
                Need a teacher account? Sign up
              </ToggleButton>
            ) : (
              <ToggleButton onClick={() => router.push('/auth')}>
                Already have an account? Log in
              </ToggleButton>
            )}
          </Suspense>
        )}
      </Container>
    </AuthPage>
  );
}

// Export the page with a Suspense boundary
export default function Auth() {
  return (
    <Suspense fallback={<div>Loading auth page...</div>}>
      <AuthContent />
    </Suspense>
  );
}