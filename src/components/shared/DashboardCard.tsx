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

const CardContainer = styled(motion.div)<{ $variant: CardVariant; $clickable: boolean; $hasActions?: boolean }>`
  position: relative;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 24px;
  height: 200px;
  border: 1px solid rgba(152, 93, 215, 0.1);
  box-shadow: 
    0 10px 40px rgba(152, 93, 215, 0.05),
    inset 0 1px 2px rgba(255, 255, 255, 0.5);
  overflow: hidden;
  cursor: ${({ $clickable }) => $clickable ? 'pointer' : 'default'};
  display: flex;
  flex-direction: column;
  
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
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  position: relative;
  z-index: 1;
  flex: 1;
`;

const CardContent = styled.div`
  flex: 1;
`;

const CardTitle = styled.h3<{ $layout?: 'default' | 'compact' }>`
  margin: 0;
  font-size: ${({ $layout }) => $layout === 'compact' ? '18px' : '14px'};
  font-weight: ${({ $layout }) => $layout === 'compact' ? '600' : '500'};
  color: ${({ theme, $layout }) => $layout === 'compact' ? theme.colors.text : theme.colors.textLight};
  font-family: ${({ theme }) => theme.fonts.heading};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: ${({ $layout }) => $layout === 'compact' ? '8px' : '12px'};
`;

const CardValue = styled.div<{ $layout?: 'default' | 'compact' }>`
  font-size: ${({ $layout }) => $layout === 'compact' ? '1.1rem' : '2.2rem'};
  font-weight: ${({ $layout }) => $layout === 'compact' ? '500' : '600'};
  color: ${({ theme, $layout }) => $layout === 'compact' ? theme.colors.textLight : theme.colors.text};
  line-height: 1.2;
  margin-bottom: 4px;
  font-family: ${({ theme, $layout }) => $layout === 'compact' ? theme.fonts.mono : 'inherit'};
`;

const CardSubtitle = styled.p`
  margin: 0;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const IconWrapper = styled.div<{ $variant: CardVariant }>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
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
      onClick={onClick}
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={onClick ? { y: -4, boxShadow: '0 20px 60px rgba(152, 93, 215, 0.15)' } : undefined}
    >
      <CardHeader>
        <CardContent>
          <CardTitle $layout={layout}>{title}</CardTitle>
          <CardValue $layout={layout}>{typeof value === 'number' ? value.toLocaleString() : value}</CardValue>
          {subtitle && <CardSubtitle>{subtitle}</CardSubtitle>}
        </CardContent>
        {!hasActions && (
          <IconWrapper $variant={variant}>
            {icon}
          </IconWrapper>
        )}
      </CardHeader>
    </CardContainer>
  );
};