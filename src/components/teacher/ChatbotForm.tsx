// src/components/teacher/ChatbotForm.tsx
'use client';

import { useState } from 'react';
import styled from 'styled-components';
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

// Define BotTypeEnum locally for form state
type BotType = 'learning' | 'assessment';

// ... (Overlay, FormCard, Header, Title, CloseButton, FormContent, Footer, ActionButton styled components remain the same)
const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: ${({ theme }) => theme.spacing.md};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 0;
    align-items: flex-start;
  }
`;

const FormCard = styled(Card)`
  width: 100%;
  max-width: 650px;
  margin: 20px;
  position: relative;
  display: flex;
  flex-direction: column;
  max-height: 90vh;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    margin: 0;
    width: 100%;
    min-height: 100vh;
    max-height: 100vh;
    border-radius: 0;
    box-shadow: none;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.lg};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  flex-shrink: 0;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${({ theme }) => theme.spacing.md};
  }
`;

const Title = styled.h2`
  margin: 0;
  font-size: 1.4rem;
  color: ${({ theme }) => theme.colors.text};
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.textLight};
  cursor: pointer;
  font-size: 1.75rem;
  padding: 0;
  line-height: 1;

  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
`;

const FormContent = styled.div`
  padding: ${({ theme }) => theme.spacing.lg};
  overflow-y: auto;
  flex-grow: 1;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: ${({ theme }) => theme.colors.borderDark};
    border-radius: 3px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }


  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${({ theme }) => theme.spacing.md};
  }
`;


const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.lg};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  flex-shrink: 0;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-direction: column-reverse;
    padding: ${({ theme }) => theme.spacing.md};
  }
`;

const ActionButton = styled(Button)`
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 100%;
    min-height: 48px;
  }
`;

const HelpText = styled.p`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.textMuted};
  margin-top: ${({ theme }) => theme.spacing.xs};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

// NEW: Styling for the rubric/assessment criteria section
const AssessmentCriteriaSection = styled(FormGroup)`
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  background-color: ${({ theme }) => theme.colors.background}; // Slightly different background
`;

const RubricInfoText = styled(HelpText)`
  font-style: italic;
  margin-top: ${({ theme }) => theme.spacing.md};
