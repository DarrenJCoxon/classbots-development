// src/components/auth/SignInDropdown.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import Link from 'next/link';
import { Button } from '@/styles/StyledComponents';

const DropdownContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const DropdownMenu = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.5rem;
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: ${({ $isOpen }) => ($isOpen ? 'block' : 'none')};
  min-width: 200px;
  z-index: 1000;
  overflow: hidden;
`;

const DropdownItem = styled(Link)`
  display: block;
  padding: 0.75rem 1rem;
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;
  font-size: 0.9rem;
  
  &:hover {
    background: ${({ theme }) => theme.colors.backgroundDark};
  }
  
  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

const StyledButton = styled(Button)`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  
  &:after {
    content: '▼';
    font-size: 0.7rem;
    margin-top: 2px;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
    font-size: 0.9rem;
  }
`;

export default function SignInDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <DropdownContainer ref={dropdownRef}>
      <StyledButton onClick={toggleDropdown}>
        Sign In
      </StyledButton>
      
      <DropdownMenu $isOpen={isOpen}>
        <DropdownItem href="/auth?login=teacher" onClick={() => setIsOpen(false)}>
          Teacher Sign In
        </DropdownItem>
        <DropdownItem href="/student-access" onClick={() => setIsOpen(false)}>
          Student Sign In
        </DropdownItem>
      </DropdownMenu>
    </DropdownContainer>
  );
}