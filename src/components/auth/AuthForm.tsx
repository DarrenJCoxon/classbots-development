// src/components/auth/AuthForm.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styled from 'styled-components';
import { createClient } from '@/lib/supabase/client';
import { Card, FormGroup, Label, Input, Button as StyledButton, Alert, Select as StyledSelect } from '@/styles/StyledComponents'; // Removed HelpText

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
  const [countryCode, setCountryCode] = useState(''); // <--- ADDED for country selection
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const isStudentSignup = searchParams?.get('type') === 'student';
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
        const role = isStudentSignup ? 'student' : 'teacher';
        
        // Prepare options.data, including country_code for teachers
        const signupData: { role: string; full_name: string; country_code?: string | null } = {
            role: role,
            full_name: fullName,
        };

        if (role === 'teacher') {
            signupData.country_code = countryCode.trim() || null; // Add country_code if teacher and it's set
        }
        
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
            data: signupData // Use the prepared signupData
          },
        });
        
        if (signUpError) {
          console.error('Signup error details:', signUpError);
          throw signUpError;
        }
        
        if (isStudentSignup) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (!signInError && signInData.user) {
            router.push(redirectTo);
          } else {
            setError('Account created! Please log in to continue.');
            setTimeout(() => {
              router.push(`/auth?type=login&redirect=${encodeURIComponent(redirectTo)}`);
            }, 3000);
          }
        } else { // Teacher signup
          alert('Check your email for the confirmation link! Please also check your spam folder.');
        }
      } else { // Login
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          throw signInError;
        }
        router.push(redirectTo);
        router.refresh();
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Special UI for student signup
  if (isStudentSignup && type === 'signup') {
    return (
      <AuthCard>
        <Title>Student Sign Up</Title>
        <InfoBox>
          <p><strong>For Students:</strong> Sign up here to join your classroom.</p>
        </InfoBox>
        {error && <Alert variant="error">{error}</Alert>}
        <form onSubmit={handleSubmit}>
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
              placeholder="Create a password"
              required
            />
          </FormGroup>
          <StyledButton type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Creating Account...' : 'Sign Up as Student'}
          </StyledButton>
        </form>
      </AuthCard>
    );
  }

  // Regular auth form for teachers (signup/login) or general login
  return (
    <AuthCard>
      <Title>{type === 'login' ? 'Login' : 'Teacher Sign Up'}</Title>
      
      {type === 'signup' && ( // This block is for Teacher Signup or general Signup
        <InfoBox>
          <p><strong>For Teachers:</strong> Sign up here to create your teacher account.</p>
          {!isStudentSignup && ( // Only show student info if not already in student signup flow
             <p><strong>For Students:</strong> Ask your teacher for a join link to create your account.</p>
          )}
        </InfoBox>
      )}
      
      {error && <Alert variant="error">{error}</Alert>}
      
      <form onSubmit={handleSubmit}>
        {type === 'signup' && ( // Fields specific to signup
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
            {/* ADDED Country Code Dropdown FOR TEACHER SIGNUP */}
            {!isStudentSignup && ( // Only show for teacher signup
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
                        <option value="NZ">New Zealand</option>
                        <option value="EU">EU</option>
                        {/* Add more relevant countries as needed */}
                    </StyledSelect>
                    <HelpText>Selecting your country helps us provide localized safety resources for your students if a concern is flagged.</HelpText>
                 </FormGroup>
            )}
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