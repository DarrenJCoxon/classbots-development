'use client';

import { useState, Suspense, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import AuthForm from '@/components/auth/AuthForm';
import { Alert } from '@/styles/StyledComponents';
import { Button } from '@/components/ui';
import { FullPageLoader } from '@/components/shared/AnimatedLoader';
import { FiArrowRight } from 'react-icons/fi';

const AuthPage = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
  position: relative;
  
  /* Subtle animated background */
  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 50%, rgba(152, 93, 215, 0.03) 0%, transparent 50%),
      radial-gradient(circle at 80% 80%, rgba(76, 190, 243, 0.03) 0%, transparent 50%),
      radial-gradient(circle at 40% 20%, rgba(200, 72, 175, 0.03) 0%, transparent 50%);
    pointer-events: none;
    z-index: 0;
  }
`;

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 60px 24px;
  position: relative;
  z-index: 1;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 40px 16px;
  }
`;

const AuthContainer = styled(motion.div)`
  max-width: 480px;
  margin: 0 auto;
`;

const TabContainer = styled.div`
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 40px;
  border: 1px solid rgba(152, 93, 215, 0.1);
  box-shadow: 0 10px 40px rgba(152, 93, 215, 0.05);
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 24px;
  }
`;

const TabButtons = styled.div`
  display: flex;
  background: ${({ theme }) => theme.colors.backgroundDark};
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 32px;
`;

const TabButton = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 12px 24px;
  background: ${({ $active, theme }) => $active ? 'white' : 'transparent'};
  border: none;
  border-radius: 8px;
  color: ${({ theme, $active }) => $active ? theme.colors.primary : theme.colors.textLight};
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: ${({ $active }) => $active ? '0 2px 8px rgba(0, 0, 0, 0.05)' : 'none'};
  
  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const ToggleButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;
  margin-top: 24px;
  text-align: center;
  display: block;
  width: 100%;
  font-size: 14px;
  font-weight: 500;
  transition: color 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.primaryDark};
    text-decoration: underline;
  }
`;

const StyledAlert = styled(Alert)`
  margin-bottom: 24px;
`;

const StudentRedirectCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(76, 190, 243, 0.2);
  border-radius: 20px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 10px 40px rgba(76, 190, 243, 0.1);
  max-width: 480px;
  margin: 0 auto;
  
  h2 {
    font-family: ${({ theme }) => theme.fonts.heading};
    text-transform: uppercase;
    color: ${({ theme }) => theme.colors.blue};
    margin-bottom: 16px;
  }
  
  p {
    color: ${({ theme }) => theme.colors.textLight};
    margin-bottom: 12px;
    line-height: 1.6;
  }
  
  .loader-wrapper {
    margin: 24px 0;
  }
`;

function AuthContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlLoginType = searchParams?.get('login');
  const urlType = searchParams?.get('type');
  const urlMessage = searchParams?.get('message');
  const urlError = searchParams?.get('error');
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
          <StudentRedirectCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h2>Student Login</h2>
            <p>We&apos;ve improved the student login experience!</p>
            <p>Redirecting you to the new student login page...</p>
            <div className="loader-wrapper">
              <FullPageLoader message="" variant="dots" />
            </div>
            <Button 
              variant="secondary"
              onClick={() => router.push('/student-access')}
              iconRight={<FiArrowRight />}
            >
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
            <Button 
              variant="secondary"
              onClick={() => router.push('/student-access')} 
              style={{ marginTop: '16px' }}
              iconRight={<FiArrowRight />}
            >
              Go to Student Access
            </Button>
          </StyledAlert>
        ) : (
          <AuthContainer
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {urlMessage === 'password_updated' && (
              <StyledAlert variant="success">
                Your password has been successfully updated! You can now log in with your new password.
              </StyledAlert>
            )}
            
            {urlError === 'reset_session_expired' && (
              <StyledAlert variant="error">
                Your password reset link has expired. Please request a new one below.
              </StyledAlert>
            )}
            
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
          </AuthContainer>
        )}
      </Container>
    </AuthPage>
  );
}

// Export the page with a Suspense boundary
export default function Auth() {
  return (
    <Suspense fallback={<FullPageLoader message="Loading..." variant="dots" />}>
      <AuthContent />
    </Suspense>
  );
}