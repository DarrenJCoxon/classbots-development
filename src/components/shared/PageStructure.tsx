// Shared page structure components for consistent layout
import styled from 'styled-components';
import { motion } from 'framer-motion';

export const PageWrapper = styled(motion.div)`
  width: 100%;
  padding: 0 0 40px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: 0 0 32px;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 0 0 24px;
  }
`;

export const PageHeader = styled.div`
  margin-bottom: 32px;
`;

export const PageTitle = styled.h1`
  font-size: 32px;
  font-weight: 700;
  font-family: ${({ theme }) => theme.fonts.heading};
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 28px;
  }
`;

export const PageActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  align-items: center;
  flex-wrap: wrap;
`;

export const PageContent = styled.div`
  width: 100%;
`;

// Grid layout for cards
export const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;

// Section component for grouping content
export const Section = styled.section`
  margin-bottom: 40px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;