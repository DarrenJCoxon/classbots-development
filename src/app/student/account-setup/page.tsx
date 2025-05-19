'use client';

import { useState } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, FormGroup, Label, Input, Button, Alert } from '@/styles/StyledComponents';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

const PageWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.backgroundDark};
`;

const SetupCard = styled(Card)`
  width: 100%;
  max-width: 450px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
`;

const Title = styled.h1`
  font-size: 2rem;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.primary};
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
  padding: ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.green}10;
  border: 1px solid ${({ theme }) => theme.colors.green};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  margin: ${({ theme }) => theme.spacing.lg} 0;
  text-align: center;
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
            
            <Button 
              type="submit" 
              disabled={isLoading} 
              style={{ width: '100%' }} 
              size="large"
            >
              {isLoading ? 'Setting Up...' : 'Create Account'}
            </Button>
          </Form>
        )}
      </SetupCard>
    </PageWrapper>
  );
}