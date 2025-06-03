'use client';

import React from 'react';
import styled from 'styled-components';
import { PageWrapper, Container } from '@/components/ui';
import { FiBookOpen, FiMessageCircle, FiMail, FiArrowLeft } from 'react-icons/fi';
import { ModernButton } from '@/components/shared/ModernButton';
import { useRouter } from 'next/navigation';

const HelpContainer = styled.div`
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

const ContactCard = styled.div`
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

export default function HelpPage() {
  const router = useRouter();

  return (
    <PageWrapper gradient>
      <Container>
        <HelpContainer>
          <BackButton onClick={() => router.back()}>
            <FiArrowLeft /> Back
          </BackButton>
          
          <Title>Help & Support</Title>
          
          <Section>
            <h2><FiBookOpen style={{ marginRight: '0.5rem' }} />Getting Started</h2>
            <p>
              Welcome to Skolr! Our platform helps students learn through interactive AI chatbots 
              and engaging course content.
            </p>
            <ul>
              <li>Students can join rooms using room codes provided by teachers</li>
              <li>Chat with AI tutors (Skolrs) to get help with your studies</li>
              <li>Watch video lessons and track your learning progress</li>
              <li>Complete assessments to test your understanding</li>
            </ul>
          </Section>

          <Section>
            <h2><FiMessageCircle style={{ marginRight: '0.5rem' }} />How to Use Skolr</h2>
            <p><strong>For Students:</strong></p>
            <ul>
              <li>Get your room code from your teacher</li>
              <li>Enter the code to join your class room</li>
              <li>Start chatting with your AI tutor for help</li>
              <li>Watch assigned video lessons</li>
              <li>Complete practice assessments</li>
            </ul>
            
            <p><strong>For Teachers:</strong></p>
            <ul>
              <li>Create rooms for your classes</li>
              <li>Set up AI tutors (Skolrs) with subject-specific knowledge</li>
              <li>Add students to your rooms</li>
              <li>Upload course materials and create lessons</li>
              <li>Monitor student progress and engagement</li>
            </ul>
          </Section>

          <Section>
            <h2>Frequently Asked Questions</h2>
            <p><strong>Q: I forgot my room code. What should I do?</strong></p>
            <p>A: Contact your teacher to get the room code again.</p>
            
            <p><strong>Q: The AI tutor isn't responding correctly. What should I do?</strong></p>
            <p>A: Try rephrasing your question or contact your teacher for assistance.</p>
            
            <p><strong>Q: How do I reset my PIN code?</strong></p>
            <p>A: Your teacher can reset your PIN code for you.</p>
          </Section>

          <ContactCard>
            <h3><FiMail style={{ marginRight: '0.5rem' }} />Need More Help?</h3>
            <p>
              If you're experiencing technical issues or need additional support, 
              please contact your teacher or school administrator.
            </p>
            <ModernButton
              variant="primary"
              onClick={() => router.push('/contact')}
            >
              Contact Support
            </ModernButton>
          </ContactCard>
        </HelpContainer>
      </Container>
    </PageWrapper>
  );
}