// Modern animated navigation component for students
import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  FiHome, 
  FiMessageSquare, 
  FiBookOpen, 
  FiUser,
  FiLogOut,
  FiMenu,
  FiX,
  FiGrid
} from 'react-icons/fi';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/student/dashboard', icon: <FiHome /> },
  { label: 'My Classrooms', href: '/student/dashboard#classrooms', icon: <FiGrid /> },
  { label: 'Assessments', href: '/student/dashboard#assessments', icon: <FiBookOpen /> },
  { label: 'Profile', href: '/student/account-setup', icon: <FiUser /> },
];

const NavContainer = styled(motion.nav)<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: ${({ $isOpen }) => $isOpen ? '280px' : '80px'};
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-right: 1px solid rgba(76, 190, 243, 0.1);
  box-shadow: 0 0 40px rgba(76, 190, 243, 0.1);
  z-index: 1000;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    width: ${({ $isOpen }) => $isOpen ? '100%' : '0'};
    box-shadow: ${({ $isOpen }) => $isOpen ? '0 0 40px rgba(0, 0, 0, 0.1)' : 'none'};
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    display: none;
  }
`;

const MobileNavWrapper = styled.div`
  display: none;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    padding: 20px;
    z-index: 1000;
    background: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
`;

const MobileNavHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const BurgerButton = styled.button`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(76, 190, 243, 0.1);
  border-radius: 12px;
  padding: 12px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  box-shadow: 0 4px 20px rgba(76, 190, 243, 0.1);
  transition: all 0.2s ease;
  width: 48px;
  height: 48px;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 24px rgba(76, 190, 243, 0.15);
  }
`;

const BurgerLine = styled.span<{ $isOpen: boolean }>`
  width: 24px;
  height: 2px;
  background: ${({ theme }) => theme.colors.blue};
  transition: all 0.3s ease;
  transform-origin: center;
  
  &:nth-child(1) {
    transform: ${({ $isOpen }) => $isOpen ? 'rotate(45deg) translateY(6px)' : 'none'};
  }
  
  &:nth-child(2) {
    opacity: ${({ $isOpen }) => $isOpen ? '0' : '1'};
  }
  
  &:nth-child(3) {
    transform: ${({ $isOpen }) => $isOpen ? 'rotate(-45deg) translateY(-6px)' : 'none'};
  }
`;

const MobileDropdownMenu = styled(motion.div)`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 12px;
  min-width: 280px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(76, 190, 243, 0.1);
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(76, 190, 243, 0.15);
  overflow: hidden;
`;

const LogoSection = styled.div<{ $isOpen: boolean }>`
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: ${({ $isOpen }) => $isOpen ? 'space-between' : 'center'};
  border-bottom: 1px solid rgba(76, 190, 243, 0.1);
  min-height: 80px;
`;

const Logo = styled(motion.div)`
  font-size: 24px;
  font-weight: 700;
  font-family: ${({ theme }) => theme.fonts.display};
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.blue}, ${({ theme }) => theme.colors.primary});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 2px;
  text-transform: uppercase;
`;

const MobileLogo = styled.img`
  height: 40px;
  width: auto;
  object-fit: contain;
  display: block;
`;

const MenuToggle = styled(motion.button)`
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.blue};
  transition: transform 0.2s;
  
  &:hover {
    transform: scale(1.1);
  }
  
  svg {
    width: 24px;
    height: 24px;
  }
`;

const NavList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  flex: 1;
  padding: 16px 0;
`;

const NavItemWrapper = styled.li`
  position: relative;
  margin: 4px 12px;
`;

const NavLink = styled.a<{ $isActive: boolean; $isOpen: boolean }>`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  border-radius: 12px;
  text-decoration: none;
  color: ${({ $isActive, theme }) => $isActive ? theme.colors.blue : theme.colors.text};
  background: ${({ $isActive }) => $isActive ? 'rgba(76, 190, 243, 0.1)' : 'transparent'};
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, 
      ${({ theme }) => theme.colors.blue}20, 
      ${({ theme }) => theme.colors.primary}20
    );
    opacity: 0;
    transition: opacity 0.2s;
  }
  
  &:hover::before {
    opacity: 1;
  }
  
  svg {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }
  
  span {
    font-weight: 500;
    white-space: nowrap;
    opacity: ${({ $isOpen }) => $isOpen ? 1 : 0};
    transition: opacity 0.2s;
    ${({ $isOpen }) => !$isOpen && 'position: absolute; left: -9999px;'}
  }
`;

