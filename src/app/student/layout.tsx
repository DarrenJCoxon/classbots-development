// src/app/student/layout.tsx
'use client';

import styled from 'styled-components';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Container } from '@/styles/StyledComponents';
import Footer from '@/components/layout/Footer';
import StudentProfileCheck from '@/components/student/StudentProfileCheck';
import { ModernStudentNav } from '@/components/student/ModernStudentNav';

const StudentLayout = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.background};
`;

const MainWrapper = styled.div`
  display: flex;
  flex: 1;
  position: relative;
`;

const ContentArea = styled.div`
  flex: 1;
  margin-left: 80px;
  transition: margin-left 0.3s ease;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    margin-left: 0;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding-top: 80px; /* Increased top padding for mobile header */
  }
`;

const MainContent = styled.main`
  padding: 60px 0 40px 0;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: 48px 0 32px 0;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 40px 0 24px 0;
  }
`;

const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${({ theme }) => theme.colors.background};
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

export default function StudentLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Check if this is a direct redirect from login
    const url = new URL(window.location.href);
    // Check multiple patterns of direct access
    const isDirectLoginRedirect = url.searchParams.has('_t') || 
                                 url.searchParams.has('direct') || 
                                 url.searchParams.has('uid') || 
                                 url.searchParams.has('user_id') ||
                                 url.searchParams.has('access_signature') ||
                                 url.searchParams.has('pin_verified');
    
    // If this is a direct login redirect, skip the usual checks to prevent loops
    if (isDirectLoginRedirect) {
      console.log('Direct access detected - skipping auth check');
      
      // Check for student ID in URL or localStorage and store it
      const urlUserId = url.searchParams.get('user_id');
      const urlUid = url.searchParams.get('uid');
      
      // Try to get and save student ID
      if (urlUserId || urlUid) {
        const studentId = urlUserId || urlUid;
        console.log('Storing student ID from URL:', studentId);
        if (typeof window !== 'undefined' && studentId) {
          localStorage.setItem('student_direct_access_id', studentId);
          localStorage.setItem('current_student_id', studentId);
        }
      }
      
      setIsAuthorized(true);
      setIsLoading(false);
      return;
    }
    
    const checkAccess = async () => {
      console.log('Checking student access...');
      try {
        const { data: { user } } = await supabase.auth.getUser();
        console.log('Auth check result:', !!user);
        
        if (!user) {
          console.log('No user found, redirecting to login');
          // Redirect to the auth page with student login tab active instead of join
          router.push('/auth?login=student');
          return;
        }

        // Fetch user profile to check role
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role, username, pin_code')
          .eq('user_id', user.id)
          .single();

        console.log('User has authenticated, checking profile:', { 
          userId: user.id, 
          hasProfile: !!profile, 
          role: profile?.role,
          error: error?.message
        });

        // If there's no profile or the user is not a student, redirect to home
        if (!profile) {
          console.log('No profile found, creating one for user:', user.id);
          
          // Instead of redirecting, attempt to create a basic profile
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              user_id: user.id,
              role: 'student',
              full_name: user.user_metadata?.full_name || 'Student',
              email: user.email
            });
            
          if (insertError) {
            console.error('Error creating profile:', insertError);
            router.push('/');
            return;
          }
        } else if (profile.role !== 'student') {
          console.log('User is not a student, redirecting to home');
          router.push('/');
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error('Error checking access:', error);
        // Redirect to student login page instead of join
        router.push('/auth?login=student');
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [router, supabase]);

  if (isLoading) {
    return (
      <LoadingOverlay>
        <div>Loading...</div>
      </LoadingOverlay>
    );
  }

  if (!isAuthorized) {
    return null; // Will redirect
  }

  return (
    <StudentLayout>
      {/* Add StudentProfileCheck to automatically repair profiles if needed */}
      <StudentProfileCheck />
      <MainWrapper>
        <ModernStudentNav />
        <ContentArea>
          <Container>
            <MainContent>
              {children}
            </MainContent>
          </Container>
        </ContentArea>
      </MainWrapper>
      <Footer />
    </StudentLayout>
  );
}