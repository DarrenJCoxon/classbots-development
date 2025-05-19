// src/app/teacher-dashboard/layout.tsx
'use client';

import styled from 'styled-components';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient as createStandardSupabaseClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { Container } from '@/styles/StyledComponents';
import Footer from '@/components/layout/Footer';
import TeacherNav from '@/components/teacher/TeacherNav';
import TeacherProfileCheck from '@/components/auth/teacherProfileCheck';

const DashboardLayoutContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.background};
`;

const MainContent = styled.main`
  flex: 1;
  padding: ${({ theme }) => theme.spacing.xl} 0; 
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
  font-size: 1.5rem;
  color: ${({ theme }) => theme.colors.textLight};
  z-index: 1000;
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
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', sessionUser.id)
            .single();

          if (profileError) {
            console.error('[TDL] Profile fetch error:', profileError.message, 'Redirecting to /auth.');
            setAuthStatus('unauthorized');
            router.push('/auth');
          } else if (profile && profile.role === 'teacher') {
            console.log('[TDL] User is teacher. Authorized.');
            setAuthStatus('authorized');
          } else {
            console.log('[TDL] User is not teacher or profile missing. Unauthorized. Redirecting to /.');
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
    return (
      <LoadingOverlay>
        <div>Loading Teacher Dashboard (Auth)...</div>
      </LoadingOverlay>
    );
  }

  if (authStatus === 'unauthorized') {
    console.log('[TDL] Rendering null because unauthorized (redirect initiated).');
    return null; 
  }

  // authStatus === 'authorized'
  console.log('[TDL] Rendering dashboard content.');
  return (
    <DashboardLayoutContainer>
      {/* Add the profile check component that will automatically repair
          teacher profiles if needed */}
      <TeacherProfileCheck />
      <Container>
        <TeacherNav />
        <MainContent>
            {children}
        </MainContent>
      </Container>
      <Footer />
    </DashboardLayoutContainer>
  );
}