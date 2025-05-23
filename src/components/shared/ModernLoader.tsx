'use client';

import styled, { keyframes } from 'styled-components';

const bounce = keyframes`
  0%, 80%, 100% { 
    transform: scale(0);
  } 
  40% { 
    transform: scale(1);
  }
`;

const LoaderContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 5px;
`;

const Dot = styled.div<{ $delay: number }>`
  width: 12px;
  height: 12px;
  background: ${({ theme }) => theme.colors.primary};
  border-radius: 50%;
  animation: ${bounce} 1.4s ease-in-out ${({ $delay }) => $delay}s infinite both;
`;

export default function ModernLoader() {
  return (
    <LoaderContainer>
      <Dot $delay={0} />
      <Dot $delay={0.16} />
      <Dot $delay={0.32} />
    </LoaderContainer>
  );
}