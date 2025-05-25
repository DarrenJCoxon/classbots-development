// src/components/auth/SignInDropdown.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import Link from 'next/link';
import { ModernButton } from '@/components/shared/ModernButton';
import { FiChevronDown } from 'react-icons/fi';

const DropdownContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const DropdownMenu = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(152, 93, 215, 0.1);
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(152, 93, 215, 0.15);
  display: ${({ $isOpen }) => ($isOpen ? 'block' : 'none')};
  min-width: 200px;
  z-index: 1000;
  overflow: hidden;
`;

const DropdownItem = styled(Link)`
  display: block;
  padding: 12px 20px;
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(152, 93, 215, 0.05);
    color: ${({ theme }) => theme.colors.primary};
    padding-left: 24px;
  }
  
  &:not(:last-child) {
    border-bottom: 1px solid rgba(152, 93, 215, 0.1);
  }
`;

const StyledButton = styled(ModernButton)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  
  svg {
    width: 16px;
    height: 16px;
    transition: transform 0.2s ease;
  }
  
  &[data-open="true"] svg {
    transform: rotate(180deg);
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
      <StyledButton 
        onClick={toggleDropdown}
        variant="primary"
        size="medium"
        data-open={isOpen}
      >
        Sign In
        <FiChevronDown />
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