// src/app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import styled, { useTheme } from 'styled-components'; // Added useTheme
import { useRouter } from 'next/navigation';
import { Container, Card, Button } from '@/styles/StyledComponents';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { APP_NAME, APP_DESCRIPTION } from '@/lib/utils/constants';

// Helper to lighten colors for gradients if needed (can be moved to a utils file)
// This is a very basic implementation. For production, consider a more robust color manipulation library or pre-calculated shades.
const lightenColor = (hex: string, percent: number): string => {
  hex = hex.replace(/^\s*#|\s*$/g, '');
  if (hex.length === 3) {
    hex = hex.replace(/(.)/g, '$1$1');
  }
  const num = parseInt(hex, 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
};


const HomePage = styled.div`
  /* Keep overall background white for now, or set to a very light theme color if desired */
  background: ${({ theme }) => theme.colors.background};
  min-height: 100vh;
`;

const Hero = styled.section`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xxl} ${({ theme }) => theme.spacing.lg}; // Added horizontal padding
  // Using a subtle gradient from a very light version of primary to a very light version of blue (cyan)
  // Adjust percentages for desired subtlety. 
  // Ensure the text colors (Title, Subtitle) have good contrast.
  background: linear-gradient(135deg, 
    ${({ theme }) => lightenColor(theme.colors.primary, 45)}, // Very light purple
    ${({ theme }) => lightenColor(theme.colors.blue, 48)}    // Very light cyan
  );
  border-bottom: 1px solid ${({ theme }) => theme.colors.border}; // Optional: for a soft separation

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${({ theme }) => theme.spacing.xl} ${({ theme }) => theme.spacing.md};
  }
`;

const Title = styled.h1`
  color: ${({ theme }) => theme.colors.primaryDark}; // Darker primary for better contrast on light gradient
  font-size: 3rem;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  font-weight: 700; // Make it bolder

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 2.5rem;
  }
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.text}; // Slightly darker for better contrast on light gradient
  font-size: 1.5rem;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  max-width: 700px; // Constrain width for readability
  margin-left: auto;
  margin-right: auto;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 1.2rem;
  }
`;

const CTAButtons = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.lg};
  justify-content: center;
  margin-bottom: ${({ theme }) => theme.spacing.xxl};
`;

const ContentWrapper = styled(Container)` // Use Container for consistent padding
  padding-top: ${({ theme }) => theme.spacing.xxl};
  padding-bottom: ${({ theme }) => theme.spacing.xxl};
`;

const Features = styled.section`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing.xl};
  /* Removed margin-top, ContentWrapper handles overall spacing */
`;

// Added $accentColor prop for dynamic styling
const FeatureCard = styled(Card)<{ $accentColor?: string }>`
  padding: ${({ theme }) => theme.spacing.xl};
  text-align: center;
  border-top: 5px solid ${({ theme, $accentColor }) => $accentColor || theme.colors.primary};
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;

  &:hover {
    transform: translateY(-5px);
    box-shadow: ${({ theme }) => theme.shadows.lg};
  }
  
  h3 {
    // Use the accent color for the heading
    color: ${({ theme, $accentColor }) => $accentColor || theme.colors.primary};
    margin-bottom: ${({ theme }) => theme.spacing.md};
    font-size: 1.3rem; // Slightly larger
  }
  
  p {
    color: ${({ theme }) => theme.colors.textLight};
    font-size: 1rem; // Slightly larger
  }
`;

// Optional: For displaying the Skolr logo image if you have it


export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false); 
  const router = useRouter();
  const supabase = createClient();
  const theme = useTheme(); // Access the theme object for colors

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      setLoading(true); 
      setIsRedirecting(false); 

      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser(); 
        setUser(currentUser);
        
        if (currentUser) {
          setIsRedirecting(true); 
          
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', currentUser.id)
            .single();

          if (profileError) {
            console.error('Error fetching profile on homepage:', profileError.message);
            setIsRedirecting(false); 
            setLoading(false);
            return;
          }
          
          if (profile?.role === 'teacher') {
            router.push('/teacher-dashboard');
          } else if (profile?.role === 'student') {
            router.push('/student/dashboard'); 
          } else {
            setIsRedirecting(false);
          }
        }
      } catch (error) {
        console.error('Error in checkUserAndRedirect on homepage:', error);
        setIsRedirecting(false);
      } finally {
        setLoading(false);
      }
    };

    checkUserAndRedirect();
  }, [router, supabase]);

  if (loading || isRedirecting) {
    return (
      <HomePage>
        <ContentWrapper> {/* Use ContentWrapper for consistent padding */}
          <Hero> {/* Hero still used for structure, but gradient is lighter */}
            <Title>{loading ? "Loading..." : APP_NAME}</Title>
          </Hero>
        </ContentWrapper>
      </HomePage>
    );
  }

  // Define accent colors for feature cards from your theme
  const featureCardAccents = [
    theme.colors.magenta, // #C848AF
    theme.colors.blue,    // #4CBEF3 (which is your theme.colors.blue, originally skolrCyan)
    theme.colors.green    // #7BBC44
  ];

  return (
    <HomePage>
      <Hero>
        {/* Optional: If you have the Skolr logo image */}
        {/* <LogoImageContainer>
          <Image 
            src="/logos/skolr-banner.png" // Replace with your actual logo path
            alt="Skolr"
            width={500} // Adjust
            height={150} // Adjust
            priority
          />
        </LogoImageContainer> */}
        <Title>{APP_NAME}</Title>
        <Subtitle>{APP_DESCRIPTION}</Subtitle>
        
        {!user && (
          <CTAButtons>
            <Button size="large" onClick={() => router.push('/auth?type=teacher_signup')}>
              Teacher Sign Up
            </Button>
            <Button size="large" variant="secondary" onClick={() => router.push('/student-access')}>
              Student Login
            </Button>
          </CTAButtons>
        )}
      </Hero>

      <ContentWrapper> {/* Wrap Features in ContentWrapper for padding */}
        <Features>
          <FeatureCard $accentColor={featureCardAccents[0]}>
            <h3>For Teachers</h3>
            <p>Create custom AI learning companions tailored to your classroom needs and curriculum.</p>
          </FeatureCard>
          <FeatureCard $accentColor={featureCardAccents[1]}>
            <h3>For Students</h3>
            <p>Engage interactively with AI assistants for support, practice, and deeper understanding.</p>
          </FeatureCard>
          <FeatureCard $accentColor={featureCardAccents[2]}>
            <h3>Smart & Safe</h3>
            <p>Benefit from RAG-powered knowledge, AI assessments, and integrated safety monitoring.</p>
          </FeatureCard>
        </Features>
      </ContentWrapper>
    </HomePage>
  );
}