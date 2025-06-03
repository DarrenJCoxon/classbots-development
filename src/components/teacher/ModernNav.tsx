// Modern animated navigation component
import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  FiHome, 
  FiUsers, 
  FiMessageSquare, 
  FiBookOpen, 
  FiAlertTriangle,
  FiUser,
  FiBarChart2,
  FiSettings,
  FiLogOut,
  FiMenu,
  FiX,
  FiHelpCircle,
  FiShield,
  FiUserCheck,
  FiPlayCircle
} from 'react-icons/fi';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/teacher-dashboard', icon: <FiHome /> },
  { label: 'Rooms', href: '/teacher-dashboard/rooms', icon: <FiUsers /> },
  { label: 'Students', href: '/teacher-dashboard/students', icon: <FiUserCheck /> },
  { label: 'Skolrs', href: '/teacher-dashboard/chatbots', icon: <FiMessageSquare /> },
  // { label: 'Courses', href: '/teacher-dashboard/courses', icon: <FiPlayCircle /> }, // Temporarily disabled - video URL issue
  { label: 'Assessments', href: '/teacher-dashboard/assessments', icon: <FiBookOpen /> },
  { label: 'Concerns', href: '/teacher-dashboard/concerns', icon: <FiAlertTriangle /> },
  { label: 'Content Filters', href: '/teacher-dashboard/content-filters', icon: <FiShield /> },
  { label: 'Guide', href: '/teacher-dashboard/guide', icon: <FiHelpCircle /> },
  { label: 'Profile', href: '/teacher-dashboard/profile', icon: <FiUser /> },
];

const NavContainer = styled(motion.nav)<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: ${({ $isOpen }) => $isOpen ? '280px' : '80px'};
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-right: 1px solid rgba(152, 93, 215, 0.1);
  box-shadow: 0 0 40px rgba(152, 93, 215, 0.1);
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

const MobileLogo = styled.img`
  height: 40px;
  width: auto;
  object-fit: contain;
  display: block;
`;

const BurgerButton = styled.button`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(152, 93, 215, 0.1);
  border-radius: 12px;
  padding: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(152, 93, 215, 0.1);
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 24px rgba(152, 93, 215, 0.15);
  }
  
  svg {
    width: 24px;
    height: 24px;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const MobileDropdownMenu = styled(motion.div)<{ $isOpen: boolean }>`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 12px;
  min-width: 280px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(152, 93, 215, 0.1);
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(152, 93, 215, 0.15);
  display: ${({ $isOpen }) => $isOpen ? 'block' : 'none'};
  overflow: hidden;
`;

const LogoSection = styled.div<{ $isOpen: boolean }>`
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: ${({ $isOpen }) => $isOpen ? 'space-between' : 'center'};
  border-bottom: 1px solid rgba(152, 93, 215, 0.1);
  min-height: 80px;
`;

const Logo = styled(motion.div)`
  font-size: 24px;
  font-weight: 700;
  font-family: ${({ theme }) => theme.fonts.display};
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.primary}, ${({ theme }) => theme.colors.blue});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 2px;
  text-transform: uppercase;
`;

const MenuToggle = styled(motion.button)`
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.primary};
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

const NavLink = styled(Link)<{ $isActive: boolean; $isOpen: boolean }>`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  border-radius: 12px;
  text-decoration: none;
  color: ${({ $isActive, theme }) => $isActive ? theme.colors.primary : theme.colors.text};
  background: ${({ $isActive }) => $isActive ? 'rgba(152, 93, 215, 0.1)' : 'transparent'};
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, 
      ${({ theme }) => theme.colors.primary}20, 
      ${({ theme }) => theme.colors.blue}20
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
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.blue}
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
    background: rgba(152, 93, 215, 0.05);
  }
`;

const BottomSection = styled.div`
  padding: 16px;
  border-top: 1px solid rgba(152, 93, 215, 0.1);
`;

const UserInfo = styled(Link)<{ $isOpen: boolean }>`
  display: flex;
  align-items: center;
  justify-content: ${({ $isOpen }) => $isOpen ? 'flex-start' : 'center'};
  gap: 12px;
  padding: ${({ $isOpen }) => $isOpen ? '12px' : '8px'};
  border-radius: 12px;
  background: rgba(152, 93, 215, 0.05);
  margin-bottom: 12px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
  cursor: pointer;
  
  &:hover {
    background: rgba(152, 93, 215, 0.1);
    transform: ${({ $isOpen }) => $isOpen ? 'translateX(2px)' : 'none'};
  }
`;

