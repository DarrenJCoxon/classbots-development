'use client';

import React from 'react';
import styled from 'styled-components';
import { PageWrapper, Container } from '@/components/ui';
import { FiShield, FiEye, FiLock, FiArrowLeft, FiAlertTriangle } from 'react-icons/fi';
import { useRouter } from 'next/navigation';

const SafetyContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 0;
`;

const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(152, 93, 215, 0.2);
  border-radius: 10px;
  color: ${({ theme }) => theme.colors.textLight};
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 2rem;
  
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    border-color: rgba(152, 93, 215, 0.3);
    transform: translateX(-2px);
  }
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.magenta}
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Section = styled.section`
  margin-bottom: 3rem;
  
  h2 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 1rem;
    color: ${({ theme }) => theme.colors.text};
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  p {
    color: ${({ theme }) => theme.colors.textLight};
    line-height: 1.6;
    margin-bottom: 1rem;
  }
  
  ul {
    list-style: none;
    padding: 0;
    
    li {
      padding: 0.5rem 0;
      color: ${({ theme }) => theme.colors.textLight};
      
      &:before {
        content: "•";
        color: ${({ theme }) => theme.colors.primary};
        font-weight: bold;
        display: inline-block;
        width: 1em;
        margin-left: 1em;
      }
    }
  }
`;

const WarningBox = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  padding: 1.5rem;
  margin: 2rem 0;
  
  h3 {
    color: #dc2626;
    font-weight: 600;
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  p {
    color: #7f1d1d;
    margin-bottom: 0;
  }
`;

const SafetyCard = styled.div`
  background: rgba(255, 255, 255, 0.9);
  border-radius: 16px;
  padding: 2rem;
  border: 1px solid rgba(152, 93, 215, 0.1);
  margin-top: 2rem;
  
  h3 {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 1rem;
    color: ${({ theme }) => theme.colors.text};
  }
`;

export default function SafetyPage() {
  const router = useRouter();

  return (
    <PageWrapper gradient>
      <Container>
        <SafetyContainer>
          <BackButton onClick={() => router.back()}>
            <FiArrowLeft /> Back
          </BackButton>
          
          <Title>Safety & Privacy</Title>
          
          <Section>
            <h2><FiShield />Student Safety</h2>
            <p>
              At Skolr, student safety is our top priority. We have implemented multiple layers 
              of protection to ensure a safe learning environment for all students.
            </p>
            <ul>
              <li>All AI conversations are monitored for inappropriate content</li>
              <li>Automatic content filtering prevents harmful or unsuitable material</li>
              <li>Teachers can review all student interactions</li>
              <li>Students can report concerns directly to their teachers</li>
              <li>No personal information is shared between students</li>
            </ul>
          </Section>

          <Section>
            <h2><FiEye />Content Monitoring</h2>
            <p>
              Our advanced AI moderation system automatically reviews all messages to ensure 
              they are appropriate for educational settings.
            </p>
            <ul>
              <li>Real-time content scanning for inappropriate language</li>
              <li>Automatic blocking of harmful or offensive content</li>
              <li>Teacher alerts for flagged conversations</li>
              <li>Continuous improvement of safety algorithms</li>
            </ul>
          </Section>

          <Section>
            <h2><FiLock />Privacy Protection</h2>
            <p>
              We are committed to protecting student privacy and comply with educational 
              privacy regulations.
            </p>
            <ul>
              <li>Student data is encrypted and securely stored</li>
              <li>No personal information is used for advertising</li>
              <li>Data is only accessible to authorized teachers and administrators</li>
              <li>Students use anonymous usernames in conversations</li>
              <li>Regular security audits and updates</li>
            </ul>
          </Section>

          <WarningBox>
            <h3><FiAlertTriangle />Important Safety Guidelines</h3>
            <p>
              <strong>Never share personal information</strong> like your full name, address, phone number, 
              or any other private details in conversations with AI tutors. If you encounter any 
              inappropriate content or feel unsafe, immediately report it to your teacher.
            </p>
          </WarningBox>

          <SafetyCard>
            <h3>Reporting Concerns</h3>
            <p>
              If you experience any safety concerns or inappropriate content while using Skolr:
            </p>
            <ul>
              <li>Immediately notify your teacher or school administrator</li>
              <li>Use the report function within the platform</li>
              <li>Contact technical support if needed</li>
            </ul>
            <p>
              <strong>Remember:</strong> Your safety is paramount. Don't hesitate to report anything 
              that makes you feel uncomfortable or unsafe.
            </p>
          </SafetyCard>
        </SafetyContainer>
      </Container>
    </PageWrapper>
  );
}