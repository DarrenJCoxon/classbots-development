'use client';

import React, { useState } from 'react';
import styled from 'styled-components';
import { PageWrapper, Container } from '@/components/ui';
import { FiMail, FiPhone, FiMapPin, FiArrowLeft, FiSend, FiUser, FiMessageSquare } from 'react-icons/fi';
import { ModernButton } from '@/components/shared/ModernButton';
import { useRouter } from 'next/navigation';

const ContactContainer = styled.div`
  max-width: 1000px;
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

const ContactGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  margin-top: 2rem;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
`;

const ContactInfo = styled.div`
  h2 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 1.5rem;
    color: ${({ theme }) => theme.colors.text};
  }
`;

const ContactCard = styled.div`
  background: rgba(255, 255, 255, 0.9);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid rgba(152, 93, 215, 0.1);
  margin-bottom: 1.5rem;
  transition: transform 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 40px rgba(152, 93, 215, 0.15);
  }
  
  h3 {
    font-size: 1.125rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: ${({ theme }) => theme.colors.text};
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  p {
    color: ${({ theme }) => theme.colors.textLight};
    margin: 0;
    line-height: 1.5;
  }
`;

const ContactForm = styled.div`
  h2 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 1.5rem;
    color: ${({ theme }) => theme.colors.text};
  }
`;

const FormCard = styled.div`
  background: rgba(255, 255, 255, 0.9);
  border-radius: 16px;
  padding: 2rem;
  border: 1px solid rgba(152, 93, 215, 0.1);
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
  
  label {
    display: block;
    font-weight: 500;
    margin-bottom: 0.5rem;
    color: ${({ theme }) => theme.colors.text};
  }
  
  input, textarea, select {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid rgba(152, 93, 215, 0.2);
    border-radius: 8px;
    font-size: 14px;
    transition: all 0.2s ease;
    
    &:focus {
      outline: none;
      border-color: ${({ theme }) => theme.colors.primary};
      box-shadow: 0 0 0 3px rgba(152, 93, 215, 0.1);
    }
    
    &::placeholder {
      color: ${({ theme }) => theme.colors.textLight};
    }
  }
  
  textarea {
    min-height: 120px;
    resize: vertical;
    font-family: inherit;
  }
`;

const SuccessMessage = styled.div`
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1rem;
  color: #15803d;
  text-align: center;
`;

export default function ContactPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    userType: 'student'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false);
      setShowSuccess(true);
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
        userType: 'student'
      });
      
      // Hide success message after 5 seconds
      setTimeout(() => setShowSuccess(false), 5000);
    }, 1000);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <PageWrapper gradient>
      <Container>
        <ContactContainer>
          <BackButton onClick={() => router.back()}>
            <FiArrowLeft /> Back
          </BackButton>
          
          <Title>Contact Support</Title>
          <p style={{ color: '#6b7280', fontSize: '1.125rem', marginBottom: '2rem' }}>
            Need help with Skolr? We're here to assist you with any questions or technical issues.
          </p>
          
          <ContactGrid>
            <ContactInfo>
              <h2>Get in Touch</h2>
              
              <ContactCard>
                <h3><FiMail />Support Email</h3>
                <p>
                  For technical issues or general inquiries:<br />
                  <strong>support@skolr.com</strong>
                </p>
              </ContactCard>
              
              <ContactCard>
                <h3><FiPhone />Phone Support</h3>
                <p>
                  Available Monday - Friday, 9 AM - 5 PM GMT:<br />
                  <strong>+44 (0) 20 7123 4567</strong>
                </p>
              </ContactCard>
              
              <ContactCard>
                <h3><FiMapPin />Office Address</h3>
                <p>
                  Skolr Education Technology<br />
                  123 Learning Street<br />
                  London, EC1A 1BB<br />
                  United Kingdom
                </p>
              </ContactCard>
              
              <ContactCard>
                <h3><FiUser />For Teachers</h3>
                <p>
                  If you're a teacher experiencing issues, please include your school name 
                  and student room codes in your message for faster assistance.
                </p>
              </ContactCard>
            </ContactInfo>
            
            <ContactForm>
              <h2>Send us a Message</h2>
              
              <FormCard>
                {showSuccess && (
                  <SuccessMessage>
                    ✓ Thank you! Your message has been sent successfully. We'll get back to you soon.
                  </SuccessMessage>
                )}
                
                <form onSubmit={handleSubmit}>
                  <FormGroup>
                    <label htmlFor="userType">I am a:</label>
                    <select
                      id="userType"
                      value={formData.userType}
                      onChange={(e) => handleChange('userType', e.target.value)}
                      required
                    >
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="parent">Parent</option>
                      <option value="administrator">Administrator</option>
                    </select>
                  </FormGroup>
                  
                  <FormGroup>
                    <label htmlFor="name">Full Name *</label>
                    <input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="Enter your full name"
                      required
                    />
                  </FormGroup>
                  
                  <FormGroup>
                    <label htmlFor="email">Email Address *</label>
                    <input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="Enter your email address"
                      required
                    />
                  </FormGroup>
                  
                  <FormGroup>
                    <label htmlFor="subject">Subject *</label>
                    <input
                      id="subject"
                      type="text"
                      value={formData.subject}
                      onChange={(e) => handleChange('subject', e.target.value)}
                      placeholder="Brief description of your issue"
                      required
                    />
                  </FormGroup>
                  
                  <FormGroup>
                    <label htmlFor="message">Message *</label>
                    <textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => handleChange('message', e.target.value)}
                      placeholder="Please describe your issue or question in detail..."
                      required
                    />
                  </FormGroup>
                  
                  <ModernButton
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting}
                    style={{ width: '100%' }}
                  >
                    {isSubmitting ? (
                      'Sending...'
                    ) : (
                      <>
                        <FiSend /> Send Message
                      </>
                    )}
                  </ModernButton>
                </form>
              </FormCard>
            </ContactForm>
          </ContactGrid>
        </ContactContainer>
      </Container>
    </PageWrapper>
  );
}