const ActiveIndicator = styled(motion.div)`
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 24px;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.blue}, 
    ${({ theme }) => theme.colors.primary}
  );
  border-radius: 0 4px 4px 0;
`;

const Badge = styled(motion.span)`
  position: absolute;
  top: 8px;
  right: 8px;
  background: ${({ theme }) => theme.colors.red};
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
`;

const Tooltip = styled(motion.div)`
  position: absolute;
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  margin-left: 8px;
  background: rgba(26, 30, 46, 0.95);
  color: white;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  pointer-events: none;
  
  &::before {
    content: '';
    position: absolute;
    right: 100%;
    top: 50%;
    transform: translateY(-50%);
    border: 6px solid transparent;
    border-right-color: rgba(26, 30, 46, 0.95);
  }
`;

const SignOutButton = styled.button<{ $isOpen: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  text-decoration: none;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  text-align: left;
  
  svg {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }
  
  span {
    opacity: ${({ $isOpen }) => $isOpen ? 1 : 0};
    transition: opacity 0.2s;
  }
  
  &:hover {
    background: rgba(76, 190, 243, 0.05);
  }
`;

const BottomSection = styled.div`
  padding: 16px;
  border-top: 1px solid rgba(76, 190, 243, 0.1);
`;

const UserInfo = styled(Link)<{ $isOpen: boolean }>`
  display: flex;
  align-items: center;
  justify-content: ${({ $isOpen }) => $isOpen ? 'flex-start' : 'center'};
  gap: 12px;
  padding: ${({ $isOpen }) => $isOpen ? '12px' : '8px'};
  border-radius: 12px;
  background: rgba(76, 190, 243, 0.05);
  margin-bottom: 12px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
  cursor: pointer;
  
  &:hover {
    background: rgba(76, 190, 243, 0.1);
    transform: ${({ $isOpen }) => $isOpen ? 'translateX(2px)' : 'none'};
  }
`;

const Avatar = styled.div<{ $isOpen: boolean }>`
  width: ${({ $isOpen }) => $isOpen ? '40px' : '32px'};
  height: ${({ $isOpen }) => $isOpen ? '40px' : '32px'};
  border-radius: 50%;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.blue}, 
    ${({ theme }) => theme.colors.primary}
  );
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: ${({ $isOpen }) => $isOpen ? '16px' : '14px'};
  flex-shrink: 0;
  margin: ${({ $isOpen }) => $isOpen ? '0' : '0 auto'};
  transition: all 0.3s ease;
`;

const UserDetails = styled.div<{ $isOpen: boolean }>`
  opacity: ${({ $isOpen }) => $isOpen ? 1 : 0};
  transition: opacity 0.2s;
  ${({ $isOpen }) => !$isOpen && 'position: absolute; left: -9999px;'}
  
  h4 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }
  
  p {
    margin: 0;
    font-size: 12px;
    color: ${({ theme }) => theme.colors.textLight};
  }
