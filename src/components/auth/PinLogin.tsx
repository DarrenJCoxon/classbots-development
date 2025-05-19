// src/components/auth/PinLogin.tsx
'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/navigation';
import { Card, FormGroup, Label, Input, Button, Alert } from '@/styles/StyledComponents';

const StyledCard = styled(Card)`
  margin-top: ${({ theme }) => theme.spacing.xl};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const Title = styled.h2`
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  text-align: center;
`;

const FormContainer = styled.form`
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

const PinInputContainer = styled.div`
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const PinInput = styled(Input)`
  width: 100%;
  text-align: center;
  font-size: 1.5rem;
  letter-spacing: 1rem;
  padding: ${({ theme }) => theme.spacing.md};
  font-weight: bold;
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  margin: ${({ theme }) => theme.spacing.lg} 0;
  
  &:before, &:after {
    content: '';
    flex: 1;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }
  
  span {
    padding: 0 ${({ theme }) => theme.spacing.md};
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.9rem;
  }
`;

const InfoText = styled.p`
  text-align: center;
  color: ${({ theme }) => theme.colors.textLight};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const PinExample = styled.div`
  margin-top: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.sm};
  background-color: ${({ theme }) => theme.colors.backgroundDark};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.textMuted};
  text-align: center;
`;

const Note = styled.div`
  margin-top: ${({ theme }) => theme.spacing.md};
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.textMuted};
  text-align: center;
`;

const DebugInfo = styled.div`
  margin-top: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.sm};
  background-color: ${({ theme }) => theme.colors.backgroundDark};
  border-radius: ${({ theme }) => theme.borderRadius.small};
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textMuted};
  font-family: ${({ theme }) => theme.fonts.mono};
  max-height: 200px;
  overflow-y: auto;
  white-space: pre-wrap;
`;

const ResultBox = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  background-color: ${({ theme }) => theme.colors.backgroundDark};
  border-radius: ${({ theme }) => theme.borderRadius.small};
  margin: ${({ theme }) => theme.spacing.md} 0;
  
  .name {
    font-weight: bold;
    color: ${({ theme }) => theme.colors.text};
    font-size: 1.1rem;
  }
  
  .username {
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.mono};
    font-weight: 500;
  }
  
  p {
    margin: ${({ theme }) => theme.spacing.xs} 0;
  }
