// Reusable dashboard-style card component
import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

type CardVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info';

interface DashboardCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  variant?: CardVariant;
  onClick?: () => void;
  className?: string;
  layout?: 'default' | 'compact';
  hasActions?: boolean;
}

const CardContainer = styled(motion.div)<{ $variant: CardVariant; $clickable: boolean; $hasActions?: boolean; $layout?: 'default' | 'compact' }>`
  position: relative;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: ${({ $hasActions }) => $hasActions ? '24px 24px 80px' : '20px'};
  min-height: ${({ $hasActions }) => $hasActions ? '200px' : 'auto'};
  border: 1px solid rgba(152, 93, 215, 0.1);
  box-shadow: 
    0 10px 40px rgba(152, 93, 215, 0.05),
    inset 0 1px 2px rgba(255, 255, 255, 0.5);
  overflow: hidden;
  cursor: ${({ $clickable }) => $clickable ? 'pointer' : 'default'};
  display: flex;
  flex-direction: ${({ $hasActions }) => $hasActions ? 'column' : 'row'};
  align-items: ${({ $hasActions }) => $hasActions ? 'flex-start' : 'center'};
  gap: 16px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: ${({ $hasActions }) => $hasActions ? '20px 20px 76px' : '12px'};
    gap: 12px;
    min-height: ${({ $hasActions }) => $hasActions ? '180px' : 'auto'};
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${({ $hasActions }) => $hasActions ? '20px 20px 76px' : '12px'};
    gap: 12px;
    min-height: ${({ $hasActions }) => $hasActions ? '180px' : 'auto'};
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${({ $variant, theme }) => {
      const colors = {
        primary: `linear-gradient(90deg, ${theme.colors.primary}, ${theme.colors.magenta})`,
        success: `linear-gradient(90deg, ${theme.colors.blue}, ${theme.colors.primary})`,
        warning: `linear-gradient(90deg, ${theme.colors.magenta}, ${theme.colors.pink})`,
        danger: `linear-gradient(90deg, ${theme.colors.pink}, ${theme.colors.magenta})`,
        info: `linear-gradient(90deg, ${theme.colors.blue}, ${theme.colors.primary})`,
      };
      return colors[$variant];
    }};
  }
  
  &::after {
    content: '';
    position: absolute;
    top: -50%;
    right: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(
      circle,
      ${({ $variant, theme }) => {
        const colors = {
          primary: theme.colors.primary,
          success: theme.colors.blue,
          warning: theme.colors.magenta,
          danger: theme.colors.pink,
          info: theme.colors.blue,
        };
        return colors[$variant];
      }}10 0%,
      transparent 70%
    );
    pointer-events: none;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: ${({ $hasActions }) => $hasActions ? '20px 20px 75px' : '16px'};
    gap: 14px;
    min-height: ${({ $hasActions }) => $hasActions ? '180px' : 'auto'};
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${({ $hasActions }) => $hasActions ? '20px 20px 70px' : '12px'};
    gap: 12px;
    min-height: ${({ $hasActions }) => $hasActions ? '160px' : 'auto'};
  }
`;

const CardHeader = styled.div<{ $hasActions?: boolean }>`
  display: flex;
  align-items: ${({ $hasActions }) => $hasActions ? 'flex-start' : 'center'};
  justify-content: ${({ $hasActions }) => $hasActions ? 'space-between' : 'flex-start'};
  gap: 16px;
  position: relative;
  z-index: 1;
  flex: 1;
  width: 100%;
`;

const CardContent = styled.div<{ $hasActions?: boolean }>`
  flex: 1;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    display: ${({ $hasActions }) => $hasActions ? 'block' : 'flex'};
    align-items: ${({ $hasActions }) => $hasActions ? 'stretch' : 'center'};
    justify-content: ${({ $hasActions }) => $hasActions ? 'flex-start' : 'space-between'};
  }
`;