const Avatar = styled.div<{ $isOpen: boolean }>`
  width: ${({ $isOpen }) => $isOpen ? '40px' : '32px'};
  height: ${({ $isOpen }) => $isOpen ? '40px' : '32px'};
  border-radius: 50%;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.blue}
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
  color: ${({ $isActive, theme }) => $isActive ? theme.colors.primary : theme.colors.text};
  background: ${({ $isActive }) => $isActive ? 'rgba(152, 93, 215, 0.05)' : 'transparent'};
  font-weight: 500;
  font-size: 16px;
  transition: all 0.2s ease;
  border-bottom: 1px solid rgba(152, 93, 215, 0.1);
  
  &:hover {
    background: rgba(152, 93, 215, 0.05);
    color: ${({ theme }) => theme.colors.primary};
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const MobileUserSection = styled.div`
  padding: 20px 24px;
  border-top: 1px solid rgba(152, 93, 215, 0.1);
  background: rgba(152, 93, 215, 0.02);
`;

export const ModernNav: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<{
    full_name: string | null;
    email: string | null;
  }>({ full_name: null, email: null });
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  
  // Check if we're on mobile
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
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
    // Fetch teacher profile
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('teacher_profiles')
          .select('full_name, email')
          .eq('user_id', user.id)
          .single();
          
        if (profile) {
          setTeacherProfile(profile);
        }
      }
    };
    
    fetchProfile();
  }, [supabase]);
  
  const getInitials = (name: string | null) => {
    if (!name) return 'T';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };
  
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };
  
  // Mock badge count - replace with actual data
  const concernsCount = 3;

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
            (item.href !== '/teacher-dashboard' && pathname.startsWith(item.href));
          const showBadge = item.label === 'Concerns' && concernsCount > 0;
          
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
                $isActive={isActive}
                $isOpen={isOpen}
              >
                {item.icon}
                <span>{item.label}</span>
                {showBadge && isOpen && (
                  <Badge
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 15 }}
                  >
                    {concernsCount}
                  </Badge>
                )}
              </NavLink>
              
              {!isOpen && hoveredItem === item.label && (
                <Tooltip
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                >
                  {item.label}
                  {showBadge && ` (${concernsCount})`}
                </Tooltip>
              )}
            </NavItemWrapper>
          );
        })}
      </NavList>
      
      <BottomSection>
        <UserInfo href="/teacher-dashboard/profile" $isOpen={isOpen}>
          <Avatar $isOpen={isOpen}>{getInitials(teacherProfile.full_name)}</Avatar>
          <UserDetails $isOpen={isOpen}>
            <h4>{teacherProfile.full_name || 'Teacher'}</h4>
            <p>{teacherProfile.email || 'Loading...'}</p>
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
    <MobileNavWrapper ref={mobileMenuRef}>
      <MobileNavHeader>
        <MobileLogo src="/images/skolr_new.png" alt="Skolr" />
        <BurgerButton onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <FiX /> : <FiMenu />}
        </BurgerButton>
      </MobileNavHeader>
      
      <MobileDropdownMenu $isOpen={isOpen}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/teacher-dashboard' && pathname.startsWith(item.href));
          
          return (
            <MobileNavLink
              key={item.href}
              href={item.href}
              $isActive={isActive}
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </MobileNavLink>
          );
        })}
        
        <MobileUserSection>
          <UserInfo href="/teacher-dashboard/profile" $isOpen={true} style={{ marginBottom: '12px' }}>
            <Avatar $isOpen={true}>{getInitials(teacherProfile.full_name)}</Avatar>
            <UserDetails $isOpen={true}>
              <h4>{teacherProfile.full_name || 'Teacher'}</h4>
              <p>{teacherProfile.email || 'Loading...'}</p>
            </UserDetails>
          </UserInfo>
          
          <SignOutButton 
            onClick={handleSignOut}
            $isOpen={true}
            style={{ justifyContent: 'center' }}
          >
            <FiLogOut />
            <span>Sign Out</span>
          </SignOutButton>
        </MobileUserSection>
      </MobileDropdownMenu>
    </MobileNavWrapper>
    </>
  );
};