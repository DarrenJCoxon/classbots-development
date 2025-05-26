// Unified Badge Components
import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
export type BadgeSize = 'small' | 'medium' | 'large';

interface BadgeProps {
  $variant?: BadgeVariant;
  $size?: BadgeSize;
  $gradient?: boolean;
}

const sizeStyles = {
  small: {
    padding: '4px 8px',
    fontSize: '11px',
    iconSize: '12px'
  },
  medium: {
    padding: '6px 12px',
    fontSize: '12px',
    iconSize: '14px'
  },
  large: {
    padding: '8px 16px',
    fontSize: '14px',
    iconSize: '16px'
  }
};

const variantStyles = {
  default: {
    background: 'rgba(0, 0, 0, 0.05)',
    color: '#333333',
    border: '1px solid rgba(0, 0, 0, 0.1)'
  },
  primary: {
    background: 'rgba(152, 93, 215, 0.1)',
    color: '#985DD7',
    border: '1px solid rgba(152, 93, 215, 0.2)'
  },
  success: {
    background: 'rgba(76, 190, 243, 0.1)',
    color: '#4CBEF3',
    border: '1px solid rgba(76, 190, 243, 0.2)'
  },
  warning: {
    background: 'rgba(255, 193, 7, 0.1)',
    color: '#FFC107',
    border: '1px solid rgba(255, 193, 7, 0.2)'
  },
  danger: {
    background: 'rgba(254, 67, 114, 0.1)',
    color: '#FE4372',
    border: '1px solid rgba(254, 67, 114, 0.2)'
  },
  info: {
    background: 'rgba(200, 72, 175, 0.1)',
    color: '#C848AF',
    border: '1px solid rgba(200, 72, 175, 0.2)'
  }
};

export const Badge = styled(motion.span)<BadgeProps>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: ${({ $size = 'medium' }) => sizeStyles[$size].padding};
  font-size: ${({ $size = 'medium' }) => sizeStyles[$size].fontSize};
  font-weight: 600;
  border-radius: 20px;
  transition: all 0.2s ease;
  
  ${({ $variant = 'default' }) => `
    background: ${variantStyles[$variant].background};
    color: ${variantStyles[$variant].color};
    border: ${variantStyles[$variant].border};
  `}
  
  ${({ $gradient, $variant = 'default' }) => $gradient && $variant === 'primary' && `
    background: linear-gradient(135deg, 
      rgba(152, 93, 215, 0.1), 
      rgba(200, 72, 175, 0.1)
    );
  `}
  
  svg {
    width: ${({ $size = 'medium' }) => sizeStyles[$size].iconSize};
    height: ${({ $size = 'medium' }) => sizeStyles[$size].iconSize};
  }
`;

interface StatusBadgeProps {
  isActive?: boolean;
  size?: BadgeSize;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  isActive = false,
  size = 'medium',
  icon,
  children,
  className,
  style
}) => {
  return (
    <Badge
      $variant={isActive ? 'success' : 'danger'}
      $size={size}
      className={className}
      style={style}
    >
      {icon}
      {children}
    </Badge>
  );
};

export const CodeBadge = styled(Badge)`
  font-family: ${({ theme }) => theme.fonts.mono};
  cursor: pointer;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
`;