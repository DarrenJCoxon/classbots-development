// src/components/teacher/StatsCard.tsx
'use client';

import styled, { DefaultTheme } from 'styled-components'; // Ensure DefaultTheme is imported
import { GlassCard, glassCardVariants } from '@/components/shared/GlassCard';

// Make sure this interface matches what DashboardOverview expects and provides
export interface StatsCardProps { 
  title: string;
  value: string | number;
  onClick?: () => void;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent' | 'info' | 'warning' | 'danger'; 
}

// Helper function to get the actual color from the variant
const getVariantColor = (theme: DefaultTheme, variant: StatsCardProps['variant']): string => {
  switch (variant) {
    case 'primary': 
      return theme.colors.primary;    // Purple (#985DD7)
    case 'secondary': 
      return theme.colors.magenta;    // Magenta (#C848AF)
    case 'accent': 
      return theme.colors.blue;       // Cyan (#4CBEF3)
    case 'info': 
      return theme.colors.blue;       // Cyan (#4CBEF3)
    case 'warning': 
      return theme.colors.magenta;    // Magenta (#C848AF) 
    case 'danger': 
      return theme.colors.pink;       // Coral Pink (#FE4372)
    default:
      return theme.colors.primary;    // Purple (#985DD7)
  }
};

// Make sure the $variant prop passed from the component is correctly typed here
const StyledStatsCard = styled(GlassCard)<{ $clickable: boolean; $variant: StatsCardProps['variant'] }>`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.lg};
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  transition: all ${({ theme }) => theme.transitions.normal};
  position: relative;
  overflow: hidden;
  
  /* Gradient border effect */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 5px;
    background: ${({ theme, $variant }) => getVariantColor(theme, $variant)};
    transition: height ${({ theme }) => theme.transitions.normal};
  }
  
  &:hover::before {
    height: ${({ $clickable }) => ($clickable ? '8px' : '5px')};
  }

  .icon {
    font-size: 1.8rem;
    margin-bottom: ${({ theme }) => theme.spacing.sm};
    color: ${({ theme, $variant }) => getVariantColor(theme, $variant)};
  }
  
  h3 { // Title
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.875rem;
    font-family: ${({ theme }) => theme.fonts.heading};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: ${({ theme }) => theme.spacing.xs};
    font-weight: 500;
  }

  .value {
    font-size: 2.2rem;
    font-weight: 600;
    color: ${({ theme, $variant }) => getVariantColor(theme, $variant)};
    line-height: 1.2;
  }
`;

export default function StatsCard({ title, value, onClick, icon, variant = 'primary' }: StatsCardProps) {
  // The 'variant' prop received here is passed as '$variant' to StyledStatsCard
  return (
    <StyledStatsCard 
      onClick={onClick} 
      $clickable={!!onClick} 
      $variant={variant}
      variant="light"
      hoverable={!!onClick}
      initial="hidden"
      animate="visible"
      whileHover={onClick ? "hover" : undefined}
      variants={glassCardVariants}
    >
      {icon && <div className="icon">{icon}</div>}
      <h3>{title}</h3>
      <div className="value">{value}</div>
    </StyledStatsCard>
  );
}