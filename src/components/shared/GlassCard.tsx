// Glassmorphism card component with animations
import styled, { css } from 'styled-components';
import { motion } from 'framer-motion';
import { supportsBackdropFilter } from '@/utils/glassmorphism';

type GlassVariant = 'light' | 'medium' | 'dark' | 'colored-purple' | 'colored-cyan';

interface GlassCardProps {
  variant?: GlassVariant;
  padding?: string;
  hoverable?: boolean;
}

const getGlassStyles = (variant: GlassVariant) => {
  const hasBackdropSupport = supportsBackdropFilter();
  
  const variantMap: Record<GlassVariant, any> = {
    light: css`
      background: ${({ theme }) => theme.glassmorphism.light.background};
      ${hasBackdropSupport && css`
        backdrop-filter: ${({ theme }) => theme.glassmorphism.light.backdropFilter};
        -webkit-backdrop-filter: ${({ theme }) => theme.glassmorphism.light.backdropFilter};
      `}
      border: ${({ theme }) => theme.glassmorphism.light.border};
      box-shadow: ${({ theme }) => theme.glassmorphism.light.boxShadow};
    `,
    medium: css`
      background: ${({ theme }) => theme.glassmorphism.medium.background};
      ${hasBackdropSupport && css`
        backdrop-filter: ${({ theme }) => theme.glassmorphism.medium.backdropFilter};
        -webkit-backdrop-filter: ${({ theme }) => theme.glassmorphism.medium.backdropFilter};
      `}
      border: ${({ theme }) => theme.glassmorphism.medium.border};
      box-shadow: ${({ theme }) => theme.glassmorphism.medium.boxShadow};
    `,
    dark: css`
      background: ${({ theme }) => theme.glassmorphism.dark.background};
      ${hasBackdropSupport && css`
        backdrop-filter: ${({ theme }) => theme.glassmorphism.dark.backdropFilter};
        -webkit-backdrop-filter: ${({ theme }) => theme.glassmorphism.dark.backdropFilter};
      `}
      border: ${({ theme }) => theme.glassmorphism.dark.border};
      box-shadow: ${({ theme }) => theme.glassmorphism.dark.boxShadow};
    `,
    'colored-purple': css`
      background: ${({ theme }) => theme.glassmorphism.colored.purple.background};
      ${hasBackdropSupport && css`
        backdrop-filter: ${({ theme }) => theme.glassmorphism.colored.purple.backdropFilter};
        -webkit-backdrop-filter: ${({ theme }) => theme.glassmorphism.colored.purple.backdropFilter};
      `}
      border: ${({ theme }) => theme.glassmorphism.colored.purple.border};
      box-shadow: ${({ theme }) => theme.glassmorphism.colored.purple.boxShadow};
    `,
    'colored-cyan': css`
      background: ${({ theme }) => theme.glassmorphism.colored.cyan.background};
      ${hasBackdropSupport && css`
        backdrop-filter: ${({ theme }) => theme.glassmorphism.colored.cyan.backdropFilter};
        -webkit-backdrop-filter: ${({ theme }) => theme.glassmorphism.colored.cyan.backdropFilter};
      `}
      border: ${({ theme }) => theme.glassmorphism.colored.cyan.border};
      box-shadow: ${({ theme }) => theme.glassmorphism.colored.cyan.boxShadow};
    `,
  };
  
  return variantMap[variant] || variantMap.light;
};

export const GlassCard = styled(motion.div)<GlassCardProps>`
  ${({ variant = 'light' }) => getGlassStyles(variant)}
  
  border-radius: ${({ theme }) => theme.borderRadius.large};
  padding: ${({ padding, theme }) => padding || theme.spacing.lg};
  transition: all ${({ theme }) => theme.transitions.normal};
  
  ${({ hoverable }) => hoverable && css`
    cursor: pointer;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
    }
  `}
`;

// Animation variants for Framer Motion
export const glassCardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 200
    }
  },
  hover: {
    y: -4,
    transition: {
      type: "spring",
      damping: 15,
      stiffness: 300
    }
  }
};