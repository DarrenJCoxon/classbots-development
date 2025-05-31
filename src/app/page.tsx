// src/app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { APP_NAME, APP_DESCRIPTION } from '@/lib/utils/constants';
import { ModernButton } from '@/components/shared/ModernButton';
import Footer from '@/components/layout/Footer';
import { FiUsers, FiBookOpen, FiArrowRight, FiUser, FiLogIn } from 'react-icons/fi';


const HomePage = styled.div`
  background: ${({ theme }) => theme.colors.background};
  min-height: 100vh;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  width: 100%;
  
  /* Subtle animated background */
  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 50%, rgba(152, 93, 215, 0.03) 0%, transparent 50%),
      radial-gradient(circle at 80% 80%, rgba(76, 190, 243, 0.03) 0%, transparent 50%),
      radial-gradient(circle at 40% 20%, rgba(200, 72, 175, 0.03) 0%, transparent 50%);
    pointer-events: none;
    z-index: 0;
  }
`;

const HeroSection = styled.section`
  position: relative;
  z-index: 1;
  padding: 80px 0 60px 0;
  text-align: center;
  width: 100%;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: 60px 0 40px 0;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 40px 0 30px 0;
  }
`;

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  width: 100%;
  box-sizing: border-box;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 0 16px;
  }
`;

const HeroTitle = styled(motion.h1)`
  font-size: 48px;
  font-weight: 700;
  font-family: ${({ theme }) => theme.fonts.display};
  text-transform: uppercase;
  margin: 0 0 32px 0;
  letter-spacing: 2px;
  line-height: 1.2;
  
  /* Animated gradient text */
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.blue},
    ${({ theme }) => theme.colors.magenta}
  );
  background-size: 200% 200%;
  animation: gradientShift 5s ease infinite;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  
  @keyframes gradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    font-size: 40px;
    margin: 0 0 24px 0;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 24px;
    letter-spacing: 0.5px;
    margin: 0 0 20px 0;
    line-height: 1.3;
  }
`;

const CTAButtons = styled.div`
  display: flex;
  gap: 20px;
  justify-content: center;
  margin: 40px 0;
  flex-wrap: wrap;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    gap: 16px;
    margin: 30px 0;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    margin: 24px 0;
    width: 100%;
    
    button {
      width: 100%;
    }
  }
`;

const MainContent = styled.div`
  flex: 1;
  position: relative;
  z-index: 1;
`;

const PathCardsSection = styled.section`
  padding: 40px 0 80px 0;
  width: 100%;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: 30px 0 60px 0;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 20px 0 40px 0;
  }
`;

const PathCardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
  margin-bottom: 60px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
    margin-bottom: 40px;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
    gap: 16px;
    margin-bottom: 30px;
  }
`;

const PathCard = styled(motion.div)<{ $accentColor: string }>`
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 32px;
  border: 1px solid rgba(152, 93, 215, 0.1);
  box-shadow: 0 10px 40px rgba(152, 93, 215, 0.05);
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: 28px;
    min-height: 180px;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 20px;
    min-height: 160px;
  }
  
  /* Accent gradient border */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, 
      ${props => props.$accentColor}, 
      ${props => props.$accentColor}dd
    );
  }
  
  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 20px 60px rgba(152, 93, 215, 0.15);
    border-color: ${props => props.$accentColor}30;
    
    .icon {
      transform: scale(1.1);
    }
    
    .arrow {
      transform: translateX(4px);
    }
  }
`;

const PathCardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
`;

const PathCardIcon = styled.div<{ $color: string }>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${props => props.$color}20;
  color: ${props => props.$color};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease;
  
  svg {
    width: 24px;
    height: 24px;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    
    svg {
      width: 20px;
      height: 20px;
    }
  }
`;

const PathCardContent = styled.div`
  flex: 1;
  margin-top: 16px;
`;

const PathCardTitle = styled.h3`
  font-size: 24px;
  font-weight: 700;
  font-family: ${({ theme }) => theme.fonts.heading};
  text-transform: uppercase;
  margin: 0 0 8px 0;
  color: ${({ theme }) => theme.colors.text};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    font-size: 22px;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 20px;
    margin: 0 0 6px 0;
  }
`;

const PathCardDescription = styled.p`
  font-size: 16px;
  color: ${({ theme }) => theme.colors.textLight};
  margin: 0;
  line-height: 1.5;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    font-size: 15px;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 14px;
    line-height: 1.4;
  }
`;

const PathCardAction = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${props => props.$color};
  font-weight: 600;
  font-size: 14px;
  margin-top: 16px;
  
  .arrow {
    transition: transform 0.3s ease;
    flex-shrink: 0;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 13px;
    margin-top: 12px;
  }
`;

const QuickJoinCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 32px;
  border: 1px solid rgba(200, 72, 175, 0.2);
  box-shadow: 0 10px 40px rgba(200, 72, 175, 0.05);
  max-width: 400px;
  margin: 0 auto;
  text-align: center;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: 28px;
    max-width: 360px;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 24px;
    max-width: 100%;
  }
`;

