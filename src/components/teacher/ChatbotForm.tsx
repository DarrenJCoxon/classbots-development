// src/components/teacher/ChatbotForm.tsx
'use client';

import { useState } from 'react';
import styled from 'styled-components';
// import { useRouter } from 'next/navigation'; // << REMOVED UNUSED IMPORT
import { 
    Card, 
    Button, 
    FormGroup, 
    Label, 
    Input, 
    TextArea, 
    Alert, 
    Select as StyledSelect
} from '@/styles/StyledComponents';

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: ${({ theme }) => theme.spacing.md};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 0;
    align-items: flex-start;
    overflow-y: auto;
  }
`;

const FormCard = styled(Card)`
  width: 100%;
  max-width: 600px;
  margin: 20px;
  position: relative;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    margin: 0;
    max-height: 100%;
    min-height: 100vh;
    border-radius: 0;
    overflow-y: auto;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    position: sticky;
    top: 0;
    background: ${({ theme }) => theme.colors.backgroundCard};
    padding: ${({ theme }) => theme.spacing.sm} 0;
    z-index: 5;
  }
`;

const Title = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.textLight};
  cursor: pointer;
  font-size: 1.5rem;
  
  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.xl};
  padding-top: ${({ theme }) => theme.spacing.lg};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-direction: column-reverse;
  }
`;

const ActionButton = styled(Button)`
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 100%;
    min-height: 48px;
  }
`;

interface ChatbotFormProps {
  onClose: () => void;
  onSuccess: (chatbotId: string) => void;
}

export default function ChatbotForm({ onClose, onSuccess }: ChatbotFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    system_prompt: '',
    model: 'x-ai/grok-3-mini-beta',
    max_tokens: 1000,
    temperature: 0.7,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // const router = useRouter(); // << REMOVED UNUSED VARIABLE

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/teacher/chatbots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const responseData = await response.json(); 

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to create chatbot');
      }
      
      console.log('Chatbot created successfully via form:', responseData);
      onSuccess(responseData.chatbot_id);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create chatbot');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'max_tokens' || name === 'temperature' ? Number(value) : value,
    }));
  };

  return (
    <Overlay>
      <FormCard>
        <Header>
          <Title>Create Chatbot</Title>
          <CloseButton onClick={onClose}>×</CloseButton>
        </Header>

        {error && <Alert variant="error">{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="name">Chatbot Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter chatbot name"
              required
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter chatbot description"
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="system_prompt">System Prompt</Label>
            <TextArea
              id="system_prompt"
              name="system_prompt"
              value={formData.system_prompt}
              onChange={handleChange}
              placeholder="e.g., 'You are a helpful history tutor for Grade 10 students...'"
              required
              rows={4}
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="model">AI Model</Label>
            <StyledSelect 
                id="model"
                name="model"
                value={formData.model}
                onChange={handleChange}
            >
                <option value="x-ai/grok-3-mini-beta">Grok 3 Mini Beta (Paid)</option>
                <option value="qwen/qwen3-235b-a22b">Qwen3 235B A22B (Free)</option>
                <option value="google/gemini-2.5-flash-preview">Gemini 2.5 Flash Preview</option>
            </StyledSelect>
          </FormGroup>

          <Footer>
            <ActionButton type="button" variant="outline" onClick={onClose}>
              Cancel
            </ActionButton>
            <ActionButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create & Configure'}
            </ActionButton>
          </Footer>
        </form>
      </FormCard>
    </Overlay>
  );
}