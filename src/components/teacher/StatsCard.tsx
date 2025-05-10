// src/components/teacher/StatsCard.tsx
'use client';

import styled from 'styled-components';
import { Card } from '@/styles/StyledComponents'; // Assuming Card is your base styled card

interface StatsCardProps {
  title: string;
  value: string | number;
  onClick?: () => void;
  icon?: React.ReactNode; // Optional icon
  variant?: 'default' | 'warning' | 'danger'; // For highlighting
}

const StyledStatsCard = styled(Card)<{ $clickable: boolean; $variant: StatsCardProps['variant'] }>`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.lg};
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: ${({ $clickable }) => ($clickable ? 'translateY(-3px)' : 'none')};
    box-shadow: ${({ $clickable, theme }) => ($clickable ? theme.shadows.md : theme.shadows.sm)};
  }

  .icon {
    font-size: 1.8rem;
    margin-bottom: ${({ theme }) => theme.spacing.sm};
    color: ${({ theme, $variant }) =>
      $variant === 'danger' ? theme.colors.red :
      $variant === 'warning' ? theme.colors.secondaryDark :
      theme.colors.primary};
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
    color: ${({ theme, $variant }) =>
      $variant === 'danger' ? theme.colors.red :
      $variant === 'warning' ? theme.colors.secondaryDark :
      theme.colors.primary};
    line-height: 1.2;
  }
`;

export default function StatsCard({ title, value, onClick, icon, variant = 'default' }: StatsCardProps) {
  return (
    <StyledStatsCard onClick={onClick} $clickable={!!onClick} $variant={variant}>
      {icon && <div className="icon">{icon}</div>}
      <h3>{title}</h3>
      <div className="value">{value}</div>
    </StyledStatsCard>
  );
}