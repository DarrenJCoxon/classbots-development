// Animated loading components
import React from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';

// Pulse loader
const pulse = keyframes`
  0% {
    transform: scale(0);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
`;

const PulseContainer = styled.div`
  display: inline-block;
  position: relative;
  width: 80px;
  height: 80px;
`;

const PulseDot = styled.div<{ $delay: number }>`
  position: absolute;
  border: 4px solid ${({ theme }) => theme.colors.primary};
  opacity: 1;
  border-radius: 50%;
  animation: ${pulse} 1.5s cubic-bezier(0, 0.2, 0.8, 1) infinite;
  animation-delay: ${({ $delay }) => $delay}s;
  
  &:nth-child(1) {
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 0;
    height: 0;
  }
  
  &:nth-child(2) {
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 40px;
    height: 40px;
    margin: -20px 0 0 -20px;
  }
`;

export const PulseLoader: React.FC = () => (
  <PulseContainer>
    <PulseDot $delay={0} />
    <PulseDot $delay={0.5} />
  </PulseContainer>
);

// Dot loader
const dotBounce = keyframes`
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
`;

const DotContainer = styled.div`
  display: inline-flex;
  gap: 8px;
`;

const Dot = styled.div<{ $delay: number }>`
  width: 12px;
  height: 12px;
  background-color: ${({ theme }) => theme.colors.primary};
  border-radius: 50%;
  animation: ${dotBounce} 1.4s infinite ease-in-out both;
  animation-delay: ${({ $delay }) => $delay}s;
`;

export const DotLoader: React.FC = () => (
  <DotContainer>
    <Dot $delay={-0.32} />
    <Dot $delay={-0.16} />
    <Dot $delay={0} />
  </DotContainer>
);

// Skeleton loader for content
const shimmer = keyframes`
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
`;

export const SkeletonLoader = styled.div<{ 
  width?: string; 
  height?: string;
  borderRadius?: string;
}>`
  display: inline-block;
  width: ${({ width = '100%' }) => width};
  height: ${({ height = '20px' }) => height};
  background-color: ${({ theme }) => theme.colors.backgroundCard};
  background-image: linear-gradient(
    90deg,
    ${({ theme }) => theme.colors.backgroundCard} 0px,
    ${({ theme }) => theme.colors.backgroundDark} 20px,
    ${({ theme }) => theme.colors.backgroundCard} 40px
  );
  background-size: 200px 100%;
  background-repeat: no-repeat;
  border-radius: ${({ borderRadius = '4px' }) => borderRadius};
  animation: ${shimmer} 1.5s infinite;
`;

// Loading overlay with glassmorphism
const LoadingOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  z-index: 9999;
`;

const LoadingContent = styled(motion.div)`
  text-align: center;
  
  p {
    margin-top: 16px;
    color: ${({ theme }) => theme.colors.text};
    font-weight: 500;
  }
`;

interface FullPageLoaderProps {
  message?: string;
  variant?: 'pulse' | 'dots';
}

export const FullPageLoader: React.FC<FullPageLoaderProps> = ({ 
  message = 'Loading...', 
  variant = 'pulse' 
}) => {
  return (
    <LoadingOverlay
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <LoadingContent
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        {variant === 'pulse' ? <PulseLoader /> : <DotLoader />}
        <p>{message}</p>
      </LoadingContent>
    </LoadingOverlay>
  );
};

// Inline spinner
const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

export const Spinner = styled.div<{ size?: number; color?: string }>`
  width: ${({ size = 20 }) => size}px;
  height: ${({ size = 20 }) => size}px;
  border: 2px solid ${({ theme, color }) => color || theme.colors.border};
  border-top-color: ${({ theme, color }) => color || theme.colors.primary};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;