const QuickJoinTitle = styled.h3`
  font-size: 20px;
  font-weight: 700;
  font-family: ${({ theme }) => theme.fonts.heading};
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.magenta};
  margin: 0 0 16px 0;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 18px;
    margin: 0 0 12px 0;
  }
`;

const QuickJoinInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  font-size: 16px;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 2px;
  transition: all 0.2s ease;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 10px 12px;
    font-size: 14px;
    letter-spacing: 1.5px;
  }
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.magenta};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.magenta}20;
  }
`;



export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const router = useRouter();
  const supabase = createClient();
  const theme = useTheme();

  useEffect(() => {
    setMounted(true);
    
    const checkUserAndRedirect = async () => {
      setIsRedirecting(false);

      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);
        
        if (currentUser) {
          setIsRedirecting(true);
          
          // Check if user is a teacher
          const { data: teacherProfile } = await supabase
            .from('teacher_profiles')
            .select('user_id')
            .eq('user_id', currentUser.id)
            .single();

          if (teacherProfile) {
            router.push('/teacher-dashboard');
            return;
          }

          // Check if user is a student
          const { data: studentProfile } = await supabase
            .from('student_profiles')
            .select('user_id')
            .eq('user_id', currentUser.id)
            .single();

          if (studentProfile) {
            router.push('/student/dashboard');
            return;
          }

          // No profile found
          setIsRedirecting(false);
        }
      } catch (error) {
        console.error('Error in checkUserAndRedirect on homepage:', error);
        setIsRedirecting(false);
      }
    };

    checkUserAndRedirect();
  }, [router, supabase]);

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.trim()) {
      router.push(`/join-room?code=${roomCode.trim().toUpperCase()}`);
    }
  };

  // Show nothing or a minimal shell while mounting to avoid hydration mismatch
  if (!mounted || isRedirecting) {
    return (
      <HomePage>
        <HeroSection>
          <Container>
            <HeroTitle
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {APP_DESCRIPTION}
            </HeroTitle>
          </Container>
        </HeroSection>
      </HomePage>
    );
  }

  return (
    <HomePage>
      <MainContent>
        <HeroSection>
          <Container>
            <HeroTitle
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {APP_DESCRIPTION}
            </HeroTitle>
            
            {!user && (
              <CTAButtons>
                <ModernButton                   variant="primary"
                  size="large"
                  onClick={() => router.push('/auth?type=teacher_signup')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <FiUser />
                  Teacher Sign Up
                </ModernButton>
                <ModernButton                   variant="secondary"
                  size="large"
                  onClick={() => router.push('/student-access')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <FiLogIn />
                  Student Login
                </ModernButton>
              </CTAButtons>
            )}
          </Container>
        </HeroSection>

        <PathCardsSection>
          <Container>
          <PathCardsGrid>
            <PathCard
              $accentColor={theme.colors.purple}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              onClick={() => router.push('/auth?type=teacher_signup')}
            >
              <PathCardHeader>
                <PathCardIcon $color={theme.colors.purple} className="icon">
                  <FiUser />
                </PathCardIcon>
              </PathCardHeader>
              <PathCardContent>
                <PathCardTitle>I'm a Teacher</PathCardTitle>
                <PathCardDescription>
                  Create AI-powered learning rooms and monitor student progress
                </PathCardDescription>
              </PathCardContent>
              <PathCardAction $color={theme.colors.purple}>
                Get Started <FiArrowRight className="arrow" />
              </PathCardAction>
            </PathCard>

            <PathCard
              $accentColor={theme.colors.blue}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onClick={() => router.push('/student-access')}
            >
              <PathCardHeader>
                <PathCardIcon $color={theme.colors.blue} className="icon">
                  <FiBookOpen />
                </PathCardIcon>
              </PathCardHeader>
              <PathCardContent>
                <PathCardTitle>I'm a Student</PathCardTitle>
                <PathCardDescription>
                  Access your learning rooms and chat with Skolrs
                </PathCardDescription>
              </PathCardContent>
              <PathCardAction $color={theme.colors.blue}>
                Access Learning <FiArrowRight className="arrow" />
              </PathCardAction>
            </PathCard>

            <PathCard
              $accentColor={theme.colors.magenta}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              as="div"
            >
              <PathCardHeader>
                <PathCardIcon $color={theme.colors.magenta} className="icon">
                  <FiUsers />
                </PathCardIcon>
              </PathCardHeader>
              <PathCardContent>
                <PathCardTitle>Join a Room</PathCardTitle>
                <PathCardDescription>
                  Have a room code? Enter it below to join instantly
                </PathCardDescription>
              </PathCardContent>
            </PathCard>
          </PathCardsGrid>

          <QuickJoinCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <QuickJoinTitle>Quick Join</QuickJoinTitle>
            <form onSubmit={handleJoinRoom}>
              <QuickJoinInput
                type="text"
                placeholder="ROOM CODE"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={8}
              />
              <ModernButton                 type="submit"
                variant="primary"
                size="medium"
                style={{ marginTop: '16px', width: '100%' }}
                disabled={!roomCode.trim()}
              >
                Join Room
              </ModernButton>
            </form>
          </QuickJoinCard>
        </Container>
      </PathCardsSection>
      </MainContent>

      <Footer />
    </HomePage>
  );
}