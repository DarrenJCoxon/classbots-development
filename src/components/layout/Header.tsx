// src/components/layout/Header.tsx
'use client';

import styled from 'styled-components';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client'; // Your client import
import { Container, Button } from '@/styles/StyledComponents';
import { APP_NAME } from '@/lib/utils/constants';
import type { User } from '@supabase/supabase-js';
import { usePathname } from 'next/navigation'; // Import usePathname for active link styling

const HeaderWrapper = styled.header`
  background: ${({ theme }) => theme.colors.background};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.spacing.md} 0;
  position: sticky;
  top: 0;
  z-index: 100;
`;

const HeaderContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-wrap: wrap;
    gap: ${({ theme }) => theme.spacing.sm};
  }
`;

const Logo = styled(Link)`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  
  &:hover {
    color: ${({ theme }) => theme.colors.primaryDark};
  }
`;

const Nav = styled.nav`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.lg};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    order: 3;
    width: 100%;
    justify-content: center;
    margin-top: ${({ theme }) => theme.spacing.sm};
    gap: ${({ theme }) => theme.spacing.md};
  }
`;

const NavLink = styled(Link)<{ $isActive?: boolean }>`
  color: ${({ theme, $isActive }) => $isActive ? theme.colors.primary : theme.colors.text};
  text-decoration: none;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  transition: all ${({ theme }) => theme.transitions.fast};
  font-weight: ${({ $isActive }) => $isActive ? '600' : '500'};
  background: ${({ theme, $isActive }) => $isActive ? (theme.colors.primary + '20') : 'transparent'};
  
  &:hover {
    background: ${({ theme, $isActive }) => $isActive ? (theme.colors.primary + '30') : theme.colors.backgroundDark};
    color: ${({ theme }) => theme.colors.primary};
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${({ theme }) => theme.spacing.sm};
    flex: 1;
    text-align: center;
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

  const isLinkActive = (href: string) => {
    if (href === '/teacher-dashboard' || href === '/student/dashboard') {
        return pathname.startsWith(href);
    }
    return pathname === href;
  };

  return (
    <HeaderWrapper>
      <Container>
        <HeaderContent>
          <Logo href="/">
            {APP_NAME}
          </Logo>
          
          {user && userRole && (
            <Nav>
              {userRole === 'teacher' && (
                <NavLink href="/teacher-dashboard" $isActive={isLinkActive('/teacher-dashboard')}>
                  Dashboard
                </NavLink>
              )}
              {userRole === 'student' && (
                <NavLink href="/student/dashboard" $isActive={isLinkActive('/student/dashboard')}>
                  Dashboard 
                </NavLink>
              )}
            </Nav>
          )}
          
          <UserSection>
            {user ? (
              <HeaderButton variant="outline" onClick={handleSignOut}>
                Sign Out
              </HeaderButton>
            ) : (
              pathname !== '/auth' && (
                <HeaderButton as={Link} href="/auth">
                  Sign In
                </HeaderButton>
              )
            )}
          </UserSection>
        </HeaderContent>
      </Container>
    </HeaderWrapper>
  );
}