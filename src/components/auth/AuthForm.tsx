// src/components/auth/AuthForm.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styled from 'styled-components';
import { createClient } from '@/lib/supabase/client';
import { Card, FormGroup, Label, Input, Button as StyledButton, Alert, Select as StyledSelect } from '@/styles/StyledComponents';

const AuthCard = styled(Card)`
  max-width: 400px;
  margin: 4rem auto;
`;

const HelpText = styled.div`
  font-size: 0.95em;
  color: ${({ theme }) => theme.colors.textLight};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

const Title = styled.h1`
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  color: ${({ theme }) => theme.colors.primary};
`;

const InfoBox = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.backgroundCard};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  
  p {
    margin-bottom: ${({ theme }) => theme.spacing.sm};
    color: ${({ theme }) => theme.colors.textLight};
  }
  
  strong {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

interface AuthFormProps {
  type: 'login' | 'signup';
}

export default function AuthForm({ type }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const redirectTo = searchParams?.get('redirect') || '/';

  const checkUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      router.push(redirectTo);
    }
  }, [supabase, router, redirectTo]);

  useEffect(() => {
    checkUser();
  }, [checkUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (type === 'signup' && !fullName.trim()) {
      setError('Full name is required');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      if (type === 'signup') {
        const role = 'teacher'; // Only teachers use email signup
        
        const signupData: { role: string; full_name: string; country_code?: string | null } = {
            role: role,
            full_name: fullName,
        };

        signupData.country_code = countryCode.trim() || null;
        
        // Always redirect to teacher dashboard for teacher signups
        const teacherRedirect = '/teacher-dashboard';
        
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(teacherRedirect)}`,
            data: signupData
          },
        });
        
        if (signUpError) {
          console.error('Signup error details:', signUpError);
          throw signUpError;
        }
        
        alert('Check your email for the confirmation link! Please also check your spam folder.');
      } else { 
        // For login, first determine user information to ensure correct redirect
        const { error: signInError, data } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (signInError) {
          throw signInError;
        }
        
        const userId = data.user?.id;
        
        if (userId) {
          // Check user's role to force specific redirect
          const { data: profileData } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', userId)
            .single();
            
          const role = profileData?.role || data.user?.user_metadata?.role;
          console.log(`[AuthForm] User logged in with role: ${role}`);
          
          if (role === 'teacher') {
            // Force teacher dashboard redirect
            router.push('/teacher-dashboard');
          } else if (role === 'student') {
            // Force student dashboard redirect
            router.push('/student/dashboard');
          } else {
            // Use default redirect
            router.push(redirectTo);
          }
        } else {
          // Fall back to default redirect if we can't determine role
          router.push(redirectTo);
        }
        
        router.refresh();
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard>
      <Title>{type === 'login' ? 'Login' : 'Teacher Sign Up'}</Title>
      
      {type === 'signup' && ( 
        <InfoBox>
          <p><strong>For Teachers:</strong> Sign up here to create your teacher account.</p>
          <p><strong>For Students:</strong> Use the &quot;Join Classroom&quot; button on the homepage to join with a room code.</p>
        </InfoBox>
      )}
      
      {type === 'login' && (
        <InfoBox>
          <p><strong>For Teachers:</strong> Log in with your email and password.</p>
          <p><strong>For Students:</strong> If you&apos;ve set up an account via the Account Setup page, you can log in here.</p>
        </InfoBox>
      )}
      
      {error && <Alert variant="error">{error}</Alert>}
      
      <form onSubmit={handleSubmit}>
        {type === 'signup' && ( 
          <>
            <FormGroup>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </FormGroup>
            <FormGroup>
               <Label htmlFor="countryCode">Your Country (Optional)</Label>
               <StyledSelect
                   id="countryCode"
                   name="countryCode"
                   value={countryCode}
                   onChange={(e) => setCountryCode(e.target.value)}
               >
                   <option value="">Select Country</option>
                   <option value="US">United States</option>
                   <option value="GB">United Kingdom</option>
                   <option value="CA">Canada</option>
                   <option value="AU">Australia</option>
                   <option value="MY">Malaysia</option>
                   <option value="NZ">New Zealand</option>
                   <option value="AE">United Arab Emirates</option>
                   <option value="EU">EU (Other)</option>
               </StyledSelect>
               <HelpText>Selecting your country helps us provide localized safety resources for your students if a concern is flagged.</HelpText>
            </FormGroup>
          </>
        )}
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
        </FormGroup>
        <FormGroup>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />
        </FormGroup>
        <StyledButton type="submit" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Loading...' : type === 'login' ? 'Login' : 'Sign Up as Teacher'}
        </StyledButton>
      </form>
    </AuthCard>
  );
}