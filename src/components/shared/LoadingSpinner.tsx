// src/components/shared/LoadingSpinner.tsx
'use client';

import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const SpinnerWrapper = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const Spinner = styled.div<{ size?: 'small' | 'medium' | 'large' }>`
  width: ${({ size = 'medium' }) => 
    size === 'small' ? '16px' : 
    size === 'large' ? '32px' : 
    '24px'
  };
  height: ${({ size = 'medium' }) => 
    size === 'small' ? '16px' : 
    size === 'large' ? '32px' : 
    '24px'
  };
  border: 3px solid ${({ theme }) => theme.colors.border};
  border-top-color: ${({ theme }) => theme.colors.primary};
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
`;

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
}

export default function LoadingSpinner({ size = 'medium' }: LoadingSpinnerProps) {
  return (
    <SpinnerWrapper>
      <Spinner size={size} />
    </SpinnerWrapper>
  );
}