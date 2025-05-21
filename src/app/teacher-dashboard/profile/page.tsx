// src/app/teacher-dashboard/profile/page.tsx
'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, Button, Input, Alert, Select } from '@/styles/StyledComponents';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { User } from '@supabase/supabase-js';

// Types
interface TeacherProfile {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  country_code: string | null;
  created_at: string;
  updated_at: string;
}

// Styled Components
const ProfileWrapper = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl} 0;
`;

const PageTitle = styled.h1`
  font-size: 2rem;
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  text-align: center;
`;

const ProfileSection = styled(Card)`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  padding: ${({ theme }) => theme.spacing.xl};
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  padding-bottom: ${({ theme }) => theme.spacing.sm};
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
`;

const FormGroup = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Label = styled.label`
  display: block;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  font-size: 0.9rem;
`;

const ReadOnlyField = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  background-color: ${({ theme }) => theme.colors.backgroundCard};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  color: ${({ theme }) => theme.colors.textLight};
  font-family: ${({ theme }) => theme.fonts.mono};
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  justify-content: flex-start;
  margin-top: ${({ theme }) => theme.spacing.lg};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-direction: column;
  }
`;

const DangerSection = styled(ProfileSection)`
  border: 2px solid ${({ theme }) => theme.colors.red};
  background-color: ${({ theme }) => theme.colors.red}08;
`;

const DangerTitle = styled(SectionTitle)`
  color: ${({ theme }) => theme.colors.red};
  border-bottom-color: ${({ theme }) => theme.colors.red};
`;

const DangerText = styled.p`
  color: ${({ theme }) => theme.colors.red};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  line-height: 1.5;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const StatCard = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.lg};
  background-color: ${({ theme }) => theme.colors.backgroundCard};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const StatNumber = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const StatLabel = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.textLight};
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: ${({ theme }) => theme.spacing.md};
`;

const HelpText = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.textLight};
  margin-top: ${({ theme }) => theme.spacing.xs};
  line-height: 1.4;