`;


interface ChatbotFormData {
  name: string;
  description: string;
  system_prompt: string;
  model: string;
  max_tokens?: number;
  temperature?: number;
  enable_rag: boolean;
  bot_type: BotType;
  assessment_criteria_text: string;
}

interface ChatbotFormProps {
  onClose: () => void;
  onSuccess: (chatbotId: string) => void;
}

export default function ChatbotForm({ onClose, onSuccess }: ChatbotFormProps) {
  const [formData, setFormData] = useState<ChatbotFormData>({
    name: '',
    description: '',
    system_prompt: '',
    model: 'qwen/qwen3-235b-a22b',
    max_tokens: 1000,
    temperature: 0.7,
    enable_rag: false,
    bot_type: 'learning',
    assessment_criteria_text: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const payload = {
      ...formData,
      assessment_criteria_text: formData.bot_type === 'assessment' ? formData.assessment_criteria_text : undefined,
      enable_rag: formData.bot_type === 'learning' ? formData.enable_rag : false,
    };
    if (payload.max_tokens === undefined || payload.max_tokens === null || isNaN(payload.max_tokens) || String(payload.max_tokens).trim() === '') delete payload.max_tokens;
    if (payload.temperature === undefined || payload.temperature === null || isNaN(payload.temperature) || String(payload.temperature).trim() === '') delete payload.temperature;


    try {
      const response = await fetch('/api/teacher/chatbots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to create chatbot');
      }

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
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setFormData(prev => ({
            ...prev,
            [name]: checked,
        }));
    } else {
        setFormData(prev => ({
            ...prev,
            [name]: (name === 'max_tokens' || name === 'temperature') && value !== '' ? Number(value) : value,
        }));
    }
  };


  return (
    <Overlay>
      <FormCard>
        <Header>
          <Title>Create New Chatbot</Title>
          <CloseButton onClick={onClose} aria-label="Close modal">×</CloseButton>
        </Header>

        <FormContent>
          {error && <Alert variant="error" style={{ marginBottom: '16px' }}>{error}</Alert>}

          <form onSubmit={handleSubmit} id="chatbotCreateForm">
            <FormGroup>
              <Label htmlFor="name">Chatbot Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., History Helper, Vocab Quizzer"
                required
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="bot_type">Bot Type</Label>
              <StyledSelect
                id="bot_type"
                name="bot_type"
                value={formData.bot_type}
                onChange={handleChange}
              >
                <option value="learning">Learning Bot</option>
                <option value="assessment">Assessment Bot</option>
              </StyledSelect>
              <HelpText>
                Choose &apos;Learning&apos; for general interaction or &apos;Assessment&apos; to evaluate student responses against criteria.
              </HelpText>
            </FormGroup>

            {/* ASSESSMENT CRITERIA SECTION (Conditional) */}
            {formData.bot_type === 'assessment' && (
              <AssessmentCriteriaSection> {/* Using new styled component */}
                <Label htmlFor="assessment_criteria_text">Define Assessment Rubric / Criteria</Label>
                <TextArea
                  id="assessment_criteria_text"
                  name="assessment_criteria_text"
                  value={formData.assessment_criteria_text}
                  onChange={handleChange}
                  rows={5} // Slightly more rows
                  placeholder="Clearly describe what the AI should assess. For example:
1. Accuracy of answers to key concepts.
2. Clarity of student's explanations.
3. Use of specific examples or evidence.
4. Critical thinking demonstrated."
                  required={formData.bot_type === 'assessment'}
                />
                <HelpText>
                  This text will guide the AI in evaluating student responses. Be specific.
                </HelpText>
                <RubricInfoText>
                  For more complex rubrics, you will be able to upload a document (e.g., PDF, DOCX) with detailed criteria after creating the bot (on the chatbot&apos;s configuration page). For now, please provide a text-based summary here.
                </RubricInfoText>
              </AssessmentCriteriaSection>
            )}

            <FormGroup>
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="A brief summary of what this chatbot does"
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="system_prompt">System Prompt (AI&apos;s Persona & Core Instructions)</Label>
              <TextArea
                id="system_prompt"
                name="system_prompt"
                value={formData.system_prompt}
                onChange={handleChange}
                placeholder={
                  formData.bot_type === 'assessment'
                  ? "e.g., You are an assessment assistant. Engage the student based on the provided topic. Do not provide answers directly but guide them if they struggle. After the interaction, your analysis will be based on teacher criteria."
                  : "e.g., You are a friendly and helpful history tutor for Grade 10 students."
                }
                required
                rows={formData.bot_type === 'assessment' ? 3 : 5}
              />
              <HelpText>
                  This defines the AI&apos;s general behavior.
                  {formData.bot_type === 'assessment' && " For Assessment Bots, assessment-specific instructions are primarily driven by the Assessment Criteria you define above."}
              </HelpText>
            </FormGroup>

            <FormGroup>
              <Label htmlFor="model">AI Model (for Chatting)</Label>
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
              <HelpText>
                  This model is used for the chatbot&apos;s direct replies to students. The assessment evaluation will use a dedicated model (Qwen3 235B by default for now).
              </HelpText>
            </FormGroup>

            {/* RAG Enable - Conditionally shown for Learning Bots */}
            {formData.bot_type === 'learning' && (
              <FormGroup>
                  <Label htmlFor="enable_rag">Knowledge Base (RAG)</Label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <input
                          id="enable_rag"
                          name="enable_rag"
                          type="checkbox"
                          checked={formData.enable_rag}
                          onChange={handleChange}
                          style={{ width: '1.15em', height: '1.15em', cursor: 'pointer' }}
                      />
                      <span>Enable RAG: Allow chatbot to use uploaded documents to answer questions.</span>
                  </div>
                  <HelpText>
                      If enabled, you can upload documents to this chatbot&apos;s knowledge base after creation (on the chatbot&apos;s configuration page).
                  </HelpText>
              </FormGroup>
            )}

            {/* Max Tokens and Temperature - these apply to the CHATTING model, not necessarily the assessment evaluation model */}
            <FormGroup>
              <Label htmlFor="max_tokens">Max Tokens (Chat Response Length)</Label>
              <Input id="max_tokens" name="max_tokens" type="number" value={formData.max_tokens || ''} onChange={handleChange} placeholder="Default: 1000" />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="temperature">Temperature (Chat Creativity)</Label>
              <Input id="temperature" name="temperature" type="number" value={formData.temperature || ''} onChange={handleChange} min="0" max="2" step="0.1" placeholder="Default: 0.7"/>
              <HelpText>0.0 = most deterministic, 2.0 = most creative. Default is 0.7 for the chatbot&apos;s replies.</HelpText>
            </FormGroup>
          </form>
        </FormContent>

        <Footer>
          <ActionButton type="button" variant="outline" onClick={onClose}>
            Cancel
          </ActionButton>
          <ActionButton type="submit" form="chatbotCreateForm" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Chatbot'}
          </ActionButton>
        </Footer>
      </FormCard>
    </Overlay>
  );
}