`;

interface PinLoginProps {
  onLoginSuccess?: () => void;
  redirectTo?: string;
}

export default function PinLogin({ onLoginSuccess, redirectTo = '/student/dashboard' }: PinLoginProps) {
  // Ensure we're redirecting to the student dashboard after login
  // '/student/dashboard' is the correct path for authenticated students
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchFound, setMatchFound] = useState<{ full_name: string; user_id: string } | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [debugInfo, setDebugInfo] = useState<(string | Record<string, unknown>)[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const router = useRouter();

  // Toggle debug info with "d" key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'd' && e.ctrlKey && e.shiftKey) {
        setShowDebug(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const addDebugInfo = (info: string | Record<string, unknown>) => {
    console.log('Debug:', info);
    setDebugInfo(prev => [...prev, info]);
  };
  
  // Check if a student matches this identifier without verifying PIN
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const checkForStudentMatch = async (): Promise<void> => {
    if (!identifier.trim()) return;
    
    setIsChecking(true);
    setError(null);
    
    try {
      addDebugInfo(`Looking up student without PIN: ${identifier.trim()}`);
      
      const response = await fetch('/api/auth/student-username-lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          identifier: identifier.trim()
        })
      });
      
      const data = await response.json();
      addDebugInfo(`API response (lookup only): ${JSON.stringify(data)}`);
      
      if (!response.ok) {
        setMatchFound(null);
        return;
      }
      
      if (data.success && data.best_match) {
        setMatchFound(data.best_match);
      } else {
        setMatchFound(null);
      }
    } catch (err) {
      console.error('Student lookup error:', err);
      setMatchFound(null);
    } finally {
      setIsChecking(false);
    }
  };
  
  // When identifier changes, check for matching student after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      if (identifier.trim().length >= 3) {
        checkForStudentMatch();
      } else {
        setMatchFound(null);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [identifier, checkForStudentMatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setDebugInfo([]);

    // Validate inputs
    if (!identifier.trim()) {
      setError('Please enter your name or username');
      setIsLoading(false);
      return;
    }

    if (!pin.trim() || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setError('Please enter a valid 4-digit PIN');
      setIsLoading(false);
      return;
    }

    try {
      addDebugInfo(`Looking up student: ${identifier.trim()}`);
      
      // Use the server API to look up the student and verify PIN
      const response = await fetch('/api/auth/student-username-lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          identifier: identifier.trim(),
          pin: pin
        })
      });
      
      const data = await response.json();
      addDebugInfo(`API response: ${JSON.stringify(data)}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Student not found. Please check your name or ask your teacher for help.`);
        } else if (response.status === 401) {
          throw new Error('Incorrect PIN code. Please try again or ask your teacher for help.');
        } else {
          throw new Error(data.error || 'Failed to log in');
        }
      }
      
      // We should have a user_id if PIN was verified
      if (data.success && data.pin_verified && data.user_id) {
        // Log in using that user_id
        addDebugInfo(`Logging in with user_id: ${data.user_id}`);
        
        // Try the standard login first
        try {
          const loginResponse = await fetch('/api/auth/student-pin-login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              user_id: data.user_id,
              pin_code: pin
            })
          });
          
          if (!loginResponse.ok) {
            const loginData = await loginResponse.json().catch(() => ({}));
            console.error('Standard PIN login failed:', loginResponse.status, loginData);
            addDebugInfo('Standard login failed, trying direct login...');
            
            // If standard login fails, try the direct login approach
            const directLoginResponse = await fetch('/api/auth/direct-student-login', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                user_id: data.user_id,
                pin_code: pin
              })
            });
            
            if (!directLoginResponse.ok) {
              const directLoginData = await directLoginResponse.json().catch(() => ({}));
              console.error('Direct PIN login also failed:', directLoginResponse.status, directLoginData);
              throw new Error(directLoginData.error || `Login failed (Status: ${directLoginResponse.status})`);
            }
            
            const directLoginData = await directLoginResponse.json();
            addDebugInfo('Direct login successful: ' + JSON.stringify(directLoginData));
            
            // Add a special flag to indicate this is a direct PIN login in localStorage
            // This will help us detect and handle redirect loops if they occur
            try {
              // Save important information in localStorage
              localStorage.setItem('direct_pin_login', 'true');
              localStorage.setItem('direct_pin_login_time', Date.now().toString());
              localStorage.setItem('direct_pin_login_user', directLoginData.user?.id || 'unknown');
              
              // Cookie validation for browsers that support it
              document.cookie = `direct_pin_login_check=true; path=/; max-age=3600`;
              document.cookie = `direct_pin_login_user=${directLoginData.user?.id || 'unknown'}; path=/; max-age=3600`;
            } catch (e) {
              console.warn('Could not set localStorage for direct login:', e);
            }
            
            // Direct login successful - check if we have a specific redirect_to in the response
            // If not, build our own with the user ID
            const redirectUrl = directLoginData.redirect_to || 
              `/student/dashboard?_t=${Date.now()}&direct=1&user_id=${directLoginData.user?.id || data.user_id}`;
              
            addDebugInfo(`Using redirect URL: ${redirectUrl}`);
            
            completeLogin(redirectUrl);
          } else {
            // Standard login worked
            const loginData = await loginResponse.json();
            addDebugInfo('Standard login successful: ' + JSON.stringify(loginData));
            
            // Successfully logged in - check if response has custom redirect path
            completeLogin(loginData.redirect_to);
          }
        } catch (loginError) {
          console.error('Login processing error:', loginError);
          throw loginError;
        }
        
        // Helper function to complete the login process
        function completeLogin(customRedirect?: string) {
          addDebugInfo('Login successful, applying cookies...');
          
          // Give the cookies a moment to be set
          setTimeout(() => {
            // Login successful - either call callback or redirect
            if (onLoginSuccess) {
              onLoginSuccess();
            } else {
              // Determine where to redirect - use custom redirect path from response if available
              const finalRedirect = customRedirect || redirectTo;
              addDebugInfo(`Redirecting to ${finalRedirect}...`);
              
              // This ensures we do a full browser navigation, not just a client-side route change
              // Add a timestamp to prevent caching and force a full reload
              const redirectWithTimestamp = finalRedirect.includes('?') 
                ? `${finalRedirect}&_t=${Date.now()}` 
                : `${finalRedirect}?_t=${Date.now()}`;
                
              // Log clear confirmation of redirect path
              console.log(`PIN login successful - redirecting to: ${redirectWithTimestamp}`);
              
              window.location.href = redirectWithTimestamp;
            }
          }, 1000); // Increase timeout to ensure cookies are set
        }
      } else {
        // Should never get here if response was ok
        throw new Error('Unexpected error during login - PIN verification success but no user_id');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <StyledCard>
      <Title>Student Login</Title>
      
      <InfoText>
        Log in with your name and 4-digit PIN to access your classrooms.
      </InfoText>
      
      {error && <Alert variant="error">{error}</Alert>}
      
      <PinExample>
        If you haven&apos;t set up a PIN yet, join a classroom first or ask your teacher for help.
      </PinExample>
      
      <FormContainer onSubmit={handleSubmit}>
        <FormGroup>
          <Label htmlFor="identifier">Your Name</Label>
          <Input
            id="identifier"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Enter your name"
            disabled={isLoading}
            required
          />
          
          {isChecking && (
            <div style={{ textAlign: 'center', margin: '8px 0' }}>
              Checking...
            </div>
          )}
          
          {matchFound && (
            <ResultBox>
              <p>We found your account:</p>
              <p className="name">{matchFound.full_name}</p>
              <p>Please enter your PIN to continue.</p>
            </ResultBox>
          )}
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="pin">PIN Code</Label>
          <PinInputContainer>
            <PinInput
              id="pin"
              type="text"
              inputMode="numeric"
              maxLength={4}
              pattern="\d{4}"
              value={pin}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').substring(0, 4);
                setPin(value);
              }}
              placeholder="****"
              disabled={isLoading}
              required
            />
          </PinInputContainer>
        </FormGroup>
        
        <Button 
          type="submit" 
          disabled={isLoading} 
          style={{ width: '100%' }}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </Button>
      </FormContainer>
      
      <Divider>
        <span>OR</span>
      </Divider>
      
      <Button 
        variant="outline" 
        style={{ width: '100%' }} 
        onClick={() => router.push('/join')}
      >
        Join New Classroom
      </Button>
      
      <Note>
        Your teacher can help you set up your PIN access if needed.
        {/* Hidden note about debug mode */}
        <br /><small>Press Ctrl+Shift+D to toggle debug info</small>
      </Note>
      
      {/* Debug info panel - hidden by default */}
      {showDebug && debugInfo.length > 0 && (
        <DebugInfo>
          <h4>Debug Information:</h4>
          {debugInfo.map((info, i) => (
            <div key={i} style={{ marginBottom: '4px' }}>
              {typeof info === 'string' ? info : JSON.stringify(info, null, 2)}
            </div>
          ))}
        </DebugInfo>
      )}
    </StyledCard>
  );
}