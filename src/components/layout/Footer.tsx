// src/components/layout/Footer.tsx
'use client';

import styled from 'styled-components';
import { Container } from '@/styles/StyledComponents';
import { APP_NAME } from '@/lib/utils/constants';

const FooterWrapper = styled.footer`
  background: ${({ theme }) => theme.colors.backgroundCard};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.spacing.xl} 0;
  margin-top: auto;
`;

const FooterContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.lg};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-direction: column;
    text-align: center;
  }
`;

const Copyright = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.875rem;
`;

const Links = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.lg};
  
  a {
    color: ${({ theme }) => theme.colors.textMuted};
    text-decoration: none;
    font-size: 0.875rem;
    transition: color ${({ theme }) => theme.transitions.fast};
    
    &:hover {
      color: ${({ theme }) => theme.colors.primary};
    }
  }
`;

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <FooterWrapper>
      <Container>
        <FooterContent>
          <Copyright>
            © {currentYear} {APP_NAME}. All rights reserved.
          </Copyright>
          <Links>
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
            <a href="/help">Help Center</a>
          </Links>
        </FooterContent>
      </Container>
    </FooterWrapper>
  );
}