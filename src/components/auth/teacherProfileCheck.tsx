// src/components/auth/teacherProfileCheck.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Alert, Card, Button } from '@/styles/StyledComponents';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';

const FixProfileCard = styled(Card)`
  max-width: 500px;
  margin: 2rem auto;
  padding: 2rem;
  text-align: center;
`;

const StatusMessage = styled.p`
  margin: 1rem 0;
  font-weight: bold;
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: ${({ theme }) => theme.colors.primary};
  animation: spin 1s ease-in-out infinite;
  margin-right: 0.5rem;
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

export default function TeacherProfileCheck() {
  const [checking, setChecking] = useState(true);
  const [needsRepair, setNeedsRepair] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  
  // Check if the current user has a valid profile
  useEffect(() => {
    const checkProfile = async () => {
      try {
        setChecking(true);
        
        // Get the current authenticated user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          console.error('Error getting user:', userError);
          setError('Could not verify your authentication status. Please log out and try again.');
          setChecking(false);
          return;
        }
        
        console.log('Current user:', user.id, 'with metadata:', user.user_metadata);
        
        // Check if the user's metadata indicates they are a teacher
        const isTeacherInMetadata = user.user_metadata?.role === 'teacher';
        
        if (!isTeacherInMetadata) {
          console.log('User is not marked as a teacher in metadata, no repair needed');
          setChecking(false);
          return;
        }
        
        // Check if the user has a profile in the teacher_profiles table
        const { data: profile, error: profileError } = await supabase
          .from('teacher_profiles')
          .select('user_id, email')
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (profileError) {
          console.error('Error checking profile:', profileError);
          setError('Could not verify your profile status. Please try again later.');
          setChecking(false);
          return;
        }
        
        // If there's no profile, we need to create it
        if (!profile) {
          console.log('User needs profile creation: No profile');
          setNeedsRepair(true);
        } else {
          console.log('User has a valid teacher profile, no repair needed');
        }
        
        setChecking(false);
      } catch (e) {
        console.error('Error in profile check:', e);
        setError('An unexpected error occurred while checking your profile.');
        setChecking(false);
      }
    };
    
    checkProfile();
  }, [supabase]);
  
  // Handler for repairing the profile
  const handleRepairProfile = async () => {
    try {
      setRepairing(true);
      setError(null);
      
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Could not retrieve user information');
      }
      
      // Create or update the profile in teacher_profiles table
      const { error: upsertError } = await supabase
        .from('teacher_profiles')
        .upsert({
          user_id: user.id,
          email: user.email || `${user.id}@example.com`,
          full_name: user.user_metadata?.full_name || 'Teacher',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
        
      if (upsertError) {
        throw new Error(`Profile update failed: ${upsertError.message}`);
      }
      
      console.log('Profile repaired successfully');
      setSuccess(true);
      
      // Redirect to the teacher dashboard after a short delay
      setTimeout(() => {
        router.push('/teacher-dashboard');
      }, 2000);
      
    } catch (e) {
      console.error('Error repairing profile:', e);
      setError(e instanceof Error ? e.message : 'Failed to repair profile');
    } finally {
      setRepairing(false);
    }
  };
  
  // If still checking, show loading state
  if (checking) {
    return (
      <FixProfileCard>
        <h2>Checking Profile Status</h2>
        <div className="status-container">
          <LoadingSpinner /> <span>Verifying your account...</span>
        </div>
      </FixProfileCard>
    );
  }
  
  // If repair needed, show repair UI
  if (needsRepair) {
    return (
      <FixProfileCard>
        <h2>Profile Setup Required</h2>
        
        {error && <Alert variant="error">{error}</Alert>}
        {success && <Alert variant="success">Profile fixed successfully! Redirecting to dashboard...</Alert>}
        
        <p>Your teacher account needs additional setup to access the teacher dashboard.</p>
        
        <Button 
          onClick={handleRepairProfile} 
          disabled={repairing || success}
          style={{ marginTop: '1rem' }}
        >
          {repairing ? <><LoadingSpinner /><span> Setting Up Profile...</span></> : 'Complete Setup'}
        </Button>
      </FixProfileCard>
    );
  }
  
  // If no repair needed, show nothing (component will unmount)
  return null;
}