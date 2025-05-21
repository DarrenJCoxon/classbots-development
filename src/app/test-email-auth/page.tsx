// src/app/test-email-auth/page.tsx
'use client';

import { useState } from 'react';
import styled from 'styled-components';
import { createClient } from '@/lib/supabase/client';
import { Card, Button, Input, Alert } from '@/styles/StyledComponents';

const TestWrapper = styled.div`
  max-width: 600px;
  margin: 2rem auto;
  padding: 2rem;
`;

const Title = styled.h1`
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: 2rem;
  text-align: center;
`;

const FormGroup = styled.div`
  margin-bottom: 1rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
`;

const ResultBox = styled.pre`
  background: ${({ theme }) => theme.colors.backgroundCard};
  padding: 1rem;
  border-radius: 0.5rem;
  margin-top: 1rem;
  overflow-x: auto;
  font-size: 0.9rem;
  max-height: 400px;
  overflow-y: auto;
`;

export default function TestEmailAuth() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  
  const supabase = createClient();

  const testSignUp = async () => {
    if (!email) {
      setError('Please enter an email address');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      console.log('Testing signup with email:', email);
      
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email,
        password: 'TestPassword123!', // Temporary test password
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent('/teacher-dashboard')}`,
          data: {
            role: 'teacher',
            full_name: 'Test User'
          }
        },
      });

      console.log('Signup response:', { data, error: signUpError });

      if (signUpError) {
        setError(`Signup Error: ${signUpError.message}`);
        setResult({
          error: signUpError,
          type: 'signup_error'
        });
      } else {
        setResult({
          data,
          type: 'success',
          message: 'Signup successful! Check your email.'
        });
      }

    } catch (err) {
      console.error('Unexpected error:', err);
      setError(`Unexpected error: ${err}`);
      setResult({
        error: err,
        type: 'unexpected_error'
      });
    } finally {
      setLoading(false);
    }
  };

  const testEmailSettings = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      // Test getting current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      console.log('Current user check:', { userData, userError });

      // Test getting session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      console.log('Current session check:', { sessionData, sessionError });

      setResult({
        currentUser: userData,
        userError,
        currentSession: sessionData,
        sessionError,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        type: 'settings_check'
      });

    } catch (err) {
      console.error('Settings check error:', err);
      setError(`Settings check error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!email) {
      setError('Please enter an email address');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const { data, error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`
      });

      console.log('Password reset response:', { data, error: resetError });

      if (resetError) {
        setError(`Reset Error: ${resetError.message}`);
        setResult({
          error: resetError,
          type: 'reset_error'
        });
      } else {
        setResult({
          data,
          type: 'reset_success',
          message: 'Password reset email sent! Check your email.'
        });
      }

    } catch (err) {
      console.error('Reset error:', err);
      setError(`Reset error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TestWrapper>
      <Card style={{ padding: '2rem' }}>
        <Title>Email Authentication Test</Title>
        
        <FormGroup>
          <Label htmlFor="email">Test Email Address:</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter a test email address"
          />
        </FormGroup>

        {error && <Alert variant="error">{error}</Alert>}

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', margin: '1rem 0' }}>
          <Button 
            onClick={testSignUp} 
            disabled={loading}
            variant="primary"
          >
            {loading ? 'Testing...' : 'Test Signup Email'}
          </Button>
          
          <Button 
            onClick={resetPassword} 
            disabled={loading}
            variant="secondary"
          >
            {loading ? 'Testing...' : 'Test Password Reset Email'}
          </Button>
          
          <Button 
            onClick={testEmailSettings} 
            disabled={loading}
            variant="outline"
          >
            {loading ? 'Checking...' : 'Check Auth Settings'}
          </Button>
        </div>

        {result && (
          <div>
            <h3>Test Result:</h3>
            <ResultBox>
              {JSON.stringify(result, null, 2)}
            </ResultBox>
          </div>
        )}

        <div style={{ marginTop: '2rem', padding: '1rem', background: '#f5f5f5', borderRadius: '0.5rem' }}>
          <h4>Debugging Steps:</h4>
          <ol>
            <li><strong>Test Signup Email:</strong> Tries to create a new account and send confirmation email</li>
            <li><strong>Test Password Reset:</strong> Tries to send a password reset email</li>
            <li><strong>Check Auth Settings:</strong> Displays current auth state and configuration</li>
          </ol>
          
          <h4>What to Check in Supabase Dashboard:</h4>
          <ul>
            <li>Authentication → Settings → Email Templates (enabled?)</li>
            <li>Authentication → Settings → SMTP Settings (configured?)</li>
            <li>Authentication → Settings → Email Auth (enabled?)</li>
            <li>Authentication → Users (do test users appear?)</li>
            <li>Logs section for any email delivery errors</li>
          </ul>
        </div>
      </Card>
    </TestWrapper>
  );
}