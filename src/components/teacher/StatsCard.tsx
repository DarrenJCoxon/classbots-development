// src/components/teacher/StatsCard.tsx
'use client';

import styled, { DefaultTheme } from 'styled-components'; // Ensure DefaultTheme is imported
import { Card } from '@/styles/StyledComponents';

// Make sure this interface matches what DashboardOverview expects and provides
export interface StatsCardProps { 
  title: string;
  value: string | number;
  onClick?: () => void;
  icon?: React.ReactNode;
  variant?: 'default' | 'warning' | 'danger' | 'magenta' | 'cyan' | 'green' | 'orange_secondary'; 
}

// Helper function to get the actual color from the variant
const getVariantColor = (theme: DefaultTheme, variant: StatsCardProps['variant']): string => {
  switch (variant) {
    case 'danger': 
      return theme.colors.red;      // skolrCoral (#FE4372)
    case 'warning': 
      return theme.colors.secondary;// skolrOrange (#FFB612) 
    case 'magenta': 
      return theme.colors.magenta;  // skolrMagenta (#C848AF)
    case 'cyan': 
      return theme.colors.blue;     // skolrCyan (#4CBEF3) - as theme.colors.blue is mapped to this
    case 'green': 
      return theme.colors.green;    // skolrGreen (#7BBC44)
    case 'orange_secondary': // This explicitly uses the secondary color (skolrOrange)
      return theme.colors.secondary; 
    case 'default': // Explicitly handle default
    default: // Fallback
      return theme.colors.primary;  // skolrPurple (#985DD7)
  }
};

// Make sure the $variant prop passed from the component is correctly typed here
const StyledStatsCard = styled(Card)<{ $clickable: boolean; $variant: StatsCardProps['variant'] }>`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.lg};
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  
  /* Ensure this line is using the $variant prop passed to StyledStatsCard */
  border-top: 5px solid ${({ theme, $variant }) => getVariantColor(theme, $variant)};

  &:hover {
    transform: ${({ $clickable }) => ($clickable ? 'translateY(-3px)' : 'none')};
    box-shadow: ${({ $clickable, theme }) => ($clickable ? theme.shadows.md : theme.shadows.sm)};
  }

  .icon {
    font-size: 1.8rem;
    margin-bottom: ${({ theme }) => theme.spacing.sm};
    color: ${({ theme, $variant }) => getVariantColor(theme, $variant)};
  }
  
  h3 { // Title
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.875rem;
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

export default function StatsCard({ title, value, onClick, icon, variant = 'default' }: StatsCardProps) {
  // The 'variant' prop received here is passed as '$variant' to StyledStatsCard
  return (
    <StyledStatsCard onClick={onClick} $clickable={!!onClick} $variant={variant}>
      {icon && <div className="icon">{icon}</div>}
      <h3>{title}</h3>
      <div className="value">{value}</div>
    </StyledStatsCard>
  );
}