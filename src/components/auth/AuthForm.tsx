// src/components/auth/AuthForm.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styled from 'styled-components';
import { createClient } from '@/lib/supabase/client';
import { FormGroup, Label, Input, Alert, Select as StyledSelect } from '@/styles/StyledComponents';
import { ModernButton } from '@/components/shared/ModernButton';

const AuthFormContainer = styled.div`
  width: 100%;
`;

const HelpText = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textLight};
  margin-top: 8px;
  line-height: 1.5;
`;

const Title = styled.h2`
  text-align: center;
  margin-bottom: 32px;
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.fonts.heading};
  text-transform: uppercase;
  font-size: 28px;
  font-weight: 700;
`;

const InfoBox = styled.div`
  margin-bottom: 24px;
  padding: 16px;
  background: rgba(152, 93, 215, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(152, 93, 215, 0.1);
  
  p {
    margin-bottom: 8px;
    color: ${({ theme }) => theme.colors.textLight};
    font-size: 14px;
    line-height: 1.6;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
  
  strong {
    color: ${({ theme }) => theme.colors.primary};
    font-weight: 600;
  }
`;

const StyledFormGroup = styled(FormGroup)`
  margin-bottom: 20px;
`;

const StyledLabel = styled(Label)`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 8px;
  display: block;
`;

const StyledInput = styled(Input)`
  background: rgba(255, 255, 255, 0.8);
  border: 2px solid ${({ theme }) => theme.colors.border};
  transition: all 0.2s ease;
  
  &:focus {
    background: white;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary}20;
  }
`;

const StyledAlert = styled(Alert)`
  margin-bottom: 20px;
`;

const StyledSelectWrapper = styled(StyledSelect)`
  background: rgba(255, 255, 255, 0.8);
  border: 2px solid ${({ theme }) => theme.colors.border};
  transition: all 0.2s ease;
  
  &:focus {
    background: white;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary}20;
  }
`;

const ForgotPasswordLink = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;
  text-decoration: underline;
  font-size: 14px;
  padding: 0;
  margin-top: 16px;
  display: block;
  text-align: center;
  width: 100%;
  transition: color 0.2s ease;
  
  &:hover {
    color: ${({ theme }) => theme.colors.primaryDark};
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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
        
        const redirectUrl = `https://skolr.app/auth/callback?redirect=${encodeURIComponent(teacherRedirect)}`;
        console.log('Signup redirect URL:', redirectUrl);
        
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // Remove emailRedirectTo to use site_url from Supabase config instead
            data: signupData
          },
        });
        
        if (signUpError) {
          console.error('Signup error details:', signUpError);
          
          // Handle common signup errors with user-friendly messages
          if (signUpError.message.includes('User already registered')) {
            throw new Error('An account with this email address already exists. Please try logging in instead, or use the password reset option if you\'ve forgotten your password.');
          } else if (signUpError.message.includes('Invalid email')) {
            throw new Error('Please enter a valid email address.');
          } else if (signUpError.message.includes('Password should be at least')) {
            throw new Error('Password must be at least 6 characters long.');
          } else if (signUpError.message.includes('rate limit')) {
            throw new Error('Too many signup attempts. Please wait a few minutes before trying again.');
          } else if (signUpError.message.includes('email sending')) {
            throw new Error('Unable to send confirmation email. Please check your email address and try again, or contact support if the problem persists.');
          }
          
          // Default to original error for unknown cases
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
          console.error('Sign in error details:', signInError);
          
          // Handle common login errors with user-friendly messages
          if (signInError.message.includes('Invalid login credentials')) {
            throw new Error('Invalid email or password. Please check your credentials and try again.');
          } else if (signInError.message.includes('Email not confirmed')) {
            throw new Error('Please check your email and click the confirmation link before logging in. Check your spam folder if you don\'t see it.');
          } else if (signInError.message.includes('Too many requests')) {
            throw new Error('Too many login attempts. Please wait a few minutes before trying again.');
          } else if (signInError.message.includes('rate limit')) {
            throw new Error('Too many login attempts. Please wait a few minutes before trying again.');
          }
          
          // Default to original error for unknown cases
          throw signInError;
        }
        
        const userId = data.user?.id;
        
        if (userId) {
          // Check user's role to force specific redirect
          // Try student_profiles first
          const { data: studentProfile } = await supabase
            .from('student_profiles')
            .select('user_id')
            .eq('user_id', userId)
            .maybeSingle();
          
          // Then try teacher_profiles
          const { data: teacherProfile } = await supabase
            .from('teacher_profiles')
            .select('user_id')
            .eq('user_id', userId)
            .maybeSingle();
            
          const role = teacherProfile ? 'teacher' : studentProfile ? 'student' : data.user?.user_metadata?.role;
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
    <AuthFormContainer>
      <Title>{type === 'login' ? 'Welcome Back' : 'Create Account'}</Title>
      
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
      
      {error && <StyledAlert variant="error">{error}</StyledAlert>}
      
      <form onSubmit={handleSubmit}>
        {type === 'signup' && ( 
          <>
            <StyledFormGroup>
              <StyledLabel htmlFor="fullName">Full Name</StyledLabel>
              <StyledInput
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </StyledFormGroup>
            <StyledFormGroup>
               <StyledLabel htmlFor="countryCode">Your Country (Optional)</StyledLabel>
               <StyledSelectWrapper
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
               </StyledSelectWrapper>
               <HelpText>Selecting your country helps us provide localized safety resources for your students if a concern is flagged.</HelpText>
            </StyledFormGroup>
          </>
        )}
        <StyledFormGroup>
          <StyledLabel htmlFor="email">Email</StyledLabel>
          <StyledInput
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
          />
        </StyledFormGroup>
        <StyledFormGroup>
          <StyledLabel htmlFor="password">Password</StyledLabel>
          <StyledInput
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />
        </StyledFormGroup>
        <ModernButton 
          type="submit" 
          disabled={loading} 
          variant="primary"
          size="large"
          style={{ width: '100%', marginTop: '24px' }}
        >
          {loading ? 'Loading...' : type === 'login' ? 'Login' : 'Sign Up as Teacher'}
        </ModernButton>
        
        {type === 'login' && (
          <ForgotPasswordLink
            type="button"
            onClick={async () => {
              if (!email.trim()) {
                setError('Please enter your email address first');
                return;
              }
              
              try {
                setLoading(true);
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                  redirectTo: `https://skolr.app/auth/update-password`,
                });
                
                if (error) throw error;
                alert('Password reset email sent! Please check your email and spam folder.');
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to send reset email');
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
          >
            Forgot Password?
          </ForgotPasswordLink>
        )}
      </form>
    </AuthFormContainer>
  );
}