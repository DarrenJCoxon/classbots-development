// src/app/teacher-dashboard/concerns/page.tsx
'use client';

import styled, { useTheme } from 'styled-components'; // Import useTheme
import ConcernsList from '@/components/teacher/ConcernsList';
import { Container } from '@/styles/StyledComponents';

const PageHeader = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const Title = styled.h1`
  color: ${({ theme }) => theme.colors.text};
  font-size: 1.8rem; 
`;

export default function ConcernsPage() {
  const theme = useTheme(); // Get the theme object

  return (
    <Container>
      <PageHeader>
        <Title>Student Welfare Concerns</Title>
      </PageHeader>
      {/* Pass the desired accent color to ConcernsList */}
      <ConcernsList accentColor={theme.colors.green} /> 
    </Container>
  );
}