`;

export default function TeacherProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [stats, setStats] = useState({
    totalRooms: 0,
    totalStudents: 0,
    totalChatbots: 0,
    totalAssessments: 0
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form states
  const [fullName, setFullName] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
  const router = useRouter();
  const supabase = createClient();

  // Load profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (!currentUser) {
          router.push('/auth');
          return;
        }
        
        setUser(currentUser);
        
        // Load profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', currentUser.id)
          .single();
          
        if (profileError) {
          throw new Error('Failed to load profile');
        }
        
        if (profileData.role !== 'teacher') {
          router.push('/');
          return;
        }
        
        setProfile(profileData);
        setFullName(profileData.full_name || '');
        setCountryCode(profileData.country_code || '');
        
        // Load stats
        const [roomsResponse, studentsResponse, chatbotsResponse, assessmentsResponse] = await Promise.all([
          supabase.from('rooms').select('room_id').eq('teacher_id', currentUser.id),
          supabase.from('room_memberships').select('student_id').in('room_id', 
            (await supabase.from('rooms').select('room_id').eq('teacher_id', currentUser.id)).data?.map(r => r.room_id) || []
          ),
          supabase.from('chatbots').select('chatbot_id').eq('teacher_id', currentUser.id),
          supabase.from('student_assessments').select('assessment_id').in('room_id',
            (await supabase.from('rooms').select('room_id').eq('teacher_id', currentUser.id)).data?.map(r => r.room_id) || []
          )
        ]);
        
        setStats({
          totalRooms: roomsResponse.data?.length || 0,
          totalStudents: new Set(studentsResponse.data?.map(s => s.student_id)).size || 0,
          totalChatbots: chatbotsResponse.data?.length || 0,
          totalAssessments: assessmentsResponse.data?.length || 0
        });
        
      } catch (err) {
        console.error('Error loading profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    
    loadProfile();
  }, [router, supabase]);

  // Update profile
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !profile) return;
    
    setUpdating(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          full_name: fullName.trim(),
          country_code: countryCode || null
        })
        .eq('user_id', user.id);
        
      if (updateError) {
        throw new Error('Failed to update profile');
      }
      
      setProfile(prev => prev ? { 
        ...prev, 
        full_name: fullName.trim(),
        country_code: countryCode || null
      } : null);
      setSuccess('Profile updated successfully!');
      
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  // Change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all password fields');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    setUpdating(true);
    setError(null);
    setSuccess(null);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        throw error;
      }
      
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Password changed successfully!');
      
    } catch (err: any) {
      console.error('Error changing password:', err);
      setError(err.message || 'Failed to change password');
    } finally {
      setUpdating(false);
    }
  };

  // Delete account
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE MY ACCOUNT') {
      setError('Please type "DELETE MY ACCOUNT" to confirm');
      return;
    }
    
    if (!user || !profile) return;
    
    setDeleting(true);
    setError(null);
    
    try {
      // Call the delete account API endpoint we'll create
      const response = await fetch('/api/teacher/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete account');
      }
      
      // Sign out locally after successful deletion
      await supabase.auth.signOut();
      
      // Redirect to home page with a message
      router.push('/?message=account-deleted');
      
    } catch (err: any) {
      console.error('Error deleting account:', err);
      setError(err.message || 'Failed to delete account. Please try again or contact support.');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <ProfileWrapper>
        <LoadingContainer>
          <LoadingSpinner size="large" />
          <p>Loading your profile...</p>
        </LoadingContainer>
      </ProfileWrapper>
    );
  }

  if (!profile) {
    return (
      <ProfileWrapper>
        <Alert variant="error">Profile not found</Alert>
      </ProfileWrapper>
    );
  }

  return (
    <ProfileWrapper>
      <PageTitle>Teacher Profile</PageTitle>
      
      {error && <Alert variant="error" style={{ marginBottom: '24px' }}>{error}</Alert>}
      {success && <Alert variant="success" style={{ marginBottom: '24px' }}>{success}</Alert>}
      
      {/* Account Overview */}
      <ProfileSection>
        <SectionTitle>Account Overview</SectionTitle>
        
        <StatsGrid>
          <StatCard>
            <StatNumber>{stats.totalRooms}</StatNumber>
            <StatLabel>Classrooms</StatLabel>
          </StatCard>
          <StatCard>
            <StatNumber>{stats.totalStudents}</StatNumber>
            <StatLabel>Students</StatLabel>
          </StatCard>
          <StatCard>
            <StatNumber>{stats.totalChatbots}</StatNumber>
            <StatLabel>Chatbots</StatLabel>
          </StatCard>
          <StatCard>
            <StatNumber>{stats.totalAssessments}</StatNumber>
            <StatLabel>Assessments</StatLabel>
          </StatCard>
        </StatsGrid>
        
        <FormGroup>
          <Label>User ID</Label>
          <ReadOnlyField>{profile.user_id}</ReadOnlyField>
        </FormGroup>
        
        <FormGroup>
          <Label>Email Address</Label>
          <ReadOnlyField>{profile.email}</ReadOnlyField>
        </FormGroup>
        
        <FormGroup>
          <Label>Country</Label>
          <ReadOnlyField>
            {profile.country_code ? (() => {
              const countryMap: Record<string, string> = {
                'US': 'United States',
                'GB': 'United Kingdom', 
                'CA': 'Canada',
                'AU': 'Australia',
                'MY': 'Malaysia',
                'NZ': 'New Zealand',
                'AE': 'United Arab Emirates',
                'EU': 'EU (Other)'
              };
              return countryMap[profile.country_code] || profile.country_code;
            })() : 'Not specified'}
          </ReadOnlyField>
        </FormGroup>
        
        <FormGroup>
          <Label>Account Created</Label>
          <ReadOnlyField>
            {new Date(profile.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </ReadOnlyField>
        </FormGroup>
      </ProfileSection>
      
      {/* Update Profile */}
      <ProfileSection>
        <SectionTitle>Update Profile</SectionTitle>
        
        <form onSubmit={handleUpdateProfile}>
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
            <Label htmlFor="countryCode">Country</Label>
            <Select
              id="countryCode"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
            >
              <option value="">Select Country (Optional)</option>
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
              <option value="CA">Canada</option>
              <option value="AU">Australia</option>
              <option value="MY">Malaysia</option>
              <option value="NZ">New Zealand</option>
              <option value="AE">United Arab Emirates</option>
              <option value="EU">EU (Other)</option>
            </Select>
            <HelpText>
              Selecting your country helps us provide localized safety resources for your students if a concern is flagged.
            </HelpText>
          </FormGroup>
          
          <ButtonGroup>
            <Button 
              type="submit" 
              variant="primary" 
              disabled={updating}
            >
              {updating ? 'Updating...' : 'Update Profile'}
            </Button>
          </ButtonGroup>
        </form>
      </ProfileSection>
      
      {/* Change Password */}
      <ProfileSection>
        <SectionTitle>Change Password</SectionTitle>
        
        <form onSubmit={handleChangePassword}>
          <FormGroup>
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
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
              placeholder="Confirm new password"
              minLength={6}
            />
          </FormGroup>
          
          <ButtonGroup>
            <Button 
              type="submit" 
              variant="secondary" 
              disabled={updating}
            >
              {updating ? 'Changing...' : 'Change Password'}
            </Button>
          </ButtonGroup>
        </form>
      </ProfileSection>
      
      {/* Delete Account */}
      <DangerSection>
        <DangerTitle>Delete Account</DangerTitle>
        
        <DangerText>
          <strong>Warning:</strong> This action cannot be undone. Deleting your account will permanently remove:
        </DangerText>
        
        <ul style={{ color: 'var(--red)', marginBottom: '24px', lineHeight: '1.5' }}>
          <li>Your teacher profile and settings</li>
          <li>All your classrooms and chatbots</li>  
          <li>All student data and assessments</li>
          <li>All chat histories and interactions</li>
        </ul>
        
        <FormGroup>
          <Label htmlFor="deleteConfirm">
            Type "DELETE MY ACCOUNT" to confirm deletion:
          </Label>
          <Input
            id="deleteConfirm"
            type="text"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="DELETE MY ACCOUNT"
          />
        </FormGroup>
        
        <ButtonGroup>
          <Button 
            variant="danger"
            onClick={handleDeleteAccount}
            disabled={deleting || deleteConfirmText !== 'DELETE MY ACCOUNT'}
          >
            {deleting ? 'Deleting Account...' : 'Delete My Account'}
          </Button>
        </ButtonGroup>
      </DangerSection>
    </ProfileWrapper>
  );
}