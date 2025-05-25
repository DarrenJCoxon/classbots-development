// Modern button component with glassmorphism
import React from 'react';
import styled, { css } from 'styled-components';
import { motion, HTMLMotionProps } from 'framer-motion';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'small' | 'medium' | 'large';

interface StyledButtonProps {
  $variant?: ButtonVariant;
  $size?: ButtonSize;
  $fullWidth?: boolean;
  disabled?: boolean;
}

interface ModernButtonProps extends Omit<HTMLMotionProps<"button">, 'ref'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
  as?: any;
}

const getVariantStyles = (variant: ButtonVariant) => {
  const styles: Record<ButtonVariant, any> = {
    primary: css`
      background: linear-gradient(135deg, 
        ${({ theme }) => theme.colors.primary}, 
        ${({ theme }) => theme.colors.magenta}
      );
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 
        0 8px 32px rgba(152, 93, 215, 0.3),
        inset 0 1px 1px rgba(255, 255, 255, 0.2);
      
      &:hover:not(:disabled) {
        background: linear-gradient(135deg, 
          ${({ theme }) => theme.colors.primaryDark}, 
          ${({ theme }) => theme.colors.magenta}
        );
        box-shadow: 
          0 12px 40px rgba(152, 93, 215, 0.4),
          inset 0 1px 1px rgba(255, 255, 255, 0.3);
        transform: translateY(-2px);
      }
    `,
    secondary: css`
      background: linear-gradient(135deg, 
        ${({ theme }) => theme.colors.blue}, 
        ${({ theme }) => theme.colors.primary}
      );
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 
        0 8px 32px rgba(76, 190, 243, 0.3),
        inset 0 1px 1px rgba(255, 255, 255, 0.2);
      
      &:hover:not(:disabled) {
        box-shadow: 
          0 12px 40px rgba(76, 190, 243, 0.4),
          inset 0 1px 1px rgba(255, 255, 255, 0.3);
        transform: translateY(-2px);
      }
    `,
    ghost: css`
      background: linear-gradient(135deg, 
        rgba(152, 93, 215, 0.1),
        rgba(254, 67, 114, 0.1)
      );
      backdrop-filter: blur(10px);
      color: ${({ theme }) => theme.colors.primary};
      border: 1px solid rgba(152, 93, 215, 0.3);
      box-shadow: 0 4px 16px rgba(152, 93, 215, 0.1);
      
      &:hover:not(:disabled) {
        background: linear-gradient(135deg, 
          rgba(152, 93, 215, 0.2),
          rgba(254, 67, 114, 0.2)
        );
        border-color: rgba(152, 93, 215, 0.5);
        box-shadow: 0 6px 24px rgba(152, 93, 215, 0.2);
        transform: translateY(-2px);
      }
    `,
    danger: css`
      background: linear-gradient(135deg, 
        ${({ theme }) => theme.colors.pink}, 
        ${({ theme }) => theme.colors.magenta}
      );
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 
        0 8px 32px rgba(254, 67, 114, 0.3),
        inset 0 1px 1px rgba(255, 255, 255, 0.2);
      
      &:hover:not(:disabled) {
        box-shadow: 
          0 12px 40px rgba(254, 67, 114, 0.4),
          inset 0 1px 1px rgba(255, 255, 255, 0.3);
        transform: translateY(-2px);
      }
    `,
  };
  
  return styles[variant];
};

const getSizeStyles = (size: ButtonSize) => {
  const sizes: Record<ButtonSize, any> = {
    small: css`
      padding: 8px 20px;
      font-size: 13px;
      font-weight: 700;
    `,
    medium: css`
      padding: 12px 32px;
      font-size: 14px;
      font-weight: 700;
    `,
    large: css`
      padding: 16px 40px;
      font-size: 16px;
      font-weight: 700;
    `,
  };
  
  return sizes[size];
};

const StyledMotionButton = styled(motion.button)<StyledButtonProps>`
  ${({ $variant = 'primary' }) => getVariantStyles($variant)}
  ${({ $size = 'medium' }) => getSizeStyles($size)}
  
  width: ${({ $fullWidth }) => $fullWidth ? '100%' : 'auto'};
  border-radius: ${({ theme }) => theme.borderRadius.large};
  font-family: ${({ theme }) => theme.fonts.heading};
  text-transform: uppercase;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  position: relative;
  overflow: hidden;
  white-space: nowrap;
  
  /* Ripple effect */
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.5);
    transform: translate(-50%, -50%);
    transition: width 0.6s, height 0.6s;
  }
  
  &:active::before {
    width: 300px;
    height: 300px;
  }
  
  &:focus {
    outline: none;
    box-shadow: 
      0 0 0 3px ${({ theme }) => theme.colors.background},
      0 0 0 5px ${({ theme }) => theme.colors.primary};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }
  
  svg {
    width: 20px;
    height: 20px;
  }
`;

// Wrapper component to handle prop conversion
export const ModernButton = React.forwardRef<HTMLButtonElement, ModernButtonProps>(
  ({ variant, size, fullWidth, as, ...rest }, ref) => {
    return (
      <StyledMotionButton
        ref={ref}
        $variant={variant}
        $size={size}
        $fullWidth={fullWidth}
        as={as}
        {...rest}
      />
    );
  }
);

ModernButton.displayName = 'ModernButton';

// Icon button variant
export const IconButton = styled(StyledMotionButton)`
  padding: 12px;
  border-radius: 50%;
  
  svg {
    width: 24px;
    height: 24px;
  }
`;

// Button group container
export const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
`;