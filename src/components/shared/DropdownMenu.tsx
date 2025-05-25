// Simple dropdown menu component
import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

interface DropdownMenuItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: 'default' | 'danger';
}

interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownMenuItem[];
}

const DropdownContainer = styled.div`
  position: relative;
`;

const DropdownList = styled(motion.div)`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid ${({ theme }) => theme.colors.border};
  min-width: 180px;
  z-index: 1000;
  overflow: hidden;
`;

const DropdownItem = styled.button<{ variant?: string }>`
  width: 100%;
  padding: 12px 16px;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: ${({ variant, theme }) => 
    variant === 'danger' ? theme.colors.danger : theme.colors.text
  };
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors.backgroundDark};
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ trigger, items }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  return (
    <DropdownContainer ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <DropdownList
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {items.map((item, index) => (
              <DropdownItem
                key={index}
                variant={item.variant}
                onClick={() => {
                  item.onClick();
                  setIsOpen(false);
                }}
              >
                {item.icon}
                {item.label}
              </DropdownItem>
            ))}
          </DropdownList>
        )}
      </AnimatePresence>
    </DropdownContainer>
  );
};