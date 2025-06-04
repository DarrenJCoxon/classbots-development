// src/components/teacher/ChatbotForm.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { BotTypeEnum } from '@/types/database.types';
import {
    FormGroup,
    Label,
    Input,
    TextArea,
    Alert,
    Select as StyledSelect
} from '@/styles/StyledComponents';
import { ModernButton } from '@/components/shared/ModernButton';
// Import all required components for document handling
import EnhancedRagUploader from './EnhancedRagUploader';
import EnhancedRagScraper from './EnhancedRagScraper';
import DocumentList from './DocumentList';
import ReadingDocumentUploader from './ReadingDocumentUploader';
import { VideoUrlInput } from './VideoUrlInput';
import { validateVideoUrl } from '@/lib/utils/video-utils';
import type { Document as KnowledgeDocument } from '@/types/knowledge-base.types';
// No direct import of CreateChatbotPayload here as it's for the API route, not this component directly

// Use the BotTypeEnum from database.types
type BotType = BotTypeEnum;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(5px);
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

const FormCard = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 0;
  border: 1px solid rgba(152, 93, 215, 0.1);
  box-shadow: 0 20px 60px rgba(152, 93, 215, 0.2);
  width: 100%;
  max-width: 650px;
  margin: 20px;
  position: relative;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow-y: hidden; /* Hide overflow to let FormContent handle scrolling */

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
  font-size: 24px;
  font-weight: 700;
  font-family: ${({ theme }) => theme.fonts.heading};
  text-transform: uppercase;
  letter-spacing: 1px;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.magenta}
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 20px;
  }
`;

const CloseButton = styled.button`
  background: rgba(152, 93, 215, 0.1);
  border: none;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;
  font-size: 1.5rem;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(152, 93, 215, 0.2);
    transform: scale(1.1);
  }
`;

const FormContent = styled.div`
  padding: ${({ theme }) => theme.spacing.lg};
  overflow-y: auto;
  flex-grow: 1;
  max-height: calc(90vh - 140px); /* Adjust this value based on header/footer height */
  overscroll-behavior: contain; /* Prevent scroll chaining */

  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: ${({ theme }) => theme.colors.borderDark};
    border-radius: 3px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  scrollbar-width: thin; /* Firefox */
  scrollbar-color: ${({ theme }) => theme.colors.borderDark} transparent; /* Firefox */

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${({ theme }) => theme.spacing.md};
    max-height: calc(100vh - 140px); /* Adjust for mobile */
  }
`;


const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.lg};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  flex-shrink: 0;
  background-color: ${({ theme }) => theme.colors.background}; /* Ensure footer is opaque */
  position: sticky;
  bottom: 0;
  z-index: 5;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-direction: column-reverse;
    padding: ${({ theme }) => theme.spacing.md};
  }
`;


