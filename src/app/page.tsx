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
  const [isRedirecting, setIsRedirecting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        if (user) {
          setIsRedirecting(true);
          
          // Get user profile to check role
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', user.id)
            .single();
          
          if (profile?.role === 'teacher') {
            router.push('/teacher-dashboard');
          } else if (profile?.role === 'student') {
            router.push('/student');
          }
        }
      } catch (error) {
        console.error('Error checking user:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUserAndRedirect();
  }, [router, supabase]);

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