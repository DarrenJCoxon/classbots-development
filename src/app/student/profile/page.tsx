'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { FormGroup, Label, Input, Alert } from '@/styles/StyledComponents';
import { ModernButton } from '@/components/shared/ModernButton';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { PageWrapper, PageHeader, PageTitle, PageContent } from '@/components/shared/PageStructure';
import { GlassCard } from '@/components/shared/GlassCard';
import { FiUser, FiMail, FiLock, FiCalendar, FiEdit2, FiSave, FiX } from 'react-icons/fi';

const ProfileHeader = styled.div`
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  padding-bottom: ${({ theme }) => theme.spacing.lg};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const Avatar = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.secondary}
  );
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  font-weight: 700;
  color: white;
  margin: 0 auto ${({ theme }) => theme.spacing.lg};
  box-shadow: 0 8px 32px rgba(152, 93, 215, 0.2);
`;

const ProfileName = styled.h2`
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 ${({ theme }) => theme.spacing.xs};
  color: ${({ theme }) => theme.colors.text};
`;

const ProfileEmail = styled.p`
  color: ${({ theme }) => theme.colors.textLight};
  margin: 0;
  font-size: 16px;
`;

const ProfileSection = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const SectionTitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  
  svg {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
`;

const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const InfoLabel = styled.span`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textLight};
  font-weight: 500;
`;

const InfoValue = styled.span`
  font-size: 16px;
  color: ${({ theme }) => theme.colors.text};
  font-weight: 500;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  justify-content: center;
  margin-top: ${({ theme }) => theme.spacing.xl};
`;

const EditForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
`;

