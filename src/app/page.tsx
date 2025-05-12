// src/app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/navigation';
import { Container, Card, Button } from '@/styles/StyledComponents';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

const HomePage = styled.div`
  padding: ${({ theme }) => theme.spacing.xxl};
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
`;

const Hero = styled.section`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xxl} 0;
`;

const Title = styled.h1`
  color: ${({ theme }) => theme.colors.primary};
  font-size: 3rem;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.textLight};
  font-size: 1.5rem;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const CTAButtons = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.lg};
  justify-content: center;
  margin-bottom: ${({ theme }) => theme.spacing.xxl};
`;

const Features = styled.section`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing.xl};
  margin-top: ${({ theme }) => theme.spacing.xxl};
`;

const FeatureCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing.xl};
  text-align: center;
  
  h3 {
    color: ${({ theme }) => theme.colors.primary};
    margin-bottom: ${({ theme }) => theme.spacing.md};
  }
  
  p {
    color: ${({ theme }) => theme.colors.textLight};
  }
`;

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false); // Keep this to manage loading UI
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      setLoading(true); // Set loading true at the start of the check
      setIsRedirecting(false); // Reset redirecting flag

      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser(); // Renamed to avoid conflict
        setUser(currentUser);
        
        if (currentUser) {
          setIsRedirecting(true); // Indicate redirection will occur
          
          // Get user profile to check role
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', currentUser.id)
            .single();

          if (profileError) {
            console.error('Error fetching profile on homepage:', profileError.message);
            // If profile fetch fails, don't redirect, let them stay on homepage or handle error
            setIsRedirecting(false); 
            setLoading(false);
            return;
          }
          
          if (profile?.role === 'teacher') {
            console.log('[Homepage] Redirecting teacher to /teacher-dashboard');
            router.push('/teacher-dashboard');
          } else if (profile?.role === 'student') {
            console.log('[Homepage] Redirecting student to /student/dashboard');
            router.push('/student/dashboard'); // <<< MODIFIED LINE
          } else {
            // No specific role or profile not found, stop redirecting and show homepage
            console.log(`[Homepage] User ${currentUser.id} has role: ${profile?.role} or no profile. Staying on homepage.`);
            setIsRedirecting(false);
          }
        }
      } catch (error) {
        console.error('Error in checkUserAndRedirect on homepage:', error);
        // In case of any other error, stop trying to redirect
        setIsRedirecting(false);
      } finally {
        setLoading(false);
        // isRedirecting will be false if push didn't happen or was completed
        // For a cleaner UX, if router.push is called, the component might unmount before setIsRedirecting(false) is effective.
        // The setLoading(false) is key here.
      }
    };

    checkUserAndRedirect();
  }, [router, supabase]);

  // Show loading UI only if actively loading or if a redirect is in progress
  if (loading || isRedirecting) {
    return (
      <HomePage>
        <Container>
          <Hero>
            <Title>Loading...</Title>
          </Hero>
        </Container>
      </HomePage>
    );
  }

  return (
    <HomePage>
      <Container>
        <Hero>
          <Title>ClassBots AI</Title>
          <Subtitle>AI-powered chatbots for modern classrooms</Subtitle>
          
          {/* CTA buttons are only shown if user is null (after loading and not redirecting) */}
          {!user && (
            <CTAButtons>
              <Button size="large" onClick={() => router.push('/auth')}>
                Teacher Sign In
              </Button>
              <Button size="large" variant="secondary" onClick={() => router.push('/join')}>
                Student: Join Class
              </Button>
            </CTAButtons>
          )}
        </Hero>

        <Features>
          <FeatureCard>
            <h3>For Teachers</h3>
            <p>Create custom AI chatbots tailored to your classroom needs</p>
          </FeatureCard>
          <FeatureCard>
            <h3>For Students</h3>
            <p>Learn interactively with AI-powered classroom assistants</p>
          </FeatureCard>
          <FeatureCard>
            <h3>Easy to Use</h3>
            <p>Simple setup and magic link access for students</p>
          </FeatureCard>
        </Features>
      </Container>
    </HomePage>
  );
}