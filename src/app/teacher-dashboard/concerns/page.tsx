// src/app/teacher-dashboard/concerns/page.tsx
'use client';

import styled from 'styled-components';
import { motion } from 'framer-motion';
import ConcernsList from '@/components/teacher/ConcernsList';

const PageWrapper = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
  position: relative;
  
  /* Subtle animated background */
  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 50%, rgba(254, 67, 114, 0.03) 0%, transparent 50%),
      radial-gradient(circle at 80% 80%, rgba(200, 72, 175, 0.03) 0%, transparent 50%),
      radial-gradient(circle at 40% 20%, rgba(152, 93, 215, 0.03) 0%, transparent 50%);
    pointer-events: none;
    z-index: 0;
  }
`;

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 24px;
  position: relative;
  z-index: 1;
`;

const Header = styled.div`
  margin-bottom: 40px;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 36px;
  font-weight: 800;
  font-family: ${({ theme }) => theme.fonts.heading};
  text-transform: uppercase;
  letter-spacing: 1px;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.pink}, 
    ${({ theme }) => theme.colors.magenta}
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Subtitle = styled.p`
  margin: 8px 0 0 0;
  font-size: 16px;
  color: ${({ theme }) => theme.colors.textLight};
`;

export default function ConcernsPage() {
  return (
    <PageWrapper>
      <Container>
        <Header>
          <Title>Student Welfare Concerns</Title>
          <Subtitle>Monitor and respond to safety alerts from your classrooms</Subtitle>
        </Header>
        <ConcernsList /> 
      </Container>
    </PageWrapper>
  );
}