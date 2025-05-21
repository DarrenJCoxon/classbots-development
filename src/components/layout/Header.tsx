// src/components/layout/Header.tsx
'use client';

import styled from 'styled-components';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client'; // Your client import
import { Container, Button } from '@/styles/StyledComponents';
import SignInDropdown from '@/components/auth/SignInDropdown';
import HeaderNavigation from '@/components/layout/HeaderNavigation';
import { APP_NAME } from '@/lib/utils/constants';
import type { User } from '@supabase/supabase-js';
import { usePathname } from 'next/navigation';

const HeaderWrapper = styled.header`
  background: ${({ theme }) => theme.colors.background};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.spacing.md} 0;
  position: sticky;
  top: 0;
  z-index: 100;
  min-height: 70px;
  display: flex;
  align-items: center;
`;

const HeaderContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative; /* For absolute positioning of Nav */
  min-height: 60px; /* Ensure consistent height even when Nav is empty */
  width: 100%;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-wrap: wrap;
    gap: ${({ theme }) => theme.spacing.sm};
  }
`;

const Logo = styled(Link)`
  font-size: 1.8rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs}; /* Further reduced gap */
  padding: ${({ theme }) => theme.spacing.sm} 0;
  
  /* Create a proper container for logo images */
  > * {
    display: flex;
    align-items: center;
  }
  
  &:hover {
    color: ${({ theme }) => theme.colors.primaryDark};
  }
  
  /* Adjust logo on mobile */
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    gap: 0;
    padding: ${({ theme }) => theme.spacing.xs} 0;
  }
`;

const LogoImage = styled(Image)`
  height: auto;
  width: auto;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 55px;
    height: 55px;
  }
  
  @media (max-width: 380px) {
    width: 50px;
    height: 50px;
  }
`;

const SiteTitleImage = styled(Image)`
  height: auto;
  width: auto;
  max-height: 56px; /* Further increased from 50px */
  object-fit: contain;
  display: block;
  position: relative;
  /* Allow the image to maintain its natural aspect ratio */
  flex-shrink: 0;
  margin-left: -8px; /* Increased negative margin to bring closer to logo */
  
  /* Mobile responsiveness */
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    max-height: 45px; /* Slightly smaller on mobile */
    margin-left: -5px; /* Less negative margin on mobile */
  }
  
  /* Very small screens */
  @media (max-width: 380px) {
    max-height: 38px;
    margin-left: -3px;
  }
`;

const UserSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    min-width: 100px; /* Ensure consistent space */
    justify-content: flex-end;
  }
`;

const HeaderButton = styled(Button)`
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
    font-size: 0.9rem;
  }
`;


const ProfileButton = styled(Link)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.backgroundCard};
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  font-weight: 500;
  font-size: 0.9rem;
  transition: all ${({ theme }) => theme.transitions.fast};
  
  &:hover {
    background: ${({ theme }) => theme.colors.backgroundDark};
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
    transform: translateY(-1px);
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
    font-size: 0.8rem;
    gap: 4px;
    
    span {
      font-size: 0.7rem;
    }
  }
`;

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const supabase = createClient(); // Supabase client initialized here
  const pathname = usePathname();

  // --- START OF CODE TO ADD/VERIFY ---
  useEffect(() => {
    // Expose supabase client to the window object FOR TESTING PURPOSES ONLY
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      // @ts-expect-error // TypeScript might complain, ignore for testing
      window.supabaseClientInstance = supabase;
      console.log("Supabase client instance EXPOSED to window.supabaseClientInstance for testing.");
    }
  }, [supabase]); // Dependency array includes supabase
  // --- END OF CODE TO ADD/VERIFY ---

  useEffect(() => {
    const getUserInfo = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
      
      if (currentUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', currentUser.id)
          .single();
        
        if (profile) {
          setUserRole(profile.role);
        } else {
          setUserRole(null);
        }
      } else {
        setUserRole(null);
      }
    };
    
    getUserInfo();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user || null;
      setUser(sessionUser);
      
      if (sessionUser) {
        supabase
          .from('profiles')
          .select('role')
          .eq('user_id', sessionUser.id)
          .single()
          .then(({ data: profileData, error: profileError }) => {
            if (profileError) {
              console.warn("Error fetching profile on auth state change:", profileError.message);
              setUserRole(null);
              return;
            }
            if (profileData) {
              setUserRole(profileData.role);
            } else {
              setUserRole(null);
            }
          });
      } else {
        setUserRole(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]); // supabase is already a dependency here

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/'; 
  };


  return (
    <HeaderWrapper>
      <Container>
        <HeaderContent>
          <Logo href="/">
            <LogoImage 
              src="/images/skolr-logo.png" 
              alt="Logo" 
              width={60} 
              height={60} 
              priority
            />
            <div style={{ display: 'flex', alignItems: 'center', height: '60px', marginLeft: '-4px' }}>
              <SiteTitleImage 
                src="/images/site-title.png" 
                alt="Site Title" 
                width={290} 
                height={56} 
                priority
              />
            </div>
          </Logo>
          
          <HeaderNavigation 
            user={user} 
            userRole={userRole} 
            pathname={pathname} 
          />
          
          <UserSection>
            {user ? (
              <>
                {userRole === 'teacher' && (
                  <ProfileButton href="/teacher-dashboard/profile">
                    <span>👤</span>
                    <span>Profile</span>
                  </ProfileButton>
                )}
                <HeaderButton variant="outline" onClick={handleSignOut}>
                  Sign Out
                </HeaderButton>
              </>
            ) : (
              pathname !== '/auth' && pathname !== '/student-login' && pathname !== '/student-access' && (
                <SignInDropdown />
              )
            )}
          </UserSection>
        </HeaderContent>
      </Container>
    </HeaderWrapper>
  );
}