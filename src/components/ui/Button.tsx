// Unified Button Component System
import React from 'react';
import styled, { css, keyframes } from 'styled-components';
import { motion, HTMLMotionProps } from 'framer-motion';
import Link from 'next/link';

// Button types
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'small' | 'medium' | 'large';

interface BaseButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  gradient?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

interface ButtonProps extends BaseButtonProps, Omit<HTMLMotionProps<"button">, 'children'> {
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  children: React.ReactNode;
}

interface LinkButtonProps extends BaseButtonProps {
  href: string;
  external?: boolean;
  children: React.ReactNode;
}

// Animations
const shimmer = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

// Size configurations
const sizeConfig = {
  small: {
    padding: '8px 16px',
    fontSize: '12px',
    iconSize: '14px',
    gap: '6px',
    mobilePadding: '6px 12px',
    mobileFontSize: '11px'
  },
  medium: {
    padding: '12px 24px',
    fontSize: '14px',
    iconSize: '16px',
    gap: '8px',
    mobilePadding: '10px 16px',
    mobileFontSize: '13px'
  },
  large: {
    padding: '16px 32px',
    fontSize: '16px',
    iconSize: '20px',
    gap: '10px',
    mobilePadding: '12px 20px',
    mobileFontSize: '14px'
  }
};

// Variant styles
const variantStyles = {
  primary: css`
    background: linear-gradient(135deg, 
      ${({ theme }) => theme.colors.primary}, 
      ${({ theme }) => theme.colors.magenta}
    );
    color: white;
    border: none;
    
    &:hover:not(:disabled) {
      box-shadow: 0 8px 24px rgba(152, 93, 215, 0.3);
    }
  `,
  secondary: css`
    background: linear-gradient(135deg, 
      ${({ theme }) => theme.colors.magenta}, 
      ${({ theme }) => theme.colors.blue}
    );
    color: white;
    border: none;
    
    &:hover:not(:disabled) {
      box-shadow: 0 8px 24px rgba(200, 72, 175, 0.3);
    }
  `,
  ghost: css`
    background: transparent;
    color: ${({ theme }) => theme.colors.primary};
    border: 2px solid ${({ theme }) => theme.colors.primary};
    
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.colors.primary}10;
      border-color: ${({ theme }) => theme.colors.magenta};
      color: ${({ theme }) => theme.colors.magenta};
    }
  `,
  danger: css`
    background: linear-gradient(135deg, 
      ${({ theme }) => theme.colors.pink}, 
      ${({ theme }) => theme.colors.magenta}
    );
    color: white;
    border: none;
    
    &:hover:not(:disabled) {
      box-shadow: 0 8px 24px rgba(254, 67, 114, 0.3);
    }
  `,
  success: css`
    background: linear-gradient(135deg, 
      ${({ theme }) => theme.colors.blue}, 
      ${({ theme }) => theme.colors.primary}
    );
    color: white;
    border: none;
    
    &:hover:not(:disabled) {
      box-shadow: 0 8px 24px rgba(76, 190, 243, 0.3);
    }
  `
};

// Base button styles
const baseButtonStyles = css<{
  $variant: ButtonVariant;
  $size: ButtonSize;
  $fullWidth: boolean;
  $gradient: boolean;
  $hasIcon: boolean;
  $hasIconRight: boolean;
}>`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ $size }) => sizeConfig[$size].gap};
  padding: ${({ $size }) => sizeConfig[$size].padding};
  font-size: ${({ $size }) => sizeConfig[$size].fontSize};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${({ $size }) => sizeConfig[$size].mobilePadding};
    font-size: ${({ $size }) => sizeConfig[$size].mobileFontSize};
    min-height: 44px; /* iOS touch target */
    
    svg {
      width: ${({ $size }) => $size === 'small' ? '12px' : $size === 'large' ? '18px' : '14px'};
      height: ${({ $size }) => $size === 'small' ? '12px' : $size === 'large' ? '18px' : '14px'};
    }
  }
  font-weight: 600;
  font-family: ${({ theme }) => theme.fonts.heading};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;
  white-space: nowrap;
  text-decoration: none;
  text-align: center;
  
  ${({ $fullWidth }) => $fullWidth && css`
    width: 100%;
  `}
  
  ${({ $variant }) => variantStyles[$variant]}
  
  ${({ $gradient, $variant }) => $gradient && ($variant === 'primary' || $variant === 'secondary') && css`
    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.3),
        transparent
      );
      transform: translateX(-100%);
      animation: ${shimmer} 2s infinite;
    }
  `}
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  svg {
    width: ${({ $size }) => sizeConfig[$size].iconSize};
    height: ${({ $size }) => sizeConfig[$size].iconSize};
    flex-shrink: 0;
  }
`;

// Styled components
const StyledButton = styled(motion.button)<{
  $variant: ButtonVariant;
  $size: ButtonSize;
  $fullWidth: boolean;
  $gradient: boolean;
  $hasIcon: boolean;
  $hasIconRight: boolean;
}>`
  ${baseButtonStyles}
`;

