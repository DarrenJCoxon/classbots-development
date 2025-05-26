// Unified Card Component System
import React from 'react';
import styled, { css } from 'styled-components';
import { motion, HTMLMotionProps } from 'framer-motion';

// Card variants
export type CardVariant = 'default' | 'stats' | 'content' | 'action' | 'minimal';
export type CardSize = 'small' | 'medium' | 'large';

interface CardProps extends HTMLMotionProps<"div"> {
  variant?: CardVariant;
  size?: CardSize;
  hoverable?: boolean;
  noPadding?: boolean;
  gradient?: boolean;
  accentColor?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  className?: string;
  children: React.ReactNode;
}

// Consistent padding scales
const paddingScales = {
  small: css`
    padding: 16px;
    
    @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
      padding: 12px;
    }
    
    @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
      padding: 12px;
    }
  `,
  medium: css`
    padding: 20px;
    
    @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
      padding: 16px;
    }
    
    @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
      padding: 12px;
    }
  `,
  large: css`
    padding: 24px;
    
    @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
      padding: 20px;
    }
    
    @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
      padding: 16px;
    }
  `
};

// Variant styles
const variantStyles = {
  default: css`
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(152, 93, 215, 0.1);
  `,
  stats: css`
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(30px);
    border: 1px solid rgba(152, 93, 215, 0.08);
  `,
  content: css`
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(15px);
    border: 1px solid rgba(152, 93, 215, 0.12);
  `,
  action: css`
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(25px);
    border: 1px solid rgba(152, 93, 215, 0.15);
  `,
  minimal: css`
    background: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(152, 93, 215, 0.05);
  `
};

const StyledCard = styled(motion.div)<{
  $variant: CardVariant;
  $size: CardSize;
  $hoverable: boolean;
  $noPadding: boolean;
  $gradient: boolean;
  $accentColor?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
}>`
  position: relative;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(152, 93, 215, 0.05);
  overflow: hidden;
  transition: all 0.3s ease;
  
  ${({ $variant }) => variantStyles[$variant]}
  ${({ $size, $noPadding }) => !$noPadding && paddingScales[$size]}
  
  ${({ $hoverable }) => $hoverable && css`
    cursor: pointer;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 20px 60px rgba(152, 93, 215, 0.1);
    }
  `}
  
  ${({ $gradient, $accentColor, theme }) => $gradient && css`
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: ${() => {
        const gradients = {
          primary: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.magenta})`,
          secondary: `linear-gradient(135deg, ${theme.colors.magenta}, ${theme.colors.blue})`,
          success: `linear-gradient(135deg, ${theme.colors.blue}, ${theme.colors.primary})`,
          warning: `linear-gradient(135deg, ${theme.colors.magenta}, ${theme.colors.pink})`,
          danger: `linear-gradient(135deg, ${theme.colors.pink}, ${theme.colors.magenta})`
        };
        return gradients[$accentColor || 'primary'];
      }};
    }
  `}
  
  &::after {
    content: '';
    position: absolute;
    top: -50%;
    right: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(
      circle,
      ${({ theme, $accentColor }) => {
        const colors = {
          primary: theme.colors.primary,
          secondary: theme.colors.magenta,
          success: theme.colors.blue,
          warning: theme.colors.magenta,
          danger: theme.colors.pink
        };
        return colors[$accentColor || 'primary'];
      }}05 0%,
      transparent 70%
    );
    pointer-events: none;
  }
`;

// Card Header Component
export const CardHeader = styled.div<{ noBorder?: boolean }>`
  position: relative;
  padding-bottom: 16px;
  margin-bottom: 16px;
  
  ${({ noBorder }) => !noBorder && css`
    border-bottom: 1px solid rgba(152, 93, 215, 0.1);
  `}
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding-bottom: 12px;
    margin-bottom: 12px;
  }
`;

// Card Body Component
export const CardBody = styled.div`
  position: relative;
  z-index: 1;
`;

// Card Footer Component
export const CardFooter = styled.div<{ noBorder?: boolean }>`
  position: relative;
  padding-top: 16px;
  margin-top: 16px;
  
  ${({ noBorder }) => !noBorder && css`
    border-top: 1px solid rgba(152, 93, 215, 0.1);
  `}
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding-top: 12px;
    margin-top: 12px;
  }
`;

// Main Card Component
export const Card: React.FC<CardProps> = ({
  variant = 'default',
  size = 'medium',
  hoverable = false,
  noPadding = false,
  gradient = false,
  accentColor,
  className,
  children,
  ...motionProps
}) => {
  return (
    <StyledCard
      $variant={variant}
      $size={size}
      $hoverable={hoverable}
      $noPadding={noPadding}
      $gradient={gradient}
      $accentColor={accentColor}
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      {...motionProps}
    >
      {children}
    </StyledCard>
  );
};

// Stats Card Specific Component
interface StatsCardProps extends Omit<CardProps, 'variant' | 'children'> {
  icon?: React.ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  onClick?: () => void;
}

const StatsCardContent = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    gap: 12px;
  }
`;

const StatsIconWrapper = styled.div<{ $color?: string }>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $color, theme }) => $color ? `${$color}15` : `${theme.colors.primary}15`};
  flex-shrink: 0;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    width: 36px;
    height: 36px;
    border-radius: 8px;
  }
  
  svg {
    width: 24px;
    height: 24px;
    color: ${({ $color, theme }) => $color || theme.colors.primary};
    
    @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
      width: 18px;
      height: 18px;
    }
  }
`;

const StatsInfo = styled.div`
  flex: 1;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
`;

const StatsTitle = styled.h3`
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textLight};
  font-family: ${({ theme }) => theme.fonts.heading};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    font-size: 11px;
    letter-spacing: 0;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    order: 1;
  }
`;

const StatsValue = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.2;
  margin: 4px 0;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    font-size: 18px;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    margin: 0;
    order: 2;
  }
`;

const StatsSubtitle = styled.p`
  margin: 0;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textMuted};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    display: none;
  }
`;

export const StatsCard: React.FC<StatsCardProps> = ({
  icon,
  title,
  value,
  subtitle,
  trend,
  onClick,
  accentColor = 'primary',
  ...cardProps
}) => {
  const accentColors = {
    primary: '#985DD7',
    secondary: '#C848AF',
    success: '#4CBEF3',
    warning: '#C848AF',
    danger: '#FE4372'
  };
  
  return (
    <Card
      variant="stats"
      gradient
      accentColor={accentColor}
      hoverable={!!onClick}
      onClick={onClick}
      {...cardProps}
    >
      <StatsCardContent>
        {icon && (
          <StatsIconWrapper $color={accentColors[accentColor]}>
            {icon}
          </StatsIconWrapper>
        )}
        <StatsInfo>
          <StatsTitle>{title}</StatsTitle>
          <StatsValue>{value}</StatsValue>
          {subtitle && <StatsSubtitle>{subtitle}</StatsSubtitle>}
        </StatsInfo>
      </StatsCardContent>
    </Card>
  );
};

export default Card;