const CardTitle = styled.h3<{ $layout?: 'default' | 'compact' }>`
  margin: 0;
  font-size: ${({ $layout }) => $layout === 'compact' ? '18px' : '13px'};
  font-weight: ${({ $layout }) => $layout === 'compact' ? '700' : '500'};
  color: ${({ theme, $layout }) => $layout === 'compact' ? theme.colors.text : theme.colors.textLight};
  font-family: ${({ theme }) => theme.fonts.heading};
  text-transform: ${({ $layout }) => $layout === 'compact' ? 'none' : 'uppercase'};
  letter-spacing: ${({ $layout }) => $layout === 'compact' ? '0' : '0.5px'};
  margin-bottom: ${({ $layout }) => $layout === 'compact' ? '8px' : '4px'};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    font-size: ${({ $layout }) => $layout === 'compact' ? '16px' : '12px'};
    letter-spacing: ${({ $layout }) => $layout === 'compact' ? '0' : '0.3px'};
    margin-bottom: ${({ $layout }) => $layout === 'compact' ? '6px' : '2px'};
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: ${({ $layout }) => $layout === 'compact' ? '16px' : '11px'};
    letter-spacing: 0;
    margin-bottom: ${({ $layout }) => $layout === 'compact' ? '6px' : '0'};
    order: 1;
  }
`;

const CardValue = styled.div<{ $layout?: 'default' | 'compact' }>`
  font-size: ${({ $layout }) => $layout === 'compact' ? '14px' : '24px'};
  font-weight: ${({ $layout }) => $layout === 'compact' ? '400' : '700'};
  color: ${({ theme, $layout }) => $layout === 'compact' ? theme.colors.textLight : theme.colors.text};
  line-height: ${({ $layout }) => $layout === 'compact' ? '1.4' : '1.2'};
  margin-bottom: 4px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    font-size: ${({ $layout }) => $layout === 'compact' ? '13px' : '18px'};
    margin-bottom: 0;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: ${({ $layout }) => $layout === 'compact' ? '13px' : '18px'};
    margin-bottom: 0;
    order: ${({ $layout }) => $layout === 'compact' ? '1' : '2'};
  }
`;

const CardSubtitle = styled.p`
  margin: 0;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textMuted};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    display: none;
  }
`;

const IconWrapper = styled.div<{ $variant: CardVariant }>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${({ $variant, theme }) => {
    const colors = {
      primary: `${theme.colors.primary}15`,
      success: `${theme.colors.blue}15`,
      warning: `${theme.colors.magenta}15`,
      danger: `${theme.colors.pink}15`,
      info: `${theme.colors.blue}15`,
    };
    return colors[$variant];
  }};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    width: 36px;
    height: 36px;
    border-radius: 8px;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 36px;
    height: 36px;
    border-radius: 8px;
  }
  
  svg {
    width: 24px;
    height: 24px;
    color: ${({ $variant, theme }) => {
      const colors = {
        primary: theme.colors.primary,
        success: theme.colors.blue,
        warning: theme.colors.magenta,
        danger: theme.colors.pink,
        info: theme.colors.blue,
      };
      return colors[$variant];
    }};
    
    @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
      width: 18px;
      height: 18px;
    }
    
    @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
      width: 18px;
      height: 18px;
    }
  }
`;

export const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant = 'primary',
  onClick,
  className,
  layout = 'default',
  hasActions = false
}) => {
  return (
    <CardContainer
      $variant={variant}
      $clickable={!!onClick}
      $hasActions={hasActions}
      $layout={layout}
      onClick={onClick}
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={onClick ? { y: -2, boxShadow: '0 8px 24px rgba(152, 93, 215, 0.1)' } : undefined}
    >
      <CardHeader $hasActions={hasActions}>
        <CardContent $hasActions={hasActions}>
          <CardTitle $layout={layout}>{title}</CardTitle>
          <CardValue $layout={layout}>{typeof value === 'number' ? value.toLocaleString() : value}</CardValue>
          {subtitle && <CardSubtitle>{subtitle}</CardSubtitle>}
        </CardContent>
        {!hasActions && icon && (
          <IconWrapper $variant={variant}>
            {icon}
          </IconWrapper>
        )}
      </CardHeader>
    </CardContainer>
  );
};