const StyledLinkButton = styled(Link)<{
  $variant: ButtonVariant;
  $size: ButtonSize;
  $fullWidth: boolean;
  $gradient: boolean;
  $hasIcon: boolean;
  $hasIconRight: boolean;
}>`
  ${baseButtonStyles}
`;

// Loading spinner
const LoadingSpinner = styled.span<{ $size: ButtonSize }>`
  display: inline-block;
  width: ${({ $size }) => sizeConfig[$size].iconSize};
  height: ${({ $size }) => sizeConfig[$size].iconSize};
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: ${spin} 0.6s linear infinite;
`;

// Main Button Component
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  gradient = true,
  icon,
  iconRight,
  loading = false,
  disabled = false,
  className,
  children,
  onClick,
  type = 'button',
  ...motionProps
}) => {
  return (
    <StyledButton
      $variant={variant}
      $size={size}
      $fullWidth={fullWidth}
      $gradient={gradient}
      $hasIcon={!!icon}
      $hasIconRight={!!iconRight}
      className={className}
      onClick={onClick}
      disabled={disabled || loading}
      type={type}
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      transition={{ duration: 0.2 }}
      {...motionProps}
    >
      {loading ? (
        <>
          <LoadingSpinner $size={size} />
          Loading...
        </>
      ) : (
        <>
          {icon}
          {children}
          {iconRight}
        </>
      )}
    </StyledButton>
  );
};

// Link Button Component
export const LinkButton: React.FC<LinkButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  gradient = true,
  icon,
  iconRight,
  className,
  children,
  href,
  external = false
}) => {
  const Component = external ? 'a' : StyledLinkButton;
  const props = external ? { href, target: '_blank', rel: 'noopener noreferrer' } : { href };
  
  return (
    <Component
      {...props}
      $variant={variant}
      $size={size}
      $fullWidth={fullWidth}
      $gradient={gradient}
      $hasIcon={!!icon}
      $hasIconRight={!!iconRight}
      className={className}
    >
      {icon}
      {children}
      {iconRight}
    </Component>
  );
};

// Icon Button Component
interface IconButtonProps extends Omit<ButtonProps, 'children' | 'icon' | 'iconRight'> {
  icon: React.ReactNode;
  'aria-label': string;
}

const StyledIconButton = styled(StyledButton)`
  padding: ${({ $size }) => {
    const iconPadding = {
      small: '8px',
      medium: '10px',
      large: '12px'
    };
    return iconPadding[$size];
  }};
  aspect-ratio: 1;
`;

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  'aria-label': ariaLabel,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  gradient = true,
  ...props
}) => {
  return (
    <StyledIconButton
      $variant={variant}
      $size={size}
      $fullWidth={fullWidth}
      $gradient={gradient}
      $hasIcon={false}
      $hasIconRight={false}
      aria-label={ariaLabel}
      {...props}
    >
      {icon}
    </StyledIconButton>
  );
};

// Button Group Component
interface ButtonGroupProps {
  spacing?: 'none' | 'small' | 'medium';
  align?: 'left' | 'center' | 'right';
  className?: string;
  children: React.ReactNode;
}

const StyledButtonGroup = styled.div<{
  $spacing: 'none' | 'small' | 'medium';
  $align: 'left' | 'center' | 'right';
}>`
  display: flex;
  align-items: center;
  gap: ${({ $spacing }) => {
    const gaps = {
      none: '0',
      small: '8px',
      medium: '16px'
    };
    return gaps[$spacing];
  }};
  justify-content: ${({ $align }) => {
    const alignments = {
      left: 'flex-start',
      center: 'center',
      right: 'flex-end'
    };
    return alignments[$align];
  }};
  flex-wrap: wrap;
  
  ${({ $spacing }) => $spacing === 'none' && css`
    ${StyledButton}, ${StyledLinkButton} {
      border-radius: 0;
      
      &:first-child {
        border-radius: 8px 0 0 8px;
      }
      
      &:last-child {
        border-radius: 0 8px 8px 0;
      }
      
      &:not(:last-child) {
        border-right: 1px solid rgba(255, 255, 255, 0.2);
      }
    }
  `}
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    width: 100%;
    flex-direction: column;
    gap: 10px;
    
    ${StyledButton}, ${StyledLinkButton} {
      width: 100%;
      justify-content: center;
    }
    
    ${({ $spacing }) => $spacing === 'none' && css`
      ${StyledButton}, ${StyledLinkButton} {
        border-radius: 8px;
        border-right: none;
        
        &:not(:last-child) {
          border-bottom: none;
        }
      }
    `}
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    gap: 8px;
  }
`;

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  spacing = 'medium',
  align = 'left',
  className,
  children
}) => {
  return (
    <StyledButtonGroup
      $spacing={spacing}
      $align={align}
      className={className}
    >
      {children}
    </StyledButtonGroup>
  );
};

export default { Button, LinkButton, IconButton, ButtonGroup };