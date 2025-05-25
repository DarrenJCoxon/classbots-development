// Animated button component with Framer Motion
import styled from 'styled-components';
import { motion } from 'framer-motion';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'success';
type ButtonSize = 'small' | 'medium' | 'large';

interface AnimatedButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
}

const getVariantStyles = (variant: ButtonVariant) => {
  const variants: Record<ButtonVariant, string> = {
    primary: `
      background: linear-gradient(135deg, 
        ${({ theme }: any) => theme.colors.primary}, 
        ${({ theme }: any) => theme.colors.primaryDark}
      );
      color: white;
      border: none;
      
      &:hover:not(:disabled) {
        background: linear-gradient(135deg, 
          ${({ theme }: any) => theme.colors.primaryLight}, 
          ${({ theme }: any) => theme.colors.primary}
        );
      }
    `,
    secondary: `
      background: linear-gradient(135deg, 
        ${({ theme }: any) => theme.colors.secondary}, 
        ${({ theme }: any) => theme.colors.secondaryDark}
      );
      color: white;
      border: none;
      
      &:hover:not(:disabled) {
        background: linear-gradient(135deg, 
          ${({ theme }: any) => theme.colors.secondaryLight}, 
          ${({ theme }: any) => theme.colors.secondary}
        );
      }
    `,
    outline: `
      background: transparent;
      color: ${({ theme }: any) => theme.colors.primary};
      border: 2px solid ${({ theme }: any) => theme.colors.primary};
      
      &:hover:not(:disabled) {
        background: ${({ theme }: any) => theme.colors.primary};
        color: white;
      }
    `,
    danger: `
      background: ${({ theme }: any) => theme.colors.red};
      color: white;
      border: none;
      
      &:hover:not(:disabled) {
        background: ${({ theme }: any) => theme.colors.red}dd;
      }
    `,
    success: `
      background: ${({ theme }: any) => theme.colors.green};
      color: white;
      border: none;
      
      &:hover:not(:disabled) {
        background: ${({ theme }: any) => theme.colors.green}dd;
      }
    `,
  };
  
  return variants[variant] || variants.primary;
};

const getSizeStyles = (size: ButtonSize) => {
  const sizes: Record<ButtonSize, string> = {
    small: `
      padding: 8px 16px;
      font-size: 0.875rem;
    `,
    medium: `
      padding: 12px 24px;
      font-size: 1rem;
    `,
    large: `
      padding: 16px 32px;
      font-size: 1.125rem;
    `,
  };
  
  return sizes[size] || sizes.medium;
};

export const AnimatedButton = styled(motion.button)<AnimatedButtonProps>`
  ${({ variant = 'primary' }) => getVariantStyles(variant)}
  ${({ size = 'medium' }) => getSizeStyles(size)}
  
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.sm};
  
  font-weight: 600;
  font-family: ${({ theme }) => theme.fonts.body};
  
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  cursor: pointer;
  
  width: ${({ fullWidth }) => fullWidth ? '100%' : 'auto'};
  
  transition: all ${({ theme }) => theme.transitions.normal};
  position: relative;
  overflow: hidden;
  
  /* Ripple effect container */
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    transform: translate(-50%, -50%);
    transition: width 0.6s, height 0.6s;
  }
  
  &:active::before {
    width: 300px;
    height: 300px;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

// Button animation variants
export const buttonVariants = {
  initial: { scale: 1 },
  hover: { 
    scale: 1.05,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 10
    }
  },
  tap: { 
    scale: 0.95,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 10
    }
  }
};