// src/components/student/ProfileCompletion.tsx
'use client';

import { useState } from 'react';
import styled from 'styled-components';
import { createClient } from '@/lib/supabase/client';
import { Card, Button, FormGroup, Label, Input, Alert } from '@/styles/StyledComponents';

const ProfileCard = styled(Card)`
  max-width: 500px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl};
`;

const Title = styled.h2`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  color: ${({ theme }) => theme.colors.primary};
  text-align: center;
`;

const Description = styled.p`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  text-align: center;
  color: ${({ theme }) => theme.colors.textLight};
`;

export default function ProfileCompletion({ onComplete }: { onComplete: () => void }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter both first and last name');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }
      
      // Update profile with name information
      const { error: updateError } = await supabase
        .from('student_profiles')
        .update({
          full_name: `${firstName} ${lastName}`.trim(),
          first_name: firstName,
          surname: lastName,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
      
      if (updateError) {
        throw updateError;
      }
      
      // Call the completion callback
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <ProfileCard>
      <Title>Complete Your Profile</Title>
      <Description>
        Please provide your name to complete your profile setup
      </Description>
      
      {error && <Alert variant="error">{error}</Alert>}
      
      <form onSubmit={handleSubmit}>
        <FormGroup>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Enter your first name"
            required
          />
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Enter your last name"
            required
          />
        </FormGroup>
        
        <Button 
          type="submit" 
          disabled={isSubmitting}
          style={{ width: '100%' }}
        >
          {isSubmitting ? 'Saving...' : 'Complete Profile'}
        </Button>
      </form>
    </ProfileCard>
  );
}