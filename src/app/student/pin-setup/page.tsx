'use client';

import { useState, useEffect } from 'react';
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

const PinDisplay = styled.div`
  margin: ${({ theme }) => theme.spacing.xl} 0;
  padding: ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.backgroundDark};
  border: 2px dashed ${({ theme }) => theme.colors.primary};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 2.5rem;
  font-weight: bold;
  letter-spacing: 0.5rem;
  color: ${({ theme }) => theme.colors.primary};
`;

const UsernameBadge = styled.div`
  display: inline-block;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.primary}10;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  font-weight: bold;
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.spacing.md};
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
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={generateRandomPin}
                  >
                    Generate
                  </Button>
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
              
              <Button 
                type="submit" 
                disabled={isLoading} 
                style={{ width: '100%' }} 
                size="large"
              >
                {isLoading ? 'Setting Up...' : 'Create PIN'}
              </Button>
            </Form>
          </>
        )}
      </SetupCard>
    </PageWrapper>
  );
}