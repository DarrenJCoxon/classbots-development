// src/app/teacher-dashboard/layout.tsx
'use client';

import styled from 'styled-components';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient as createStandardSupabaseClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import TeacherProfileCheck from '@/components/auth/teacherProfileCheck';
import { ModernNav } from '@/components/teacher/ModernNav';
import { FullPageLoader } from '@/components/shared/AnimatedLoader';
import Header from '@/components/layout/Header';

const DashboardLayoutContainer = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
  position: relative;
  overflow-x: hidden;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    /* Hide desktop header on mobile */
    > header:first-child {
      display: none;
    }
  }
`;

const MainContent = styled.main`
  min-height: 100vh;
  position: relative;
  margin-left: 80px; /* Just the sidebar width */
  padding: 20px 0 40px 0; /* Reduced top padding since header provides space */
  transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    margin-left: 80px;
    padding: 20px 0 32px 0;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    margin-left: 0;
    padding: 100px 0 24px 0; /* Keep increased padding for mobile header */
  }
`;

const ContentContainer = styled.div`
  max-width: 1200px; /* Same as header Container */
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.spacing.lg}; /* 24px - same as header */
  width: 100%;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 0 ${({ theme }) => theme.spacing.md}; /* 16px - same as header */
  }
`;

type AuthStatus = 'loading' | 'authorized' | 'unauthorized';

export default function TeacherDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const router = useRouter();
  const supabase = createStandardSupabaseClient();

  useEffect(() => {
    console.log('[TDL] useEffect for auth check triggered.');

    const checkAuth = async (sessionUser: User | null) => {
      if (sessionUser) {
        console.log('[TDL] User found. Fetching profile for user_id:', sessionUser.id);
        try {
          // Check if user is a teacher
          const { data: teacherProfile, error: profileError } = await supabase
            .from('teacher_profiles')
            .select('user_id')
            .eq('user_id', sessionUser.id)
            .single();

          if (profileError) {
            console.error('[TDL] Teacher profile fetch error:', profileError.message);
            
            // Check if they're a student instead
            const { data: studentProfile } = await supabase
              .from('student_profiles')
              .select('user_id')
              .eq('user_id', sessionUser.id)
              .single();
              
            if (studentProfile) {
              console.log('[TDL] User is a student. Redirecting to student dashboard.');
              setAuthStatus('unauthorized');
              router.push('/student/dashboard');
            } else {
              console.log('[TDL] No profile found. Redirecting to /auth.');
              setAuthStatus('unauthorized');
              router.push('/auth');
            }
          } else if (teacherProfile) {
            console.log('[TDL] User is teacher. Authorized.');
            setAuthStatus('authorized');
          } else {
            console.log('[TDL] No teacher profile found. Unauthorized. Redirecting to /.');
            setAuthStatus('unauthorized');
            router.push('/');
          }
        } catch (e) {
          console.error('[TDL] Exception during profile fetch:', e, 'Redirecting to /auth.');
          setAuthStatus('unauthorized');
          router.push('/auth');
        }
      } else {
        console.log('[TDL] No user in session. Unauthorized. Redirecting to /auth.');
        setAuthStatus('unauthorized');
        router.push('/auth');
      }
    };

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
        console.log('[TDL] Initial getSession result:', session);
        // Only process if onAuthStateChange hasn't already set a definitive state
        if (authStatus === 'loading') { // Check current authStatus
            checkAuth(session?.user || null);
        }
    });
    
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(`[TDL] onAuthStateChange event: ${event}`, session);
        // Re-check auth whenever the state changes
        // This will also handle the INITIAL_SESSION event which is often the first one on load
        checkAuth(session?.user || null);
      }
    );

    return () => {
      console.log('[TDL] Unsubscribing from onAuthStateChange.');
      authListener.subscription?.unsubscribe();
    };
  }, [router, supabase, authStatus]); // Added authStatus to deps to re-evaluate if it changes to loading by another means

  console.log('[TDL] Render. AuthStatus:', authStatus);

  if (authStatus === 'loading') {
    return <FullPageLoader message="Loading Teacher Dashboard..." variant="dots" />;
  }

  if (authStatus === 'unauthorized') {
    console.log('[TDL] Rendering null because unauthorized (redirect initiated).');
    return null; 
  }

  // authStatus === 'authorized'
  console.log('[TDL] Rendering dashboard content.');
  return (
    <DashboardLayoutContainer>
      {/* Desktop header - hidden on mobile */}
      <Header />
      
      {/* Add the profile check component that will automatically repair
          teacher profiles if needed */}
      <TeacherProfileCheck />
      
      {/* Modern navigation sidebar */}
      <ModernNav />
      
      <MainContent>
        <ContentContainer>
          {children}
        </ContentContainer>
      </MainContent>
    </DashboardLayoutContainer>
  );
}