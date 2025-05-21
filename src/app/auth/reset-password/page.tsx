'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { createClient } from '@/lib/supabase/client';
import { Card, FormGroup, Label, Input, Button as StyledButton, Alert } from '@/styles/StyledComponents';

const AuthCard = styled(Card)`
  max-width: 400px;
  margin: 4rem auto;
`;

const Title = styled.h1`
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  color: ${({ theme }) => theme.colors.primary};
`;

const AuthPage = styled.div`
  padding: ${({ theme }) => theme.spacing.xl};
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
`;

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Check if user is authenticated via the reset link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // If no session, redirect to login with error
        router.push('/auth?error=reset_session_expired');
      }
    };
    
    checkSession();
  }, [supabase, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        console.error('Password update error:', error);
        throw error;
      }
      
      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/auth?message=password_updated');
      }, 3000);
      
    } catch (error) {
      console.error('Password reset error:', error);
      if (error instanceof Error) {
        if (error.message.includes('session')) {
          setError('Your reset link has expired. Please request a new password reset.');
        } else {
          setError(error.message);
        }
      } else {
        setError('Failed to update password');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthPage>
        <AuthCard>
          <Title>Password Updated!</Title>
          <Alert variant="success">
            Your password has been successfully updated. You will be redirected to the login page shortly.
          </Alert>
        </AuthCard>
      </AuthPage>
    );
  }

  return (
    <AuthPage>
      <AuthCard>
        <Title>Reset Your Password</Title>
        
        {error && <Alert variant="error">{error}</Alert>}
        
        <form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter your new password"
              required
              minLength={6}
            />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your new password"
              required
              minLength={6}
            />
          </FormGroup>
          <StyledButton type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Updating...' : 'Update Password'}
          </StyledButton>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button
            type="button"
            onClick={() => router.push('/auth')}
            style={{
              background: 'none',
              border: 'none',
              color: '#0066CC',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: '0.9rem'
            }}
          >
            Back to Login
          </button>
        </div>
      </AuthCard>
    </AuthPage>
  );
}