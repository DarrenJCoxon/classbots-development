// src/components/teacher/TeacherNav.tsx
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
  }

  li a {
    text-decoration: none;
    color: ${({ theme }) => theme.colors.textLight};
    padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
    border-radius: ${({ theme }) => theme.borderRadius.small};
    font-weight: 500;
    transition: all ${({ theme }) => theme.transitions.fast};

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

const navItems = [
  { href: '/teacher-dashboard', label: 'Overview' },
  { href: '/teacher-dashboard/chatbots', label: 'Chatbots' },
  { href: '/teacher-dashboard/rooms', label: 'Rooms' },
  { href: '/teacher-dashboard/concerns', label: 'Concerns' },
  // { href: '/teacher-dashboard/students', label: 'Students' }, // Future
  // { href: '/teacher-dashboard/settings', label: 'Settings' }, // Future
];

export default function TeacherNav() {
  const pathname = usePathname();

  return (
    <NavWrapper>
      <ul>
        {navItems.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className={pathname === item.href ? 'active' : ''}>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </NavWrapper>
  );
}