const HelpText = styled.p`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.textMuted};
  margin-top: ${({ theme }) => theme.spacing.xs};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const AssessmentCriteriaSection = styled(FormGroup)`
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  background-color: ${({ theme }) => theme.colors.background};
`;

const RubricInfoText = styled(HelpText)`
  font-style: italic;
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const ExampleTemplateContainer = styled.div`
  margin-top: ${({ theme }) => theme.spacing.md};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;


const TemplateButtonGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  margin-top: ${({ theme }) => theme.spacing.xs};
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
  welcome_message: string;
  video_url?: string; // For viewing room Skolrs
  linked_assessment_bot_id?: string; // For linking to assessment Skolr
  chatbot_id?: string; // For edit mode
}

interface ChatbotFormProps {
  onClose: () => void;
  onSuccess: (chatbotId: string) => void;
  initialData?: Partial<ChatbotFormData>;
  editMode?: boolean;
}

export default function ChatbotForm({ onClose, onSuccess, initialData, editMode = false }: ChatbotFormProps) {
  const [formData, setFormData] = useState<ChatbotFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    system_prompt: initialData?.system_prompt || '',
    model: initialData?.model || 'openai/gpt-4.1-mini',
    max_tokens: initialData?.max_tokens !== undefined ? initialData.max_tokens : 1000,
    temperature: initialData?.temperature !== undefined ? initialData.temperature : 0.7,
    enable_rag: initialData?.enable_rag !== undefined ? initialData.enable_rag : false,
    bot_type: initialData?.bot_type || 'learning',
    assessment_criteria_text: initialData?.assessment_criteria_text || '',
    welcome_message: initialData?.welcome_message || '',
    video_url: initialData?.video_url || '',
    linked_assessment_bot_id: initialData?.linked_assessment_bot_id || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof ChatbotFormData, string>>>({});
  
  // Document related state
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [processingDocId, setProcessingDocId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // For forcing document list refresh
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [assessmentBots, setAssessmentBots] = useState<Array<{chatbot_id: string; name: string}>>([]);

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof ChatbotFormData, string>> = {};
    
    // Basic validation rules
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    } else if (formData.name.length > 100) {
      errors.name = 'Name must be less than 100 characters';
    }

    if (!formData.system_prompt.trim()) {
      errors.system_prompt = 'System prompt is required';
    } else if (formData.system_prompt.length < 10) {
      errors.system_prompt = 'System prompt is too short (min 10 characters)';
    } else if (formData.system_prompt.length > 8000) {
      errors.system_prompt = 'System prompt is too long (max 8000 characters)';
    }

    if (formData.bot_type === 'assessment' && !formData.assessment_criteria_text.trim()) {
      errors.assessment_criteria_text = 'Assessment criteria is required for assessment Skolrs';
    }

    if (formData.bot_type === 'viewing_room' && formData.video_url && !editMode) {
      // Validate video URL for viewing room Skolrs during creation
      const validation = validateVideoUrl(formData.video_url);
      if (!validation.valid) {
        errors.video_url = validation.error || 'Invalid video URL';
      }
    }

    if (formData.welcome_message && formData.welcome_message.length > 1000) {
      errors.welcome_message = 'Welcome message must be less than 1000 characters';
    }

    if (formData.description && formData.description.length > 500) {
      errors.description = 'Description must be less than 500 characters';
    }

    // Validate numerical fields
    if (formData.max_tokens !== undefined && formData.max_tokens !== null) {
      const maxTokens = Number(formData.max_tokens);
      if (isNaN(maxTokens) || maxTokens < 1 || maxTokens > 32000) {
        errors.max_tokens = 'Max tokens must be between 1 and 32000';
      }
    }

    if (formData.temperature !== undefined && formData.temperature !== null) {
      const temp = Number(formData.temperature);
      if (isNaN(temp) || temp < 0 || temp > 2) {
        errors.temperature = 'Temperature must be between 0 and 2';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setError(null);

    // The payload sent to /api/teacher/chatbots should match CreateChatbotPayload
    const payload = {
      name: formData.name,
      description: formData.description || undefined,
      system_prompt: formData.system_prompt,
      model: formData.model,
      max_tokens: (formData.max_tokens === undefined || formData.max_tokens === null || isNaN(formData.max_tokens) || String(formData.max_tokens).trim() === '') ? null : Number(formData.max_tokens),
      temperature: (formData.temperature === undefined || formData.temperature === null || isNaN(formData.temperature) || String(formData.temperature).trim() === '') ? null : Number(formData.temperature),
      enable_rag: (formData.bot_type === 'learning' || formData.bot_type === 'reading_room' || formData.bot_type === 'viewing_room') ? formData.enable_rag : false,
      bot_type: formData.bot_type,
      assessment_criteria_text: formData.bot_type === 'assessment' ? (formData.assessment_criteria_text || null) : null,
      welcome_message: formData.welcome_message.trim() || null, // <--- ADDED (send null if empty)
      video_url: formData.bot_type === 'viewing_room' && formData.video_url ? formData.video_url.trim() : undefined,
      linked_assessment_bot_id: formData.bot_type === 'viewing_room' && formData.linked_assessment_bot_id ? formData.linked_assessment_bot_id : undefined,
    };


    try {
      // Determine if we're creating a new chatbot or updating an existing one
      const endpoint = editMode && initialData?.chatbot_id 
        ? `/api/teacher/chatbots/${initialData.chatbot_id}` 
        : '/api/teacher/chatbots';
      
      const method = editMode ? 'PUT' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || `Failed to ${editMode ? 'update' : 'create'} Skolr`);
      }

      onSuccess(responseData.chatbot_id);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create Skolr');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to fetch documents for the Skolr
  const fetchDocuments = useCallback(async () => {
    if (!editMode || !initialData?.chatbot_id) return;
    
    setDocsLoading(true);
    setDocsError(null);
    
    try {
      const response = await fetch(`/api/teacher/documents?chatbotId=${initialData.chatbot_id}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
        throw new Error(errorData.error || `Failed to fetch documents (status ${response.status})`);
      }
      
      const data = await response.json();
      console.log('Fetched documents:', data.length);
      setDocuments(data);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setDocsError(err instanceof Error ? err.message : 'Could not load documents.');
    } finally {
      setDocsLoading(false);
    }
  }, [editMode, initialData?.chatbot_id]);
  
  // Fetch documents when in edit mode and chatbot has RAG enabled
  useEffect(() => {
    if (editMode && initialData?.chatbot_id && formData.enable_rag && (formData.bot_type === 'learning' || formData.bot_type === 'reading_room' || formData.bot_type === 'viewing_room')) {
      fetchDocuments();
    }
  }, [editMode, initialData?.chatbot_id, formData.enable_rag, formData.bot_type, fetchDocuments, refreshTrigger]);
  
  // Set up polling for document updates to ensure we catch status changes
  useEffect(() => {
    if (!editMode || !initialData?.chatbot_id || !formData.enable_rag || (formData.bot_type !== 'learning' && formData.bot_type !== 'reading_room')) return;
    
    // Set up a polling interval to refresh documents every 5 seconds
    // but only if there are documents that are processing
    const pollingInterval = setInterval(() => {
      if (documents.some(doc => doc.status === 'processing')) {
        console.log('[ChatbotForm] Polling for document updates...');
        fetchDocuments();
      }
    }, 5000);
    
    return () => clearInterval(pollingInterval);
  }, [editMode, initialData?.chatbot_id, formData.enable_rag, formData.bot_type, documents, fetchDocuments]);
  
  // Fetch assessment Skolrs when form is for viewing room Skolr
  useEffect(() => {
    if (formData.bot_type === 'viewing_room') {
      const fetchAssessmentBots = async () => {
        try {
          const response = await fetch('/api/teacher/chatbots?botType=assessment');
          if (response.ok) {
            const bots = await response.json();
            setAssessmentBots(bots.map((bot: any) => ({
              chatbot_id: bot.chatbot_id,
              name: bot.name
            })));
          }
        } catch (error) {
          console.error('Error fetching assessment Skolrs:', error);
        }
      };
      fetchAssessmentBots();
    }
  }, [formData.bot_type]);
  
  // Document operations handlers
  const handleProcessDocument = async (documentId: string) => {
    if (!editMode || !initialData?.chatbot_id) return;
    
    setDocsError(null);
    setProcessingDocId(documentId);
    
    try {
      const response = await fetch(`/api/teacher/chatbots/${initialData.chatbot_id}/vectorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      });
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to start document processing');
      }
      
      // Update the document status locally
      setDocuments(prevDocs => 
        prevDocs.map(doc => doc.document_id === documentId ? { ...doc, status: 'processing' } : doc)
      );
      
      // Force a refresh
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      setDocsError(err instanceof Error ? err.message : 'Could not process document.');
    } finally {
      setProcessingDocId(null);
    }
  };
  
  const handleDeleteDocument = async (documentId: string) => {
    if (!editMode || !initialData?.chatbot_id) return;
    
    setDocsError(null);
    
    try {
      const response = await fetch(`/api/teacher/documents?documentId=${documentId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete document');
      }
      
      // Update documents list locally
      setDocuments(prevDocs => prevDocs.filter(doc => doc.document_id !== documentId));
    } catch (err) {
      setDocsError(err instanceof Error ? err.message : 'Could not delete document.');
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    // Clear validation error for this field when user makes changes
    if (validationErrors[e.target.name as keyof ChatbotFormData]) {
      setValidationErrors(prev => ({
        ...prev,
        [e.target.name]: undefined
      }));
    }
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setFormData(prev => ({
            ...prev,
            [name]: checked,
        }));
    } else {
        // For welcome_message, allow empty string in state for controlled input,
        // it will be converted to null in handleSubmit if empty.
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
          <Title>{editMode ? 'Edit Skolr' : 'Create New Skolr'}</Title>
          <CloseButton onClick={onClose} aria-label="Close modal">×</CloseButton>
        </Header>

        <FormContent>
          {error && <Alert variant="error" style={{ marginBottom: '16px' }}>{error}</Alert>}
          {successMessage && <Alert variant="success" style={{ marginBottom: '16px' }}>{successMessage}</Alert>}

          <form onSubmit={handleSubmit} id="chatbotCreateForm">
            {/* ... other FormGroups for name, bot_type, assessment_criteria, description, system_prompt ... */}
            <FormGroup>
              <Label htmlFor="name">Skolr Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., History Helper, Vocab Quizzer"
                required
                className={!!validationErrors.name ? 'is-invalid' : ''}
              />
              {validationErrors.name && (
                <Alert variant="error" style={{ marginTop: '4px', padding: '4px 8px' }}>
                  {validationErrors.name}
                </Alert>
              )}
            </FormGroup>

            <FormGroup>
              <Label htmlFor="bot_type">Skolr Type</Label>
              <StyledSelect
                id="bot_type"
                name="bot_type"
                value={formData.bot_type}
                onChange={handleChange}
                key="bot_type_select"
              >
                <option value="learning">Learning Skolr</option>
                <option value="assessment">Assessment Skolr</option>
                <option value="reading_room">Reading Room Skolr</option>
                <option value="viewing_room">Viewing Room Skolr</option>
              </StyledSelect>
              <HelpText>
                {formData.bot_type === 'reading_room' 
                  ? "Reading Room: Students read a PDF document alongside AI assistance. Perfect for guided reading sessions."
                  : formData.bot_type === 'viewing_room'
                  ? "Viewing Room: Students watch a video alongside AI assistance. Perfect for video-based learning."
                  : "Choose 'Learning' for general interaction or 'Assessment' to evaluate student responses against criteria."
                }
              </HelpText>
            </FormGroup>

            {formData.bot_type === 'assessment' && (
              <AssessmentCriteriaSection>
                <Label htmlFor="assessment_criteria_text">Define Assessment Rubric / Criteria</Label>
                <TextArea
                  id="assessment_criteria_text"
                  name="assessment_criteria_text"
                  value={formData.assessment_criteria_text}
                  onChange={handleChange}
                  rows={8}
                  placeholder="Clearly describe what the AI should assess. For example:
1. Accuracy of answers to key concepts.
2. Clarity of student's explanations.
3. Use of specific examples or evidence.
4. Critical thinking demonstrated."
                  required={formData.bot_type === 'assessment'}
                  className={!!validationErrors.assessment_criteria_text ? 'is-invalid' : ''}
                />
                {validationErrors.assessment_criteria_text && (
                  <Alert variant="error" style={{ marginTop: '4px', padding: '4px 8px' }}>
                    {validationErrors.assessment_criteria_text}
                  </Alert>
                )}
                <HelpText>
                  This text will guide the AI in evaluating student responses. Be specific.
                </HelpText>
                
                <ExampleTemplateContainer>
                  <Label as="p" style={{ marginBottom: '4px' }}>Example Templates:</Label>
                  <TemplateButtonGroup>
                    <ModernButton 
                      variant="ghost" 
                      size="small"
                      style={{ marginRight: '8px', marginBottom: '8px' }}
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          assessment_criteria_text: `Evaluate the student's understanding of key scientific concepts based on the following criteria:

1. Understanding of the scientific method (20%)
   - Can identify all steps in the scientific method
   - Explains how hypothesis testing works
   - Understands experimental controls and variables

2. Content knowledge accuracy (40%)
   - Facts are correct and relevant
   - Can explain relationships between concepts
   - Uses proper scientific terminology

3. Critical analysis (20%)
   - Identifies strengths/weaknesses in arguments
   - Considers multiple perspectives
   - Draws reasonable conclusions from evidence

4. Communication clarity (20%)
   - Ideas expressed logically and coherently
   - Uses specific examples to support points
   - Grammar and spelling are correct`
                        }))
                      }}
                    >
                      Science Assessment
                    </ModernButton>
                    
                    <ModernButton 
                      variant="ghost" 
                      size="small"
                      style={{ marginRight: '8px', marginBottom: '8px' }}
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          assessment_criteria_text: `Assess the student's essay using the following criteria:

1. Thesis & Structure (25%)
   - Clear thesis statement that establishes the argument
   - Logical organization with introduction, body paragraphs, and conclusion
   - Smooth transitions between ideas

2. Evidence & Analysis (30%)
   - Relevant and specific evidence to support claims
   - In-depth analysis that connects evidence to thesis
   - Thoughtful engagement with multiple perspectives

3. Critical Thinking (25%)
   - Original insights beyond surface-level observations
   - Considers implications and significance of the argument
   - Addresses potential counterarguments

4. Writing Mechanics (20%)
   - Proper grammar, spelling, and punctuation
   - Varied sentence structure and academic vocabulary
   - Consistent citation format (if applicable)`
                        }))
                      }}
                    >
                      Essay Rubric
                    </ModernButton>
                    
                    <ModernButton 
                      variant="ghost" 
                      size="small"
                      style={{ marginRight: '8px', marginBottom: '8px' }}
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          assessment_criteria_text: `Evaluate the student's math problem-solving abilities using these criteria:

1. Procedural Fluency (30%)
   - Correctly applies mathematical operations
   - Follows proper order of operations
   - Shows computational accuracy

2. Conceptual Understanding (30%)
   - Demonstrates understanding of underlying concepts
   - Can explain why procedures work
   - Makes connections between related ideas

3. Problem-Solving Strategy (25%)
   - Selects appropriate approach to solve problems
   - Implements strategy efficiently
   - Can apply concepts to novel situations

4. Mathematical Communication (15%)
   - Uses correct mathematical notation
   - Shows work in a clear, organized manner
   - Explains reasoning behind steps`
                        }))
                      }}
                    >
                      Math Problems
                    </ModernButton>
                  </TemplateButtonGroup>
                </ExampleTemplateContainer>
                
                <RubricInfoText>
                  For more complex rubrics, you will be able to upload a document (e.g., PDF, DOCX) with detailed criteria after creating the Skolr (on the Skolr&apos;s configuration page). For now, please provide a text-based summary here.
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
                placeholder="A brief summary of what this Skolr does"
                className={!!validationErrors.description ? 'is-invalid' : ''}
              />
              {validationErrors.description && (
                <Alert variant="error" style={{ marginTop: '4px', padding: '4px 8px' }}>
                  {validationErrors.description}
                </Alert>
              )}
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
                  : formData.bot_type === 'reading_room'
                  ? "e.g., You are a reading companion helping students understand [book/document name]. Help them with vocabulary, comprehension, and analysis. Reference specific pages or passages when helpful."
                  : "e.g., You are a friendly and helpful history tutor for Grade 10 students."
                }
                required
                rows={formData.bot_type === 'assessment' ? 3 : 5}
                className={!!validationErrors.system_prompt ? 'is-invalid' : ''}
              />
              {validationErrors.system_prompt && (
                <Alert variant="error" style={{ marginTop: '4px', padding: '4px 8px' }}>
                  {validationErrors.system_prompt}
                </Alert>
              )}
              <HelpText>
                  This defines the AI&apos;s general behavior.
                  {formData.bot_type === 'assessment' && " For Assessment Skolrs, assessment-specific instructions are primarily driven by the Assessment Criteria you define above."}
              </HelpText>
            </FormGroup>

            {/* ADDED Welcome Message Field */}
            <FormGroup>
              <Label htmlFor="welcome_message">Welcome Message (Optional)</Label>
              <TextArea
                id="welcome_message"
                name="welcome_message"
                value={formData.welcome_message}
                onChange={handleChange}
                rows={3}
                placeholder="e.g., Hello! I'm your [topic] assistant. How can I help you today?"
                className={!!validationErrors.welcome_message ? 'is-invalid' : ''}
              />
              {validationErrors.welcome_message && (
                <Alert variant="error" style={{ marginTop: '4px', padding: '4px 8px' }}>
                  {validationErrors.welcome_message}
                </Alert>
              )}
              <HelpText>
                This will be the first message the student sees from the Skolr.
              </HelpText>
            </FormGroup>
            {/* END ADDED Welcome Message Field */}

            <FormGroup>
              <Label htmlFor="model">AI Model (for Chatting)</Label>
              <StyledSelect
                  id="model"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
              >
                  <option value="openai/gpt-4.1-mini">GPT-4.1 Mini</option>
                  <option value="google/gemini-2.5-flash-preview-05-20">Gemini 2.5 Flash</option>
                  <option value="nvidia/llama-3.1-nemotron-ultra-253b-v1">Llama-3.1</option>
                  <option value="x-ai/grok-3-mini-beta">Grok-3 Mini</option>
                  <option value="deepseek/deepseek-r1-0528">DeepSeek-R1</option>
              </StyledSelect>
              <HelpText>
                  This model is used for the Skolr&apos;s direct replies to students. The assessment evaluation will use a dedicated model for consistent evaluation.
              </HelpText>
            </FormGroup>

            {(formData.bot_type === 'learning' || formData.bot_type === 'reading_room' || formData.bot_type === 'viewing_room') && (
              <FormGroup>
                  <Label htmlFor="enable_rag">
                    {formData.bot_type === 'reading_room' ? 'Knowledge Base (Optional)' : 
                     formData.bot_type === 'viewing_room' ? 'Knowledge Base (Includes Auto-Transcript)' :
                     'Knowledge Base (RAG)'}
                  </Label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <input
                          id="enable_rag"
                          name="enable_rag"
                          type="checkbox"
                          checked={formData.enable_rag}
                          onChange={handleChange}
                          style={{ width: '1.15em', height: '1.15em', cursor: 'pointer' }}
                      />
                      <span>
                        {formData.bot_type === 'reading_room' 
                          ? 'Enable Knowledge Base: Allow the AI to use additional reference materials for context.'
                          : formData.bot_type === 'viewing_room'
                          ? 'Enable Knowledge Base: Video transcript will be automatically added, plus you can add more documents.'
                          : 'Enable RAG: Allow Skolr to use uploaded documents to answer questions.'}
                      </span>
                  </div>
                  <HelpText>
                      {(formData.bot_type === 'reading_room' || formData.bot_type === 'viewing_room')
                        ? 'Add supplementary materials like teacher guides, answer keys, or background information to help the AI provide better support.'
                        : 'If enabled, you can upload documents to this Skolr\'s knowledge base after creation (on the Skolr\'s configuration page).'}
                  </HelpText>
                  
                  {formData.enable_rag && (
                    <>
                      {/* Show enhanced RAG components only in edit mode with a valid chatbot ID */}
                      {editMode && initialData?.chatbot_id ? (
                        <>
                          <EnhancedRagUploader
                            chatbotId={initialData.chatbot_id}
                            onUploadSuccess={(newDocument) => {
                              // Add the new document to the list immediately
                              if (newDocument) {
                                setDocuments(prev => [newDocument, ...prev]);
                              }
                              // Also refresh the full list for consistency
                              setRefreshTrigger(prev => prev + 1);
                            }}
                          />
                          <EnhancedRagScraper
                            chatbotId={initialData.chatbot_id}
                            onScrapeSuccess={(newDocument) => {
                              // Add the new document to the list immediately
                              if (newDocument) {
                                setDocuments(prev => [newDocument, ...prev]);
                              }
                              // Also refresh the full list for consistency
                              setRefreshTrigger(prev => prev + 1);
                            }}
                          />
                          
                          {/* Document List Section */}
                          {docsError && <Alert variant="error" style={{ marginTop: '16px' }}>{docsError}</Alert>}
                          
                          <div style={{ marginTop: '24px' }}>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Knowledge Base Documents</h3>
                            
                            {docsLoading && documents.length === 0 ? (
                              <div style={{ textAlign: 'center', padding: '20px' }}>
                                <p>Loading documents...</p>
                              </div>
                            ) : (
                              <DocumentList
                                documents={documents}
                                onProcessDocument={handleProcessDocument}
                                onDeleteDocument={handleDeleteDocument}
                                onViewStatus={() => {}} // We won't implement detailed view in the modal
                              />
                            )}
                            
                            {!docsLoading && documents.length === 0 && (
                              <Alert variant="info" style={{ marginTop: '12px' }}>
                                No documents have been added yet. Upload documents or scrape webpages above to build your knowledge base.
                              </Alert>
                            )}
                          </div>
                        </>
                      ) : (
                        <Alert variant="info" style={{ marginTop: '12px', marginBottom: '12px' }}>
                          {(formData.bot_type === 'reading_room' || formData.bot_type === 'viewing_room')
                            ? `💡 Step 2 (Optional): After ${formData.bot_type === 'reading_room' ? 'uploading the reading document' : 'adding the video URL'}, you can add supplementary materials here like teacher guides or answer keys.`
                            : 'After creating your Skolr, you\'ll be able to upload documents and scrape webpages for the knowledge base.'}
                        </Alert>
                      )}
                    </>
                  )}
              </FormGroup>
            )}

            {formData.bot_type === 'reading_room' && (
              <FormGroup>
                <Label htmlFor="reading_document">📖 Reading Document</Label>
                <HelpText>
                  This is the main document students will read. It appears on the left side of their screen while they chat with the AI.
                </HelpText>
                
                {editMode && initialData?.chatbot_id ? (
                  <ReadingDocumentUploader
                    chatbotId={initialData.chatbot_id}
                    onUploadSuccess={() => {
                      setSuccessMessage('Reading document updated successfully!');
                      setTimeout(() => setSuccessMessage(null), 5000);
                    }}
                  />
                ) : (
                  <Alert variant="info">
                    💡 Step 1: Create your Reading Room Skolr first. After clicking "Create Skolr", you'll be automatically redirected to upload the reading document.
                  </Alert>
                )}
              </FormGroup>
            )}

            {formData.bot_type === 'viewing_room' && (
              <FormGroup>
                <Label htmlFor="video_url">📹 Video Content</Label>
                <HelpText>
                  Add a YouTube or Vimeo video that students will watch. It appears on the left side of their screen while they chat with the AI.
                </HelpText>
                
                {editMode && initialData?.chatbot_id ? (
                  <VideoUrlInput
                    chatbotId={initialData.chatbot_id}
                    currentVideoUrl={formData.video_url} 
                    onSaveSuccess={() => {
                      setSuccessMessage('Video URL saved successfully!');
                      setTimeout(() => setSuccessMessage(null), 5000);
                    }}
                  />
                ) : (
                  <>
                    <Input
                      id="video_url"
                      name="video_url"
                      type="url"
                      value={formData.video_url || ''}
                      onChange={handleChange}
                      placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                      className={!!validationErrors.video_url ? 'is-invalid' : ''}
                    />
                    {validationErrors.video_url && (
                      <Alert variant="error" style={{ marginTop: '4px', padding: '4px 8px' }}>
                        {validationErrors.video_url}
                      </Alert>
                    )}
                    {formData.enable_rag && (
                      <HelpText style={{ marginTop: '8px' }}>
                        🎯 The video transcript will be automatically added to the knowledge base when you save.
                      </HelpText>
                    )}
                  </>
                )}
              </FormGroup>
            )}

            {formData.bot_type === 'viewing_room' && (
              <FormGroup>
                <Label htmlFor="linked_assessment_bot_id">🎯 Link to Assessment Skolr (Optional)</Label>
                <HelpText>
                  After students complete the video, they can be prompted to take an assessment.
                </HelpText>
                <StyledSelect
                  id="linked_assessment_bot_id"
                  name="linked_assessment_bot_id"
                  value={formData.linked_assessment_bot_id || ''}
                  onChange={handleChange}
                >
                  <option value="">No linked assessment</option>
                  {assessmentBots.map(bot => (
                    <option key={bot.chatbot_id} value={bot.chatbot_id}>
                      {bot.name}
                    </option>
                  ))}
                </StyledSelect>
                {formData.linked_assessment_bot_id && (
                  <HelpText style={{ marginTop: '8px', color: '#3B82F6' }}>
                    ✅ Students will see "Start Assessment" button after watching 90% of the video
                  </HelpText>
                )}
              </FormGroup>
            )}

            <FormGroup>
              <Label htmlFor="max_tokens">Max Tokens (Chat Response Length)</Label>
              <Input 
                id="max_tokens" 
                name="max_tokens" 
                type="number" 
                value={formData.max_tokens || ''} 
                onChange={handleChange} 
                placeholder="Default: 1000" 
                className={!!validationErrors.max_tokens ? 'is-invalid' : ''}
              />
              {validationErrors.max_tokens && (
                <Alert variant="error" style={{ marginTop: '4px', padding: '4px 8px' }}>
                  {validationErrors.max_tokens}
                </Alert>
              )}
            </FormGroup>

            <FormGroup>
              <Label htmlFor="temperature">Temperature (Chat Creativity)</Label>
              <Input 
                id="temperature" 
                name="temperature" 
                type="number" 
                value={formData.temperature || ''} 
                onChange={handleChange} 
                min="0" 
                max="2" 
                step="0.1" 
                placeholder="Default: 0.7"
                className={!!validationErrors.temperature ? 'is-invalid' : ''}
              />
              {validationErrors.temperature && (
                <Alert variant="error" style={{ marginTop: '4px', padding: '4px 8px' }}>
                  {validationErrors.temperature}
                </Alert>
              )}
              <HelpText>0.0 = most deterministic, 2.0 = most creative. Default is 0.7 for the Skolr&apos;s replies.</HelpText>
            </FormGroup>
          </form>
        </FormContent>

        <Footer>
          <ModernButton 
            type="button" 
            variant="ghost" 
            onClick={onClose}
          >
            Cancel
          </ModernButton>
          <ModernButton 
            type="submit" 
            form="chatbotCreateForm" 
            variant="primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (editMode ? 'Saving...' : 'Creating...') : (editMode ? 'Save Changes' : 'Create Skolr')}
          </ModernButton>
        </Footer>
      </FormCard>
    </Overlay>
  );
}