`;

const MobileNavLink = styled(Link)<{ $isActive: boolean }>`
  display: block;
  padding: 16px 24px;
  text-decoration: none;
  color: ${({ $isActive, theme }) => $isActive ? theme.colors.blue : theme.colors.text};
  background: ${({ $isActive }) => $isActive ? 'rgba(76, 190, 243, 0.05)' : 'transparent'};
  font-weight: 500;
  font-size: 16px;
  transition: all 0.2s ease;
  border-bottom: 1px solid rgba(76, 190, 243, 0.1);
  
  &:hover {
    background: rgba(76, 190, 243, 0.05);
    color: ${({ theme }) => theme.colors.blue};
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const MobileUserSection = styled.div`
  padding: 20px 24px;
  border-top: 1px solid rgba(76, 190, 243, 0.1);
  background: rgba(76, 190, 243, 0.02);
`;

const UserName = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 4px;
`;

const UserEmail = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textLight};
  margin-bottom: 16px;
`;

const MobileSignOutButton = styled.button`
  width: 100%;
  padding: 14px 20px;
  background: transparent;
  border: 1px solid rgba(76, 190, 243, 0.2);
  border-radius: 8px;
  color: ${({ theme }) => theme.colors.text};
  font-size: 16px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(76, 190, 243, 0.05);
    border-color: rgba(76, 190, 243, 0.3);
  }
`;

export const ModernStudentNav: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [studentProfile, setStudentProfile] = useState<{
    full_name: string | null;
    username: string | null;
  }>({ full_name: null, username: null });
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  
  // Check if we're on mobile
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 480);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isMobile && isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMobile, isOpen]);
  
  // Always collapse sidebar when pathname changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);
  
  useEffect(() => {
    // Fetch student profile
    const fetchProfile = async () => {
      // First check for direct access ID
      const directAccessId = localStorage.getItem('student_direct_access_id') || 
                           localStorage.getItem('current_student_id');
      
      if (directAccessId) {
        // Direct access user - fetch profile by ID
        const { data: profile } = await supabase
          .from('student_profiles')
          .select('full_name, username')
          .eq('user_id', directAccessId)
          .single();
          
        if (profile) {
          setStudentProfile(profile);
        }
      } else {
        // Regular authenticated user
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('student_profiles')
            .select('full_name, username')
            .eq('user_id', user.id)
            .single();
            
          if (profile) {
            setStudentProfile(profile);
          }
        }
      }
    };
    
    fetchProfile();
  }, [supabase]);
  
  const getInitials = (name: string | null) => {
    if (!name) return 'S';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };
  
  // Function to get student ID from various sources
  const getStudentId = () => {
    if (typeof window === 'undefined') return null;
    
    // Check localStorage first
    const storedDirectId = localStorage.getItem('student_direct_access_id');
    const storedCurrentId = localStorage.getItem('current_student_id');
    
    // Check URL params
    const urlParams = new URLSearchParams(window.location.search);
    const urlUserId = urlParams.get('uid');
    
    return storedDirectId || storedCurrentId || urlUserId;
  };
  
  const handleSignOut = async () => {
    // Clear any stored IDs
    localStorage.removeItem('student_direct_access_id');
    localStorage.removeItem('current_student_id');
    localStorage.removeItem('direct_pin_login_user');
    
    await supabase.auth.signOut();
    router.push('/');
  };
  
  return (
    <>
    <NavContainer
      $isOpen={isOpen}
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
    >
      <LogoSection $isOpen={isOpen}>
        <AnimatePresence>
          {isOpen && (
            <Logo
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              Skolr
            </Logo>
          )}
        </AnimatePresence>
        <MenuToggle
          onClick={() => setIsOpen(!isOpen)}
          whileTap={{ scale: 0.95 }}
        >
          {isOpen ? <FiX /> : <FiMenu />}
        </MenuToggle>
      </LogoSection>
      
      <NavList>
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/student/dashboard' && pathname.startsWith(item.href.split('#')[0]));
          
          const handleClick = (e: React.MouseEvent) => {
            e.preventDefault();
            
            // For dashboard links, include user ID if available
            if (item.href.includes('/student/dashboard')) {
              const studentId = getStudentId();
              if (studentId) {
                const timestamp = Date.now();
                const accessSignature = btoa(`${studentId}:${timestamp}`);
                const baseHref = item.href.split('#')[0];
                const hash = item.href.includes('#') ? item.href.split('#')[1] : '';
                const dashboardUrl = `${baseHref}?uid=${studentId}&access_signature=${accessSignature}&ts=${timestamp}${hash ? '#' + hash : ''}`;
                router.push(dashboardUrl);
                return;
              }
            }
            
            if (item.href.includes('#')) {
              const [path, hash] = item.href.split('#');
              
              if (pathname !== path) {
                router.push(item.href);
              } else {
                const element = document.getElementById(hash);
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }
            } else {
              router.push(item.href);
            }
          };
          
          return (
            <NavItemWrapper 
              key={item.href}
              onMouseEnter={() => !isOpen && setHoveredItem(item.label)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              {isActive && (
                <ActiveIndicator
                  layoutId="activeIndicator"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                />
              )}
              
              <NavLink 
                href={item.href} 
                onClick={handleClick}
                $isActive={isActive}
                $isOpen={isOpen}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
              
              {!isOpen && hoveredItem === item.label && (
                <Tooltip
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                >
                  {item.label}
                </Tooltip>
              )}
            </NavItemWrapper>
          );
        })}
      </NavList>
      
      <BottomSection>
        <UserInfo href="/student/account-setup" $isOpen={isOpen}>
          <Avatar $isOpen={isOpen}>{getInitials(studentProfile.full_name)}</Avatar>
          <UserDetails $isOpen={isOpen}>
            <h4>{studentProfile.full_name || 'Student'}</h4>
            <p>{studentProfile.username || 'Guest User'}</p>
          </UserDetails>
        </UserInfo>
        
        <SignOutButton 
          onClick={handleSignOut}
          $isOpen={isOpen}
        >
          <FiLogOut />
          <span>Sign Out</span>
        </SignOutButton>
      </BottomSection>
    </NavContainer>

    {/* Mobile Navigation */}
    <MobileNavWrapper>
      <MobileNavHeader>
        <MobileLogo src="/images/skolr_new.png" alt="Skolr" />
        <BurgerButton onClick={() => setIsOpen(!isOpen)}>
          <BurgerLine $isOpen={isOpen} />
          <BurgerLine $isOpen={isOpen} />
          <BurgerLine $isOpen={isOpen} />
        </BurgerButton>
      </MobileNavHeader>

      <AnimatePresence>
        {isOpen && (
          <MobileDropdownMenu
            ref={mobileMenuRef}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <MobileNavLink 
              href={(() => {
                const studentId = getStudentId();
                if (studentId) {
                  const timestamp = Date.now();
                  const accessSignature = btoa(`${studentId}:${timestamp}`);
                  return `/student/dashboard?uid=${studentId}&access_signature=${accessSignature}&ts=${timestamp}`;
                }
                return '/student/dashboard';
              })()}
              $isActive={pathname === '/student/dashboard'}
            >
              Dashboard
            </MobileNavLink>
            <MobileNavLink 
              href={(() => {
                const studentId = getStudentId();
                if (studentId) {
                  const timestamp = Date.now();
                  const accessSignature = btoa(`${studentId}:${timestamp}`);
                  return `/student/dashboard?uid=${studentId}&access_signature=${accessSignature}&ts=${timestamp}#classrooms`;
                }
                return '/student/dashboard#classrooms';
              })()}
              $isActive={pathname === '/student/dashboard#classrooms'}
            >
              My Classrooms
            </MobileNavLink>
            <MobileNavLink 
              href={(() => {
                const studentId = getStudentId();
                if (studentId) {
                  const timestamp = Date.now();
                  const accessSignature = btoa(`${studentId}:${timestamp}`);
                  return `/student/dashboard?uid=${studentId}&access_signature=${accessSignature}&ts=${timestamp}#assessments`;
                }
                return '/student/dashboard#assessments';
              })()}
              $isActive={pathname === '/student/dashboard#assessments'}
            >
              Assessments
            </MobileNavLink>
            <MobileNavLink href="/student/account-setup" $isActive={pathname === '/student/account-setup'}>
              Profile
            </MobileNavLink>
            
            <MobileUserSection>
              {studentProfile.full_name && (
                <>
                  <UserName>{studentProfile.full_name}</UserName>
                  <UserEmail>{studentProfile.username || 'Guest User'}</UserEmail>
                </>
              )}
              <MobileSignOutButton onClick={handleSignOut}>
                Sign Out
              </MobileSignOutButton>
            </MobileUserSection>
          </MobileDropdownMenu>
        )}
      </AnimatePresence>
    </MobileNavWrapper>
    </>
  );
};