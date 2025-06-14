// src/app/teacher-dashboard/chatbots/[chatbotId]/edit/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import styled from 'styled-components';
import {
    Container, Card, FormGroup, Label, Input, TextArea, Alert,
    Select as StyledSelect
} from '@/styles/StyledComponents';
import { createClient } from '@/lib/supabase/client';
import { ModernButton } from '@/components/shared/ModernButton';
import EnhancedRagUploader from '@/components/teacher/EnhancedRagUploader';
import EnhancedRagScraper from '@/components/teacher/EnhancedRagScraper';
import DocumentList from '@/components/teacher/DocumentList';
import EmbeddingStatus from '@/components/teacher/EmbeddingStatus';
import ReadingDocumentUploader from '@/components/teacher/ReadingDocumentUploader';
import type { Chatbot, Document as KnowledgeDocument, BotTypeEnum as BotType, CreateChatbotPayload } from '@/types/database.types';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

const PageWrapper = styled.div`
  padding: ${({ theme }) => theme.spacing.xl} 0;
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
      radial-gradient(circle at 20% 50%, rgba(152, 93, 215, 0.03) 0%, transparent 50%),
      radial-gradient(circle at 80% 80%, rgba(76, 190, 243, 0.03) 0%, transparent 50%),
      radial-gradient(circle at 40% 20%, rgba(200, 72, 175, 0.03) 0%, transparent 50%);
    pointer-events: none;
    z-index: 0;
  }
`;

const HeaderControls = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  gap: ${({ theme }) => theme.spacing.md};
  flex-wrap: wrap;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-direction: column;
    align-items: stretch;
    gap: ${({ theme }) => theme.spacing.sm};
  }
`;

const ContentContainer = styled(Container)`
  position: relative;
  z-index: 1;
`;

const MobileBackButton = styled(ModernButton)`
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 14px;
    padding: 8px 16px;
    white-space: nowrap;
    width: 100%;
    justify-content: center;
  }
`;

const MainTitle = styled.h1`
  font-size: 36px;
  font-weight: 800;
  font-family: ${({ theme }) => theme.fonts.heading};
  text-transform: uppercase;
  margin: 0 0 8px 0;
  letter-spacing: 1px;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.magenta}
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 28px;
  }
`;

const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.sm};
  input[type="checkbox"] {
    width: 1.15em;
    height: 1.15em;
    cursor: pointer;
  }
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  margin: ${({ theme }) => theme.spacing.xl} 0;
`;

const SectionTitle = styled.h2`
  margin-top: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  font-size: 1.5rem;
`;

const KnowledgeBaseSummary = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const SummaryCard = styled.div<{ $variant?: 'default' | 'success' | 'warning' | 'error' }>`
  background-color: ${({ theme, $variant }) => 
    $variant === 'success' ? `${theme.colors.green}15` :
    $variant === 'warning' ? `${theme.colors.secondary}15` :
    $variant === 'error' ? `${theme.colors.red}15` :
    theme.colors.backgroundDark
  };
  border: 1px solid ${({ theme, $variant }) => 
    $variant === 'success' ? theme.colors.green :
    $variant === 'warning' ? theme.colors.secondary :
    $variant === 'error' ? theme.colors.red :
    theme.colors.border
  };
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  padding: ${({ theme }) => theme.spacing.md};
  flex: 1;
  min-width: 130px;
  text-align: center;
`;

const SummaryNumber = styled.div`
  font-size: 1.8rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const SummaryLabel = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const StyledCard = styled.div`
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 32px;
  border: 1px solid rgba(152, 93, 215, 0.1);
  box-shadow: 0 8px 32px rgba(152, 93, 215, 0.05);
`;

const LoadingCard = styled(StyledCard)`
    text-align: center;
    padding: ${({ theme }) => theme.spacing.xl};
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.md};
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

const LoadingStateContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: ${({ theme }) => theme.spacing.sm};
    padding: ${({ theme }) => theme.spacing.lg};
    color: ${({ theme }) => theme.colors.textLight};