export default function StudentProfile() {
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    year_group: '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      
      // Check for direct access
      const directAccessId = localStorage.getItem('student_direct_access_id') || 
                           localStorage.getItem('current_student_id');
      
      let userId: string | null = null;
      
      if (directAccessId) {
        userId = directAccessId;
      } else {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          router.push('/student-login');
          return;
        }
        userId = user.id;
      }
      
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
        
      if (profileError) {
        throw profileError;
      }
      
      setProfile(profileData);
      setFormData({
        full_name: profileData.full_name || '',
        email: profileData.email || '',
        year_group: profileData.year_group || '',
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
      
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setError(null);
    setSuccess(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
    setSuccess(null);
    // Reset form to original values
    setFormData({
      full_name: profile.full_name || '',
      email: profile.email || '',
      year_group: profile.year_group || '',
      current_password: '',
      new_password: '',
      confirm_password: ''
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      // Validate password fields if changing password
      if (formData.new_password) {
        if (formData.new_password !== formData.confirm_password) {
          throw new Error('Passwords do not match');
        }
        if (formData.new_password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }
        if (!formData.current_password) {
          throw new Error('Current password is required to change password');
        }
      }

      // Update profile data
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          year_group: formData.year_group
        })
        .eq('user_id', profile.user_id);

      if (updateError) {
        throw updateError;
      }

      // Update password if requested
      if (formData.new_password && formData.current_password) {
        // For direct access students, we might not be able to change password
        const directAccessId = localStorage.getItem('student_direct_access_id');
        if (directAccessId) {
          throw new Error('Password changes are not available for direct access accounts. Please contact your teacher.');
        }

        const { error: passwordError } = await supabase.auth.updateUser({
          password: formData.new_password
        });

        if (passwordError) {
          throw passwordError;
        }
      }

      // Update email if changed
      if (formData.email !== profile.email) {
        // For direct access students, we might not be able to change email
        const directAccessId = localStorage.getItem('student_direct_access_id');
        if (directAccessId) {
          throw new Error('Email changes are not available for direct access accounts. Please contact your teacher.');
        }

        const { error: emailError } = await supabase.auth.updateUser({
          email: formData.email
        });

        if (emailError) {
          throw emailError;
        }
      }

      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      await fetchProfile(); // Refresh profile data
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'S';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <PageWrapper>
        <LoadingSpinner />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <GlassCard>
        <ProfileHeader>
          <Avatar>{getInitials(profile?.full_name)}</Avatar>
          <ProfileName>{profile?.full_name || 'Student'}</ProfileName>
          <ProfileEmail>{profile?.email || 'No email set'}</ProfileEmail>
        </ProfileHeader>

        {error && <Alert variant="error">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        {!isEditing ? (
          <>
            <ProfileSection>
              <SectionTitle>
                <FiUser />
                Personal Information
              </SectionTitle>
              <InfoGrid>
                <InfoItem>
                  <InfoLabel>Full Name</InfoLabel>
                  <InfoValue>{profile?.full_name || 'Not set'}</InfoValue>
                </InfoItem>
                <InfoItem>
                  <InfoLabel>Username</InfoLabel>
                  <InfoValue>{profile?.username || 'Not set'}</InfoValue>
                </InfoItem>
                <InfoItem>
                  <InfoLabel>Year Group</InfoLabel>
                  <InfoValue>{profile?.year_group || 'Not set'}</InfoValue>
                </InfoItem>
                <InfoItem>
                  <InfoLabel>Account Type</InfoLabel>
                  <InfoValue>{profile?.is_anonymous ? 'PIN Login' : 'Email Login'}</InfoValue>
                </InfoItem>
              </InfoGrid>
            </ProfileSection>

            <ProfileSection>
              <SectionTitle>
                <FiCalendar />
                Account Information
              </SectionTitle>
              <InfoGrid>
                <InfoItem>
                  <InfoLabel>Member Since</InfoLabel>
                  <InfoValue>{formatDate(profile?.created_at)}</InfoValue>
                </InfoItem>
                <InfoItem>
                  <InfoLabel>Last Updated</InfoLabel>
                  <InfoValue>{formatDate(profile?.updated_at)}</InfoValue>
                </InfoItem>
              </InfoGrid>
            </ProfileSection>

            <ButtonGroup>
              <ModernButton
                variant="primary"
                onClick={handleEdit}
              >
                <FiEdit2 /> Edit Profile
              </ModernButton>
            </ButtonGroup>
          </>
        ) : (
          <EditForm onSubmit={handleSubmit}>
            <ProfileSection>
              <SectionTitle>
                <FiUser />
                Personal Information
              </SectionTitle>
              <FormGroup>
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                />
              </FormGroup>
              <FormGroup>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  disabled={profile?.is_anonymous}
                />
                {profile?.is_anonymous && (
                  <small style={{ color: '#666', marginTop: '4px' }}>
                    Email changes are not available for PIN login accounts
                  </small>
                )}
              </FormGroup>
              <FormGroup>
                <Label htmlFor="year_group">Year Group</Label>
                <Input
                  id="year_group"
                  name="year_group"
                  type="text"
                  value={formData.year_group}
                  onChange={handleChange}
                  placeholder="e.g., Year 10, Grade 9"
                />
              </FormGroup>
            </ProfileSection>

            {!profile?.is_anonymous && (
              <ProfileSection>
                <SectionTitle>
                  <FiLock />
                  Change Password (Optional)
                </SectionTitle>
                <FormGroup>
                  <Label htmlFor="current_password">Current Password</Label>
                  <Input
                    id="current_password"
                    name="current_password"
                    type="password"
                    value={formData.current_password}
                    onChange={handleChange}
                    placeholder="Enter current password"
                  />
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="new_password">New Password</Label>
                  <Input
                    id="new_password"
                    name="new_password"
                    type="password"
                    value={formData.new_password}
                    onChange={handleChange}
                    placeholder="Enter new password"
                  />
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="confirm_password">Confirm New Password</Label>
                  <Input
                    id="confirm_password"
                    name="confirm_password"
                    type="password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    placeholder="Confirm new password"
                  />
                </FormGroup>
              </ProfileSection>
            )}

            <ButtonGroup>
              <ModernButton
                type="button"
                variant="ghost"
                onClick={handleCancel}
                disabled={isSaving}
              >
                <FiX /> Cancel
              </ModernButton>
              <ModernButton
                type="submit"
                variant="primary"
                disabled={isSaving}
              >
                <FiSave /> {isSaving ? 'Saving...' : 'Save Changes'}
              </ModernButton>
            </ButtonGroup>
          </EditForm>
        )}
      </GlassCard>
    </PageWrapper>
  );
}