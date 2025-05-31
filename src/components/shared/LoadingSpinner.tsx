// src/components/shared/LoadingSpinner.tsx
// Updated: Modern loading spinner with animations
'use client';

import styled, { keyframes } from 'styled-components';

// Modern animated dots loader
const bounce = keyframes`
  0%, 80%, 100% { 
    transform: scale(0);
    opacity: 0;
  } 
  40% { 
    transform: scale(1);
    opacity: 1;
  }
`;

// Glow effect for dots
const glow = keyframes`
  0%, 100% { 
    box-shadow: 0 0 8px rgba(152, 93, 215, 0.4);
  }
  50% { 
    box-shadow: 0 0 16px rgba(152, 93, 215, 0.8);
  }
`;

const SpinnerWrapper = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
`;

const Dot = styled.div<{ $delay: number; $size: 'small' | 'medium' | 'large' }>`
  width: ${({ $size }) => 
    $size === 'small' ? '8px' : 
    $size === 'large' ? '16px' : 
    '12px'
  };
  height: ${({ $size }) => 
    $size === 'small' ? '8px' : 
    $size === 'large' ? '16px' : 
    '12px'
  };
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.magenta}
  );
  border-radius: 50%;
  animation: 
    ${bounce} 1.4s ease-in-out ${({ $delay }) => $delay}s infinite both,
    ${glow} 2s ease-in-out infinite;
  will-change: transform, opacity;
`;

// Alternative spinner for inline use (when dots don't fit well)
const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const InlineSpinner = styled.div<{ $size: 'small' | 'medium' | 'large' }>`
  width: ${({ $size }) => 
    $size === 'small' ? '16px' : 
    $size === 'large' ? '32px' : 
    '24px'
  };
  height: ${({ $size }) => 
    $size === 'small' ? '16px' : 
    $size === 'large' ? '32px' : 
    '24px'
  };
  border: 2px solid rgba(152, 93, 215, 0.2);
  border-top-color: ${({ theme }) => theme.colors.primary};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
  background: linear-gradient(
    to right,
    transparent 50%,
    rgba(152, 93, 215, 0.1) 50%
  );
`;

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'dots' | 'spinner';
}

export default function LoadingSpinner({ 
  size = 'medium', 
  variant = 'dots' 
}: LoadingSpinnerProps) {
  if (variant === 'spinner' || size === 'small') {
    // Use inline spinner for small sizes or when specifically requested
    return (
      <SpinnerWrapper style={{ gap: 0 }}>
        <InlineSpinner $size={size} />
      </SpinnerWrapper>
    );
  }
  
  // Use modern dots animation for medium/large sizes
  return (
    <SpinnerWrapper>
      <Dot $delay={0} $size={size} />
      <Dot $delay={0.16} $size={size} />
      <Dot $delay={0.32} $size={size} />
    </SpinnerWrapper>
  );
}