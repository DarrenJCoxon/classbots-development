// src/app/student/layout.tsx
'use client';

import styled from 'styled-components';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Container } from '@/styles/StyledComponents';
import Footer from '@/components/layout/Footer';

const StudentLayout = styled.div`
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
    const checkAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/join');
          return;
        }

        // Fetch user profile to check role
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (error || !profile || profile.role !== 'student') {
          router.push('/');
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error('Error checking access:', error);
        router.push('/join');
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
      <MainContent>
        <Container>
          {children}
        </Container>
      </MainContent>
      <Footer />
    </StudentLayout>
  );
}