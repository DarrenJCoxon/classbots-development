'use client';

import { useState } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { FormGroup, Label, Input, Alert } from '@/styles/StyledComponents';
import { ModernButton } from '@/components/shared/ModernButton';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

const PageWrapper = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  
  /* Subtle animated background */
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
    z-index: 0;
  }
`;

const SetupCard = styled.div`
  width: 100%;
  max-width: 450px;
  text-align: center;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(152, 93, 215, 0.1);
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06);
  position: relative;
  z-index: 1;
`;

const Title = styled.h1`
  font-size: 32px;
  font-weight: 800;
  margin-bottom: 16px;
  font-family: ${({ theme }) => theme.fonts.heading};
  text-transform: uppercase;
  letter-spacing: 1px;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.secondary}
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Subtitle = styled.p`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  color: ${({ theme }) => theme.colors.textLight};
  line-height: 1.5;
`;

const Form = styled.form`
  margin-top: ${({ theme }) => theme.spacing.lg};
  text-align: left;
`;

const HelpText = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.textMuted};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

const SuccessBox = styled.div`
  padding: 24px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 12px;
  margin: 24px 0;
  text-align: center;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
`;

export default function StudentAccountSetup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    try {
      // First get the current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData.user) {
        throw new Error('You must be logged in to set up your account');
      }

      // Update the user's email and password
      const { error: updateError } = await supabase.auth.updateUser({
        email: email,
        password: password
      });

      if (updateError) {
        throw updateError;
      }

      // Update the profile email as well
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ email: email, is_anonymous: false })
        .eq('user_id', userData.user.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
      }

      setSuccess(true);
      
      // Redirect after a delay
      setTimeout(() => {
        router.push('/student/dashboard');
      }, 3000);
    } catch (err) {
      console.error('Error setting up student account:', err);
      setError(err instanceof Error ? err.message : 'Failed to set up account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageWrapper>
      <SetupCard>
        <Title>Set Up Your Account</Title>
        <Subtitle>
          Create a permanent account to access your classrooms from any device. 
          Set your email and password below.
        </Subtitle>

        {error && <Alert variant="error">{error}</Alert>}
        
        {success ? (
          <SuccessBox>
            <h3>Account Successfully Created!</h3>
            <p>You can now use your email and password to log in from any device.</p>
            <p>Redirecting to your dashboard...</p>
            <LoadingSpinner size="small" />
          </SuccessBox>
        ) : (
          <Form onSubmit={handleSubmit}>
            <FormGroup>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
              <HelpText>You&apos;ll use this email to log in to your account</HelpText>
            </FormGroup>
            
            <FormGroup>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                required
              />
            </FormGroup>
            
            <FormGroup>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
              />
            </FormGroup>
            
            <ModernButton 
              type="submit" 
              disabled={isLoading} 
              style={{ width: '100%' }} 
              size="large"
            >
              {isLoading ? 'Setting Up...' : 'Create Account'}
            </ModernButton>
          </Form>
        )}
      </SetupCard>
    </PageWrapper>
  );
}