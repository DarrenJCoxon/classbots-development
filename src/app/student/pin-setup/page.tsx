'use client';

import { useState, useEffect } from 'react';
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

const PinDisplay = styled.div`
  margin: 32px 0;
  padding: 24px;
  background: rgba(152, 93, 215, 0.05);
  border: 2px dashed rgba(152, 93, 215, 0.3);
  border-radius: 12px;
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 2.5rem;
  font-weight: bold;
  letter-spacing: 0.5rem;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.secondary}
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const UsernameBadge = styled.div`
  display: inline-block;
  padding: 8px 16px;
  background: rgba(152, 93, 215, 0.1);
  border: 1px solid rgba(152, 93, 215, 0.3);
  border-radius: 8px;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: 16px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
`;

export default function StudentPinSetup() {
  // Username is now computed from full_name instead of being tracked separately
  // const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [generatedPin, setGeneratedPin] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Fetch the current user's details
    const fetchUserDetails = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/');
          return;
        }

        // Get their profile details
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .single();

        if (profile?.full_name) {
          // Use the user's name as their username but simplified
          // Remove spaces and special characters, convert to lowercase
          const simplifiedName = profile.full_name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .substring(0, 15); // Limit to 15 chars
            
          setCurrentUsername(simplifiedName);
        }
      } catch (err) {
        console.error('Error fetching user details:', err);
      }
    };

    fetchUserDetails();
  }, [supabase, router]);

  // Generate a random 4-digit PIN
  const generateRandomPin = () => {
    // Generate a 4-digit PIN
    const newPin = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedPin(newPin);
    setPin(newPin);
    setConfirmPin(newPin);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validation
    if (pin !== confirmPin) {
      setError('PINs do not match');
      setIsLoading(false);
      return;
    }

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits');
      setIsLoading(false);
      return;
    }

    try {
      // First get the current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData.user) {
        throw new Error('You must be logged in to set up your PIN');
      }

      // Set the PIN and username in the user's metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          pin_code: pin,
          username: currentUsername
        }
      });

      if (updateError) {
        throw updateError;
      }

      // Update the profile with the PIN as well
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          pin_code: pin, 
          username: currentUsername,
          is_anonymous: false 
        })
        .eq('user_id', userData.user.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        throw new Error('Error updating profile');
      }

      setSuccess(true);
      
      // Redirect after a delay
      setTimeout(() => {
        router.push('/student/dashboard');
      }, 5000);
    } catch (err) {
      console.error('Error setting up PIN:', err);
      setError(err instanceof Error ? err.message : 'Failed to set up PIN');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageWrapper>
      <SetupCard>
        <Title>Set Up Your Access Code</Title>
        <Subtitle>
          Create a simple PIN code to access your classrooms from any device.
        </Subtitle>

        {error && <Alert variant="error">{error}</Alert>}
        
        {success ? (
          <SuccessBox>
            <h3>PIN Successfully Created!</h3>
            <p>Remember your username and PIN to log in from any device:</p>
            <UsernameBadge>{currentUsername}</UsernameBadge>
            <PinDisplay>{pin}</PinDisplay>
            <p>This is the only time you&apos;ll see your PIN, so write it down or memorize it.</p>
            <p>Redirecting to your dashboard in a few seconds...</p>
            <LoadingSpinner size="small" />
          </SuccessBox>
        ) : (
          <>
            {currentUsername && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3>Your Username</h3>
                <UsernameBadge>{currentUsername}</UsernameBadge>
                <HelpText>This username is based on your name and will be used to log in</HelpText>
              </div>
            )}
            
            <Form onSubmit={handleSubmit}>
              <FormGroup>
                <Label htmlFor="pin">4-Digit PIN</Label>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                  <Input
                    id="pin"
                    type="text"
                    value={pin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').substring(0, 4);
                      setPin(value);
                    }}
                    placeholder="4-digit PIN"
                    maxLength={4}
                    inputMode="numeric"
                    pattern="\d{4}"
                    required
                    style={{ textAlign: 'center', letterSpacing: '0.5rem', fontWeight: 'bold' }}
                  />
                  <ModernButton 
                    type="button" 
                    variant="ghost"
                    onClick={generateRandomPin}
                  >
                    Generate
                  </ModernButton>
                </div>
                <HelpText>Choose a 4-digit PIN code that you can easily remember</HelpText>
              </FormGroup>
              
              <FormGroup>
                <Label htmlFor="confirmPin">Confirm PIN</Label>
                <Input
                  id="confirmPin"
                  type="text"
                  value={confirmPin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').substring(0, 4);
                    setConfirmPin(value);
                  }}
                  placeholder="Confirm 4-digit PIN"
                  maxLength={4}
                  inputMode="numeric"
                  pattern="\d{4}"
                  required
                  style={{ textAlign: 'center', letterSpacing: '0.5rem', fontWeight: 'bold' }}
                />
              </FormGroup>
              
              {generatedPin && (
                <Alert variant="info" style={{ marginBottom: '1.5rem' }}>
                  A PIN has been generated for you: <strong>{generatedPin}</strong>. Write this down or memorize it.
                </Alert>
              )}
              
              <ModernButton 
                type="submit" 
                disabled={isLoading} 
                style={{ width: '100%' }} 
                size="large"
              >
                {isLoading ? 'Setting Up...' : 'Create PIN'}
              </ModernButton>
            </Form>
          </>
        )}
      </SetupCard>
    </PageWrapper>
  );
}