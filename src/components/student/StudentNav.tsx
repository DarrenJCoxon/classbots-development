// src/components/student/StudentNav.tsx
'use client';

import Link from 'next/link';
import styled from 'styled-components';
import { usePathname } from 'next/navigation';

const NavWrapper = styled.nav`
  background-color: ${({ theme }) => theme.colors.backgroundCard};
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  box-shadow: ${({ theme }) => theme.shadows.sm};

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    gap: ${({ theme }) => theme.spacing.md};
    flex-wrap: wrap; // Allow wrapping on smaller screens
    justify-content: center; // Center the navigation items
  }

  li a {
    text-decoration: none;
    color: ${({ theme }) => theme.colors.textLight};
    padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
    border-radius: ${({ theme }) => theme.borderRadius.small};
    font-weight: 500;
    transition: all ${({ theme }) => theme.transitions.fast};
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.xs};

    &:hover {
      color: ${({ theme }) => theme.colors.primary};
      background-color: ${({ theme }) => theme.colors.backgroundDark};
    }

    &.active {
      color: ${({ theme }) => theme.colors.primary};
      background-color: ${({ theme }) => theme.colors.primary + '20'}; // Light primary background
    }
  }
`;

const DashboardIcon = styled.span`
  font-size: 1.2em;
  margin-right: 0.25rem;
`;

export default function StudentNav() {
  const pathname = usePathname();

  const navItems = [
    { 
      href: '/student/dashboard', 
      label: 'Dashboard',
      icon: '📊'
    }
  ];

  return (
    <NavWrapper>
      <ul>
        {navItems.map((item) => (
          <li key={item.href}>
            <Link 
              href={item.href}
              className={pathname === item.href ? 'active' : ''}
            >
              <DashboardIcon>{item.icon}</DashboardIcon>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </NavWrapper>
  );
}