`;

// MODIFIED: Styled component for URL input section
// Removed - now using EnhancedRagScraper component
// const UrlInputSection = styled.div`...`;
// const UrlInputForm = styled.form`...`;
// const UrlInput = styled(Input)`...`;


const initialChatbotState: Chatbot = {
    chatbot_id: '',
    name: '',
    description: '',
    system_prompt: `You are a helpful AI assistant.`,
    teacher_id: '',
    model: 'openai/gpt-4.1-mini',
    max_tokens: 1000,
    temperature: 0.7,
    enable_rag: false,
    bot_type: 'learning',
    assessment_criteria_text: null,
    welcome_message: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
};

export default function ConfigureChatbotPage() {
  const [chatbot, setChatbot] = useState<Chatbot>(initialChatbotState);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [docsLoading, setDocsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [viewingDocumentId, setViewingDocumentId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // MODIFIED: Added states for URL input
  // Removed - now using EnhancedRagScraper component
  // const [webpageUrl, setWebpageUrl] = useState('');
  // const [isAddingUrl, setIsAddingUrl] = useState(false);
  // const [urlError, setUrlError] = useState<string | null>(null);


  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const chatbotIdFromParams = params?.chatbotId as string;

  const fetchChatbotData = useCallback(async (id: string, teacherId: string) => {
    setFormError(null);
    try {
      const { data, error } = await supabase
        .from('chatbots')
        .select('*')
        .eq('chatbot_id', id)
        .eq('teacher_id', teacherId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Chatbot not found or you do not have permission.');

      const fetchedData = data as Chatbot;
      if (!fetchedData.bot_type) {
        fetchedData.bot_type = 'learning';
      }
      fetchedData.welcome_message = fetchedData.welcome_message || null;
      setChatbot(fetchedData);

    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to load chatbot data.');
      setChatbot(initialChatbotState);
    } finally {
      setPageLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    const initializePage = async () => {
        setPageLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/auth');
            return;
        }
        setCurrentUserId(user.id);

        if (chatbotIdFromParams === 'new') {
            setIsCreateMode(true);
            setChatbot({ ...initialChatbotState, teacher_id: user.id });
            setDocuments([]);
            setPageLoading(false);
        } else {
            setIsCreateMode(false);
            await fetchChatbotData(chatbotIdFromParams, user.id);
        }
    };
    if (chatbotIdFromParams) {
        initializePage();
    }
  }, [chatbotIdFromParams, router, supabase, fetchChatbotData]);

  const fetchDocumentsData = useCallback(async (currentChatbotId: string) => {
    if (!currentChatbotId) return;
    setDocsLoading(true);
    setDocsError(null);
    try {
      const response = await fetch(`/api/teacher/documents?chatbotId=${currentChatbotId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
        throw new Error(errorData.error || `Failed to fetch documents (status ${response.status})`);
      }
      const dataResult: KnowledgeDocument[] = await response.json();
      setDocuments(dataResult);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setDocsError(err instanceof Error ? err.message : 'Could not load documents.');
    } finally {
      setDocsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isCreateMode && chatbot.chatbot_id && chatbot.bot_type === 'learning' && chatbot.enable_rag) {
        fetchDocumentsData(chatbot.chatbot_id);
    } else if (!isCreateMode && chatbot.chatbot_id && (chatbot.bot_type !== 'learning' || !chatbot.enable_rag)) {
        setDocuments([]);
    }
  }, [chatbot.chatbot_id, chatbot.bot_type, chatbot.enable_rag, isCreateMode, fetchDocumentsData]);
  
  // Set up polling for document updates to ensure the UI stays fresh
  useEffect(() => {
    if (isCreateMode || !chatbot.chatbot_id || chatbot.bot_type !== 'learning' || !chatbot.enable_rag) return;
    
    // Poll for updates when documents are processing
    const pollingInterval = setInterval(() => {
      if (documents.some(doc => doc.status === 'processing')) {
        console.log('[Edit Page] Polling for document status updates...');
        fetchDocumentsData(chatbot.chatbot_id);
      }
    }, 5000);
    
    return () => clearInterval(pollingInterval);
  }, [chatbot.bot_type, chatbot.chatbot_id, chatbot.enable_rag, documents, fetchDocumentsData, isCreateMode]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) {
        setFormError("User session expired. Please refresh.");
        return;
    }

    setSaving(true);
    setFormError(null);
    setSuccessMessage(null);

    const currentBotType = chatbot.bot_type || 'learning';

    const supabaseUpdatePayload: Partial<Omit<Chatbot, 'chatbot_id' | 'created_at' | 'updated_at' | 'teacher_id'>> & { teacher_id?: string } = {
        name: chatbot.name,
        description: chatbot.description || undefined,
        system_prompt: chatbot.system_prompt,
        model: chatbot.model,
        max_tokens: (chatbot.max_tokens === undefined || chatbot.max_tokens === null || String(chatbot.max_tokens).trim() === ``) ? null : Number(chatbot.max_tokens),
        temperature: (chatbot.temperature === undefined || chatbot.temperature === null || String(chatbot.temperature).trim() === ``) ? null : Number(chatbot.temperature),
        enable_rag: currentBotType === 'learning' ? (chatbot.enable_rag || false) : false,
        bot_type: currentBotType,
        assessment_criteria_text: currentBotType === 'assessment' ? (chatbot.assessment_criteria_text || null) : null,
        welcome_message: chatbot.welcome_message || null,
    };
    if (supabaseUpdatePayload.description === undefined) delete supabaseUpdatePayload.description;

    try {
        if (isCreateMode) {
            const apiCreatePayload: CreateChatbotPayload = {
                name: chatbot.name,
                system_prompt: chatbot.system_prompt,
                description: chatbot.description || undefined,
                model: chatbot.model || 'openai/gpt-4.1-mini',
                max_tokens: supabaseUpdatePayload.max_tokens,
                temperature: supabaseUpdatePayload.temperature,
                enable_rag: supabaseUpdatePayload.enable_rag,
                bot_type: supabaseUpdatePayload.bot_type,
                assessment_criteria_text: supabaseUpdatePayload.assessment_criteria_text,
                welcome_message: supabaseUpdatePayload.welcome_message,
            };

            const response = await fetch('/api/teacher/chatbots', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(apiCreatePayload),
            });
            const responseData = await response.json();
            if (!response.ok) throw new Error(responseData.error || 'Failed to create chatbot');

            setSuccessMessage('Chatbot created successfully! You can now configure its knowledge base if RAG is enabled.');
            const newBotData = responseData as Chatbot;
            setChatbot(newBotData);
            setIsCreateMode(false);
            router.replace(`/teacher-dashboard/chatbots/${newBotData.chatbot_id}/edit`, { scroll: false });

        } else {
            const updateDataForSupabase = { ...supabaseUpdatePayload };
            delete updateDataForSupabase.teacher_id;

            // Debug logging for model update
            console.log('[Edit Page] Updating chatbot with model:', {
              chatbot_id: chatbot.chatbot_id,
              current_model: chatbot.model,
              update_model: updateDataForSupabase.model
            });

            const { error: updateError } = await supabase
                .from('chatbots')
                .update({ ...updateDataForSupabase, updated_at: new Date().toISOString() })
                .eq('chatbot_id', chatbot.chatbot_id)
                .eq('teacher_id', currentUserId);

            if (updateError) throw updateError;
            setSuccessMessage('Chatbot updated successfully!');
        }
    } catch (err) {
        setFormError(err instanceof Error ? err.message : (isCreateMode ? 'Failed to create chatbot.' : 'Failed to update chatbot.'));
    } finally {
        setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let processedValue: string | number | boolean | undefined | null | BotType = value;

    // Debug logging for model selection
    if (name === 'model') {
      console.log('[Edit Page] Model selection changed:', {
        name,
        value,
        current_model: chatbot.model
      });
    }

    if (name === "max_tokens" || name === "temperature") {
        processedValue = value === `` ? null : Number(value);
    } else if (name === "bot_type") {
        processedValue = value as BotType;
    } else if (name === "enable_rag") {
        return;
    }
    else if ((name === "welcome_message" || name === "assessment_criteria_text") && value.trim() === "") {
        processedValue = null;
    }

    setChatbot(prev => ({ ...prev, [name]: processedValue } as Chatbot));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setChatbot(prev => ({ ...prev, [name]: checked } as Chatbot));
  };

  const handleProcessDocument = async (documentId: string) => {
    if (isCreateMode || !chatbot.chatbot_id) return;
    setDocsError(null);
    try {
      const response = await fetch(`/api/teacher/chatbots/${chatbot.chatbot_id}/vectorize`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentId }),
      });
      if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || 'Failed to start document processing'); }
      setDocuments(prevDocs => prevDocs.map(doc => doc.document_id === documentId ? { ...doc, status: 'processing' } : doc));
      setViewingDocumentId(documentId);
      setSuccessMessage('Document processing started. You can monitor its status below.');
    } catch (err) { setDocsError(err instanceof Error ? err.message : 'Could not process document.'); }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (isCreateMode || !chatbot.chatbot_id) return;
    setDocsError(null);
    try {
      const response = await fetch(`/api/teacher/documents?documentId=${documentId}`, { method: 'DELETE' });
      if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || 'Failed to delete document'); }
      setDocuments(prevDocs => prevDocs.filter(doc => doc.document_id !== documentId));
      if (viewingDocumentId === documentId) { setViewingDocumentId(null); }
      setSuccessMessage('Document deleted successfully.');
    } catch (err) { setDocsError(err instanceof Error ? err.message : 'Could not delete document.'); }
  };

  const getViewingDocument = (): KnowledgeDocument | null => {
    if (!viewingDocumentId) return null;
    return documents.find(doc => doc.document_id === viewingDocumentId) || null;
  };
  
  // Calculate document statistics
  const getDocumentStats = () => {
    const total = documents.length;
    const completed = documents.filter(doc => doc.status === 'completed').length;
    const processing = documents.filter(doc => doc.status === 'processing').length;
    const pending = documents.filter(doc => doc.status === 'uploaded' || doc.status === 'fetched').length;
    const error = documents.filter(doc => doc.status === 'error').length;
    
    return {
      total,
      completed,
      processing,
      pending,
      error
    };
  };

  // Removed - now using EnhancedRagScraper component
  /*
  const handleAddWebpage = async (e: React.FormEvent) => {
    // Function body removed - using EnhancedRagScraper instead
  };
  */


  if (pageLoading) {
    return ( <PageWrapper><ContentContainer><LoadingCard><LoadingSpinner size="large" /><p>{`Loading configuration page...`}</p></LoadingCard></ContentContainer></PageWrapper> );
  }
  if (!isCreateMode && !chatbot.chatbot_id && !pageLoading) {
     return ( <PageWrapper><ContentContainer><Alert variant="error">{formError || `Chatbot data could not be initialized. Please go back and try again.`}</Alert></ContentContainer></PageWrapper> );
  }

  const displayBotType = chatbot.bot_type || 'learning';

  return (
    <PageWrapper>
      <ContentContainer>
        <HeaderControls>
          <MainTitle>{isCreateMode ? `Create New Chatbot` : `Edit Chatbot: ${chatbot.name}`}</MainTitle>
          <MobileBackButton variant="ghost" onClick={() => router.push('/teacher-dashboard/chatbots')}>
            {`<`} Back to Chatbots
          </MobileBackButton>
        </HeaderControls>

        <StyledCard>
          {formError && <Alert variant="error" style={{ marginBottom: '16px'}}>{formError}</Alert>}
          {successMessage && <Alert variant="success" style={{ marginBottom: '16px'}}>{successMessage}</Alert>}

          <form onSubmit={handleSubmit}>
            {/* ... (chatbot configuration form fields: name, description, bot_type, etc.) ... */}
            <FormGroup>
              <Label htmlFor="name">Skolr Name</Label>
              <Input id="name" name="name" value={chatbot.name || ``} onChange={handleChange} required />
            </FormGroup>
            <FormGroup>
              <Label htmlFor="description">Description (optional)</Label>
              <Input id="description" name="description" value={chatbot.description || ``} onChange={handleChange} />
            </FormGroup>
            <FormGroup>
              <Label htmlFor="bot_type">Skolr Type</Label>
              <StyledSelect id="bot_type" name="bot_type" value={displayBotType} onChange={handleChange}>
                <option value="learning">Learning Skolr</option>
                <option value="assessment">Assessment Skolr</option>
                <option value="reading_room">Reading Room Skolr</option>
              </StyledSelect>
              <HelpText>
                {displayBotType === 'reading_room' 
                  ? `Reading Room Skolrs help students read documents. Upload a PDF for students to read alongside AI assistance.`
                  : `'Learning' Skolrs are for general interaction. 'Assessment' Skolrs can evaluate student responses based on criteria you define.`
                }</HelpText>
            </FormGroup>
            {displayBotType === 'assessment' && (
              <AssessmentCriteriaSection>
                <Label htmlFor="assessment_criteria_text">Define Assessment Rubric / Criteria</Label>
                <TextArea id="assessment_criteria_text" name="assessment_criteria_text" value={chatbot.assessment_criteria_text || ``} onChange={handleChange} rows={5} placeholder={`Clearly describe what the AI should assess. For example:\n1. Accuracy of answers to key concepts.\n2. Clarity of student's explanations.\n3. Use of specific examples or evidence.\n4. Critical thinking demonstrated.`} required={displayBotType === 'assessment'} />
                <HelpText>This text will guide the AI in evaluating student responses. Be specific.</HelpText>
                <RubricInfoText>{`For now, provide a text-based summary here. In the future, you may be able to upload structured rubric documents after saving.`}</RubricInfoText>
              </AssessmentCriteriaSection>
            )}
            <FormGroup>
              <Label htmlFor="system_prompt">{`System Prompt (AI's Persona & Core Instructions)`}</Label>
              <TextArea id="system_prompt" name="system_prompt" value={chatbot.system_prompt || ``} onChange={handleChange} required rows={displayBotType === 'assessment' ? 3 : 5} placeholder={ displayBotType === 'assessment' ? `e.g., 'You are an assessment assistant...'` : `e.g., 'You are a friendly history tutor...'` }/>
              <HelpText>{`This defines the AI's general behavior.`}{displayBotType === 'assessment' && ` For Assessment Skolrs, instructions from 'Assessment Criteria' are key.`}</HelpText>
            </FormGroup>

            <FormGroup>
              <Label htmlFor="welcome_message">Welcome Message (Optional)</Label>
              <TextArea
                id="welcome_message"
                name="welcome_message"
                value={chatbot.welcome_message || ''}
                onChange={handleChange}
                rows={3}
                placeholder="e.g., Hi there! I'm here to help you with [topic]. What would you like to discuss first?"
              />
              <HelpText>
                This message will be shown to students as the first message from the chatbot when they start a new chat. Leave blank for no welcome message.
              </HelpText>
            </FormGroup>

            <FormGroup>
              <Label htmlFor="model">AI Model (for Chatting)</Label>
              <StyledSelect id="model" name="model" value={chatbot.model || 'openai/gpt-4.1-mini'} onChange={handleChange}>
                  <option value="openai/gpt-4.1-mini">GPT-4.1 Mini</option>
                  <option value="google/gemini-2.5-flash-preview-05-20">Gemini 2.5 Flash</option>
                  <option value="nvidia/llama-3.1-nemotron-ultra-253b-v1">Llama-3.1</option>
                  <option value="x-ai/grok-3-mini-beta">Grok-3 Mini</option>
                  <option value="deepseek/deepseek-r1-0528">DeepSeek-R1</option>
              </StyledSelect>
              <HelpText>This model is used for the Skolr's direct replies to students. The assessment evaluation will use a dedicated model for consistent evaluation.</HelpText>
            </FormGroup>
            <FormGroup>
              <Label htmlFor="max_tokens">Max Tokens (Chat Response Length)</Label>
              <Input id="max_tokens" name="max_tokens" type="number" value={chatbot.max_tokens === null || chatbot.max_tokens === undefined ? `` : chatbot.max_tokens} onChange={handleChange} min="100" max="8000" placeholder="e.g., 1000" />
            </FormGroup>
            <FormGroup>
              <Label htmlFor="temperature">Temperature (Chat Creativity)</Label>
              <Input id="temperature" name="temperature" type="number" value={chatbot.temperature === null || chatbot.temperature === undefined ? `` : chatbot.temperature} onChange={handleChange} min="0" max="2" step="0.1" placeholder="e.g., 0.7"/>
               <HelpText>{`0.0 = most deterministic, 2.0 = most creative. Default is 0.7.`}</HelpText>
            </FormGroup>
            {(displayBotType === 'learning' || displayBotType === 'reading_room') && (
                <FormGroup>
                <Label htmlFor="enable_rag">
                  {displayBotType === 'reading_room' ? 'Knowledge Base (Optional)' : 'Knowledge Base (RAG)'}
                </Label>
                <CheckboxGroup>
                    <input id="enable_rag" name="enable_rag" type="checkbox" checked={!!chatbot.enable_rag} onChange={handleCheckboxChange} />
                    <span>
                      {displayBotType === 'reading_room' 
                        ? 'Enable Knowledge Base: Allow the AI to use supplementary materials for better support.'
                        : 'Enable RAG: Allow chatbot to use uploaded documents to answer questions.'}
                    </span>
                </CheckboxGroup>
                <HelpText>
                  {displayBotType === 'reading_room'
                    ? 'If enabled, you can add reference materials like teacher guides or answer keys below.'
                    : 'If enabled, this learning bot can use documents you upload below. (Save first to enable uploads if creating a new bot).'}
                </HelpText>
                </FormGroup>
            )}
            <ModernButton type="submit" variant="primary" disabled={saving || pageLoading} style={{ width: `100%`, marginTop: `16px` }}>
              {saving ? (isCreateMode ? 'Creating...' : 'Saving...') : (isCreateMode ? 'Create & Configure Chatbot' : 'Save Changes')}
            </ModernButton>
          </form>

          {/* Reading Document Section - for Reading Room Skolrs only */}
          {!isCreateMode && displayBotType === 'reading_room' && chatbot.chatbot_id && (
            <>
              <Divider />
              <SectionTitle>📖 Reading Document (Required)</SectionTitle>
              <Alert variant="info" style={{ marginBottom: '16px' }}>
                <strong>This is the main PDF that students will read.</strong> It appears on the left side of their screen.
              </Alert>
              
              <StyledCard>
                <ReadingDocumentUploader
                  chatbotId={chatbot.chatbot_id}
                  onUploadSuccess={() => {
                    setSuccessMessage('Reading document updated successfully!');
                    setTimeout(() => setSuccessMessage(null), 5000);
                  }}
                />
              </StyledCard>
            </>
          )}

          {/* Knowledge Base Section - for both Learning and Reading Room Skolrs */}
          {!isCreateMode && (displayBotType === 'learning' || displayBotType === 'reading_room') && chatbot.enable_rag && chatbot.chatbot_id && (
            <>
                <Divider />
                <SectionTitle>
                  {displayBotType === 'reading_room' ? '📚 Knowledge Base (Optional)' : 'Knowledge Base Documents'}
                </SectionTitle>
                
                {displayBotType === 'reading_room' && (
                  <HelpText style={{ marginBottom: '16px' }}>
                    Add supplementary materials like teacher guides, answer keys, or background information to help the AI provide better support for the reading document.
                  </HelpText>
                )}
                
                {/* Knowledge Base Summary */}
                {!docsLoading && documents.length > 0 && (
                  <KnowledgeBaseSummary>
                    <SummaryCard>
                      <SummaryNumber>{getDocumentStats().total}</SummaryNumber>
                      <SummaryLabel>Total Documents</SummaryLabel>
                    </SummaryCard>
                    
                    <SummaryCard $variant="success">
                      <SummaryNumber>{getDocumentStats().completed}</SummaryNumber>
                      <SummaryLabel>In Knowledge Base</SummaryLabel>
                    </SummaryCard>
                    
                    {getDocumentStats().processing > 0 && (
                      <SummaryCard $variant="warning">
                        <SummaryNumber>{getDocumentStats().processing}</SummaryNumber>
                        <SummaryLabel>Processing</SummaryLabel>
                      </SummaryCard>
                    )}
                    
                    {getDocumentStats().pending > 0 && (
                      <SummaryCard>
                        <SummaryNumber>{getDocumentStats().pending}</SummaryNumber>
                        <SummaryLabel>Pending</SummaryLabel>
                      </SummaryCard>
                    )}
                    
                    {getDocumentStats().error > 0 && (
                      <SummaryCard $variant="error">
                        <SummaryNumber>{getDocumentStats().error}</SummaryNumber>
                        <SummaryLabel>Failed</SummaryLabel>
                      </SummaryCard>
                    )}
                  </KnowledgeBaseSummary>
                )}
                
                {/* Enhanced upload components */}
                <EnhancedRagUploader
                    chatbotId={chatbot.chatbot_id}
                    onUploadSuccess={(newDocument) => {
                        if (newDocument) {
                            setDocuments(prev => [newDocument, ...prev]);
                        }
                        fetchDocumentsData(chatbot.chatbot_id!);
                    }}
                />
                <EnhancedRagScraper
                    chatbotId={chatbot.chatbot_id}
                    onScrapeSuccess={(newDocument) => {
                        if (newDocument) {
                            setDocuments(prev => [newDocument, ...prev]);
                        }
                        fetchDocumentsData(chatbot.chatbot_id!);
                    }}
                />
                
                {/* Document List and Status */}
                {viewingDocumentId && getViewingDocument() && (
                    <EmbeddingStatus
                      document={{ ...getViewingDocument()!, updated_at: getViewingDocument()!.updated_at ?? new Date().toISOString() }}
                      chatbotId={chatbot.chatbot_id!}
                      onRefresh={() => { 
                          setSuccessMessage("Document status refreshed."); 
                          fetchDocumentsData(chatbot.chatbot_id!); 
                        }}
                    />
                )}
                {docsLoading ? ( <LoadingStateContainer><LoadingSpinner size="small"/><span>Loading documents...</span></LoadingStateContainer> ) : (
                    <DocumentList
                      documents={documents.map(doc => ({ ...doc, updated_at: doc.updated_at ?? new Date().toISOString() }))}
                      onProcessDocument={handleProcessDocument}
                      onDeleteDocument={handleDeleteDocument}
                      onViewStatus={setViewingDocumentId}
                    />
                )}
            </>
          )}
          
          {/* Reference Materials Section removed for Reading Room Skolrs - not needed */}
          
          {isCreateMode && displayBotType === 'learning' && (
            <HelpText style={{marginTop: '20px', textAlign: 'center', fontStyle: 'italic'}}>Save this chatbot first to enable knowledge base document uploads.</HelpText>
          )}
          {isCreateMode && displayBotType === 'reading_room' && (
            <HelpText style={{marginTop: '20px', textAlign: 'center', fontStyle: 'italic'}}>Save this chatbot first to upload the reading document and any reference materials.</HelpText>
          )}
        </StyledCard>
      </ContentContainer>
    </PageWrapper>
  );
}