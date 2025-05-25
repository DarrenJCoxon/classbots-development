// Animated gradient background component
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';

const gradientAnimation = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

interface AnimatedBackgroundProps {
  variant?: 'purple' | 'warm' | 'cool' | 'default';
  intensity?: 'subtle' | 'medium' | 'vibrant';
}

type GradientVariant = 'purple' | 'warm' | 'cool' | 'default';
type IntensityLevel = 'subtle' | 'medium' | 'vibrant';

const getGradient = (variant: GradientVariant) => {
  const gradients: Record<GradientVariant, any> = {
    purple: ({ theme }: any) => theme.gradients.animatedPurple,
    warm: ({ theme }: any) => theme.gradients.animatedWarm,
    cool: ({ theme }: any) => theme.gradients.animatedCool,
    default: ({ theme }: any) => `linear-gradient(
      45deg,
      ${theme.colors.background},
      ${theme.colors.backgroundDark},
      ${theme.colors.backgroundCard}
    )`,
  };
  
  return gradients[variant] || gradients.default;
};

const getOpacity = (intensity: IntensityLevel) => {
  const opacities: Record<IntensityLevel, number> = {
    subtle: 0.05,
    medium: 0.1,
    vibrant: 0.2,
  };
  
  return opacities[intensity] || opacities.subtle;
};

export const AnimatedBackground = styled(motion.div)<AnimatedBackgroundProps>`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  opacity: ${({ intensity = 'subtle' }) => getOpacity(intensity)};
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: ${({ variant = 'purple' }) => getGradient(variant)};
    background-size: 400% 400%;
    animation: ${gradientAnimation} 15s ease infinite;
  }
  
  /* Mesh gradient overlay for depth */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(
      ellipse at top left,
      rgba(152, 93, 215, 0.1) 0%,
      transparent 50%
    ),
    radial-gradient(
      ellipse at bottom right,
      rgba(76, 190, 243, 0.1) 0%,
      transparent 50%
    );
  }
`;

// Floating shapes for additional visual interest
const float = keyframes`
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(180deg); }
`;

export const FloatingShape = styled(motion.div)<{ 
  size?: number; 
  color?: string;
  delay?: number;
}>`
  position: absolute;
  width: ${({ size = 100 }) => `${size}px`};
  height: ${({ size = 100 }) => `${size}px`};
  background: ${({ color = 'rgba(152, 93, 215, 0.1)' }) => color};
  border-radius: 50%;
  filter: blur(40px);
  animation: ${float} ${({ delay = 0 }) => 10 + delay}s ease-in-out infinite;
  animation-delay: ${({ delay = 0 }) => delay}s;
`;

// Container with animated background
export const BackgroundContainer = styled.div`
  position: relative;
  min-height: 100vh;
  overflow: hidden;
`;

// Background pattern overlay
export const PatternOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23985DD7' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
`;