// src/app/teacher-dashboard/chatbots/[chatbotId]/edit/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import styled from 'styled-components';
import {
    Container, Card, Button, FormGroup, Label, Input, TextArea, Alert,
    Select as StyledSelect
} from '@/styles/StyledComponents';
import { createClient } from '@/lib/supabase/client';
import DocumentUploader from '@/components/teacher/DocumentUploader';
import DocumentList from '@/components/teacher/DocumentList';
import EmbeddingStatus from '@/components/teacher/EmbeddingStatus';
// MODIFIED: Import CreateChatbotPayload
import type { Chatbot, Document as KnowledgeDocument, BotTypeEnum as BotType, CreateChatbotPayload } from '@/types/database.types';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

const PageWrapper = styled.div`
  padding: ${({ theme }) => theme.spacing.xl} 0;
  min-height: 100vh;
`;

const HeaderControls = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const BackButton = styled(Button)`
  margin-right: ${({ theme }) => theme.spacing.lg};
`;

const MainTitle = styled.h1`
    font-size: 1.8rem;
    color: ${({ theme }) => theme.colors.text};
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

const LoadingCard = styled(Card)`
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

const initialChatbotState: Chatbot = {
    chatbot_id: '',
    name: '',
    description: '',
    system_prompt: `You are a helpful AI assistant.`,
    teacher_id: '',
    model: 'x-ai/grok-3-mini-beta',
    max_tokens: 1000,
    temperature: 0.7,
    enable_rag: false,
    bot_type: 'learning',
    assessment_criteria_text: null,
    welcome_message: null, // This was already correctly added by you
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

    // This payload is for the direct Supabase client .update() call
    const supabaseUpdatePayload: Partial<Omit<Chatbot, 'chatbot_id' | 'created_at' | 'updated_at' | 'teacher_id'>> & { teacher_id?: string } = {
        name: chatbot.name,
        description: chatbot.description || undefined,
        system_prompt: chatbot.system_prompt,
        // teacher_id: currentUserId, // Not strictly needed for update if RLS is correct, but doesn't harm
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
            // Construct the payload for the API POST, matching CreateChatbotPayload
            const apiCreatePayload: CreateChatbotPayload = {
                name: chatbot.name,
                system_prompt: chatbot.system_prompt,
                description: chatbot.description || undefined,
                model: chatbot.model || 'qwen/qwen3-235b-a22b', // Ensure model has a default if chatbot.model is undefined
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

            setSuccessMessage('Chatbot created successfully! You can now continue configuring or manage documents if RAG is enabled.');
            const newBotData = responseData as Chatbot; // API returns the full Chatbot object
            setChatbot(newBotData); // Update local state with the full new bot data
            setIsCreateMode(false);
            router.replace(`/teacher-dashboard/chatbots/${newBotData.chatbot_id}/edit`, { scroll: false });

        } else {
            // Use supabaseUpdatePayload for the direct Supabase client update
            // We don't need to spread teacher_id here as it's part of the .eq() condition
            const updateDataForSupabase = { ...supabaseUpdatePayload };
            delete updateDataForSupabase.teacher_id; // teacher_id is for eq, not update payload itself

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

    if (name === "max_tokens" || name === "temperature") {
        processedValue = value === `` ? null : Number(value);
    } else if (name === "bot_type") {
        processedValue = value as BotType;
    } else if (name === "enable_rag") { // Checkbox handled by handleCheckboxChange
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
    } catch (err) { setDocsError(err instanceof Error ? err.message : 'Could not delete document.'); }
  };

  const getViewingDocument = (): KnowledgeDocument | null => {
    if (!viewingDocumentId) return null;
    return documents.find(doc => doc.document_id === viewingDocumentId) || null;
  };

  if (pageLoading) {
    return ( <PageWrapper><Container><LoadingCard><LoadingSpinner size="large" /><p>{`Loading configuration page...`}</p></LoadingCard></Container></PageWrapper> );
  }
  if (!isCreateMode && !chatbot.chatbot_id && !pageLoading) {
     return ( <PageWrapper><Container><Alert variant="error">{formError || `Chatbot data could not be initialized. Please go back and try again.`}</Alert></Container></PageWrapper> );
  }

  const displayBotType = chatbot.bot_type || 'learning';

  return (
    <PageWrapper>
      <Container>
        <HeaderControls>
          <MainTitle>{isCreateMode ? `Create New Chatbot` : `Edit Chatbot: ${chatbot.name}`}</MainTitle>
          <BackButton variant="outline" onClick={() => router.push('/teacher-dashboard/chatbots')}>
            {`<`} Back to Chatbots
          </BackButton>
        </HeaderControls>

        <Card>
          {formError && <Alert variant="error" style={{ marginBottom: '16px'}}>{formError}</Alert>}
          {successMessage && <Alert variant="success" style={{ marginBottom: '16px'}}>{successMessage}</Alert>}

          <form onSubmit={handleSubmit}>
            <FormGroup>
              <Label htmlFor="name">Chatbot Name</Label>
              <Input id="name" name="name" value={chatbot.name || ``} onChange={handleChange} required />
            </FormGroup>
            <FormGroup>
              <Label htmlFor="description">Description (optional)</Label>
              <Input id="description" name="description" value={chatbot.description || ``} onChange={handleChange} />
            </FormGroup>
            <FormGroup>
              <Label htmlFor="bot_type">Bot Type</Label>
              <StyledSelect id="bot_type" name="bot_type" value={displayBotType} onChange={handleChange}>
                <option value="learning">Learning Bot</option>
                <option value="assessment">Assessment Bot</option>
              </StyledSelect>
              <HelpText>{`'Learning' bots are for general interaction. 'Assessment' bots can evaluate student responses based on criteria you define.`}</HelpText>
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
              <HelpText>{`This defines the AI's general behavior.`}{displayBotType === 'assessment' && ` For Assessment Bots, instructions from 'Assessment Criteria' are key.`}</HelpText>
            </FormGroup>

            {/* Welcome Message Field - THIS IS THE NEWLY ADDED FIELD */}
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
              <StyledSelect id="model" name="model" value={chatbot.model || 'qwen/qwen3-235b-a22b'} onChange={handleChange}>
                  <option value="x-ai/grok-3-mini-beta">Grok 3 Mini Beta</option>
                  <option value="qwen/qwen3-235b-a22b">Qwen3 235B A22B</option>
                  <option value="google/gemini-2.5-flash-preview">Gemini 2.5 Flash Preview</option>
              </StyledSelect>
              <HelpText>This model is used for general chat. Assessment evaluation will use Qwen3 235B.</HelpText>
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
            {displayBotType === 'learning' && (
                <FormGroup>
                <Label htmlFor="enable_rag">Knowledge Base (RAG)</Label>
                <CheckboxGroup>
                    <input id="enable_rag" name="enable_rag" type="checkbox" checked={!!chatbot.enable_rag} onChange={handleCheckboxChange} />
                    <span>Enable RAG: Allow chatbot to use uploaded documents to answer questions.</span>
                </CheckboxGroup>
                <HelpText>If enabled, this learning bot can use documents you upload below. (Save first to enable uploads if creating a new bot).</HelpText>
                </FormGroup>
            )}
            <Button type="submit" disabled={saving || pageLoading} style={{ width: `100%`, marginTop: `16px` }}>
              {saving ? (isCreateMode ? 'Creating...' : 'Saving...') : (isCreateMode ? 'Create & Configure Chatbot' : 'Save Changes')}
            </Button>
          </form>

          {!isCreateMode && displayBotType === 'learning' && chatbot.enable_rag && chatbot.chatbot_id && (
            <>
                <Divider />
                <SectionTitle>Knowledge Base Documents (for RAG)</SectionTitle>
                <HelpText>{`Upload PDF, Word, or TXT files. These will be processed and embedded for this chatbot's knowledge base.`}</HelpText>
                {docsError && <Alert variant="error">{docsError}</Alert>}
                <DocumentUploader chatbotId={chatbot.chatbot_id} onUploadSuccess={() => { setSuccessMessage("Document uploaded. Refreshing list..."); fetchDocumentsData(chatbot.chatbot_id!); }} />
                {viewingDocumentId && getViewingDocument() && (
                    <EmbeddingStatus
                      document={{ ...getViewingDocument()!, updated_at: getViewingDocument()!.updated_at ?? new Date().toISOString() }}
                      chatbotId={chatbot.chatbot_id!}
                      onRefresh={() => { setSuccessMessage("Document status refreshed."); fetchDocumentsData(chatbot.chatbot_id!); }}
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
          {isCreateMode && displayBotType === 'learning' && (
            <HelpText style={{marginTop: '20px', textAlign: 'center', fontStyle: 'italic'}}>Save this chatbot first to enable RAG document uploads.</HelpText>
          )}
        </Card>
      </Container>
    </PageWrapper>
  );
}