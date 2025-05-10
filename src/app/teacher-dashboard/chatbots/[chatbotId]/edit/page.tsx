// src/app/teacher-dashboard/chatbots/[chatbotId]/edit/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import styled from 'styled-components';
import { 
    Container, Card, Button, FormGroup, Label, Input, TextArea, Alert, 
    Select as StyledSelect // Renamed to avoid conflict if you use HTMLSelectElement directly
} from '@/styles/StyledComponents';
import { createClient } from '@/lib/supabase/client';
import DocumentUploader from '@/components/teacher/DocumentUploader';
import DocumentList from '@/components/teacher/DocumentList';
import EmbeddingStatus from '@/components/teacher/EmbeddingStatus';
import type { Chatbot } from '@/types/database.types';
import type { Document as KnowledgeDocument } from '@/types/knowledge-base.types'; // Ensure path

const PageWrapper = styled.div`
  padding: ${({ theme }) => theme.spacing.xl} 0;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const BackButton = styled(Button)`
  margin-right: ${({ theme }) => theme.spacing.lg};
`;

const EditForm = styled.form`
  width: 100%;
  /* max-width: 600px; // Let Card handle max-width if needed */
  /* margin: 0 auto; */
`;

const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.sm};
  input[type="checkbox"] { // Style checkbox
    width: 1.15em;
    height: 1.15em;
    cursor: pointer;
  }
`;

const HelpText = styled.p`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.textMuted};
  margin-top: ${({ theme }) => theme.spacing.xs}; // Reduced margin
  margin-bottom: ${({ theme }) => theme.spacing.md}; // Add bottom margin
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  margin: ${({ theme }) => theme.spacing.xl} 0;
`;

const SectionTitle = styled.h3`
  margin-top: ${({ theme }) => theme.spacing.lg}; // Add top margin for sections
  margin-bottom: ${({ theme }) => theme.spacing.md};
  font-size: 1.3rem; // Slightly smaller
`;

const LoadingCard = styled(Card)`
    text-align: center;
    padding: ${({ theme }) => theme.spacing.xl};
`;

export default function EditChatbotPage() { // Renamed component
  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [docsLoading, setDocsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null); // Renamed from error
  const [docsError, setDocsError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [viewingDocumentId, setViewingDocumentId] = useState<string | null>(null);
  
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const chatbotId = params?.chatbotId as string;

  const fetchChatbot = useCallback(async () => {
    if (!chatbotId) {
        setFormError("Chatbot ID missing from URL.");
        setLoading(false);
        return;
    }
    setLoading(true);
    setFormError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth'); // Redirect if not authenticated
        return;
      }

      const { data, error } = await supabase
        .from('chatbots')
        .select('*')
        .eq('chatbot_id', chatbotId)
        .eq('teacher_id', user.id) // Ensure teacher owns the chatbot
        .single();

      if (error) throw error;
      if (!data) throw new Error('Chatbot not found or you do not have permission.');
      
      setChatbot(data);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to load chatbot data.');
    } finally {
      setLoading(false);
    }
  }, [chatbotId, supabase, router]);

  const fetchDocuments = useCallback(async () => {
    if (!chatbotId) return; // Don't fetch if no chatbotId
    setDocsLoading(true);
    setDocsError(null);
    try {
      // << MODIFICATION: Use new API endpoint >>
      const response = await fetch(`/api/teacher/documents?chatbotId=${chatbotId}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to fetch documents');
      }
      const data: KnowledgeDocument[] = await response.json();
      setDocuments(data);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setDocsError(err instanceof Error ? err.message : 'Could not load documents.');
    } finally {
      setDocsLoading(false);
    }
  }, [chatbotId]);

  useEffect(() => {
    fetchChatbot();
    fetchDocuments();
  }, [fetchChatbot, fetchDocuments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatbot) return;

    setSaving(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const { error: updateError } = await supabase
        .from('chatbots')
        .update({
          name: chatbot.name,
          description: chatbot.description,
          system_prompt: chatbot.system_prompt,
          model: chatbot.model,
          max_tokens: chatbot.max_tokens,
          temperature: chatbot.temperature,
          enable_rag: chatbot.enable_rag || false, // Ensure boolean
          updated_at: new Date().toISOString(),
        })
        .eq('chatbot_id', chatbot.chatbot_id);

      if (updateError) throw updateError;
      
      setSuccessMessage('Chatbot updated successfully!');
      // Optionally redirect or give other feedback
      // router.push('/teacher-dashboard/chatbots'); 
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update chatbot.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (!chatbot) return;

    let processedValue: string | number | undefined = value;
    if (name === 'max_tokens') {
        processedValue = value === '' ? undefined : Number(value);
    } else if (name === 'temperature') {
        processedValue = value === '' ? undefined : Number(value);
    }


    setChatbot(prev => (prev ? {
      ...prev,
      [name]: processedValue,
    } : null));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    if (!chatbot) return;
    setChatbot(prev => (prev ? { ...prev, [name]: checked } : null));
  };

  const handleProcessDocument = async (documentId: string) => {
    setDocsError(null);
    try {
      // This API endpoint might also need flattening if you want consistency
      // For now, assuming it remains /api/teacher/chatbots/[chatbotId]/vectorize
      const response = await fetch(`/api/teacher/chatbots/${chatbotId}/vectorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to start document processing');
      }
      // Update local document status optimistically or re-fetch
      setDocuments(prevDocs => 
        prevDocs.map(doc => 
          doc.document_id === documentId 
            ? { ...doc, status: 'processing' } 
            : doc
        )
      );
      setViewingDocumentId(documentId); // Show status for this document
    } catch (err) {
      console.error('Error processing document:', err);
      setDocsError(err instanceof Error ? err.message : 'Could not process document.');
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    setDocsError(null);
    try {
      // << MODIFICATION: Use new API endpoint >>
      const response = await fetch(`/api/teacher/documents?documentId=${documentId}`, { 
        method: 'DELETE' 
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete document');
      }
      setDocuments(prevDocs => prevDocs.filter(doc => doc.document_id !== documentId));
      if (viewingDocumentId === documentId) {
        setViewingDocumentId(null);
      }
    } catch (err) {
      console.error('Error deleting document:', err);
      setDocsError(err instanceof Error ? err.message : 'Could not delete document.');
    }
  };

  const getViewingDocument = (): KnowledgeDocument | null => {
    if (!viewingDocumentId) return null;
    return documents.find(doc => doc.document_id === viewingDocumentId) || null;
  };


  if (loading) {
    return <PageWrapper><Container><LoadingCard>Loading chatbot details...</LoadingCard></Container></PageWrapper>;
  }

  if (!chatbot) {
    return (
      <PageWrapper>
        <Container>
          <Alert variant="error" style={{marginTop: '20px'}}>
            {formError || 'Chatbot not found or you do not have access.'}
          </Alert>
          <Button onClick={() => router.push('/teacher-dashboard/chatbots')} style={{marginTop: '16px'}}>
            Back to Chatbots
          </Button>
        </Container>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <Container>
        <Header>
          <BackButton variant="outline" onClick={() => router.push('/teacher-dashboard/chatbots')}>
            ← Back to Chatbots
          </BackButton>
        </Header>

        <Card>
          <h2 style={{ marginBottom: '24px' }}>Edit Chatbot: {chatbot.name}</h2>
          
          {formError && <Alert variant="error">{formError}</Alert>}
          {successMessage && <Alert variant="success">{successMessage}</Alert>}

          <EditForm onSubmit={handleSubmit}>
            <FormGroup>
              <Label htmlFor="name">Chatbot Name</Label>
              <Input id="name" name="name" value={chatbot.name} onChange={handleChange} required />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="description">Description (optional)</Label>
              <Input id="description" name="description" value={chatbot.description || ''} onChange={handleChange} />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="system_prompt">System Prompt</Label>
              <TextArea id="system_prompt" name="system_prompt" value={chatbot.system_prompt} onChange={handleChange} required rows={5} />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="model">AI Model</Label>        
              <StyledSelect id="model" name="model" value={chatbot.model || 'x-ai/grok-3-mini-beta'} onChange={handleChange}>
                  <option value="x-ai/grok-3-mini-beta">Grok 3 Mini Beta (Paid)</option>
                  <option value="qwen/qwen3-235b-a22b">Qwen3 235B A22B (Free)</option>
                  <option value="google/gemini-2.5-flash-preview">Gemini 2.5 Flash Preview</option>
                  {/* Add other models as they become available */}
              </StyledSelect>
            </FormGroup>

            <FormGroup>
              <Label htmlFor="max_tokens">Max Tokens (optional, default: 1000)</Label>
              <Input id="max_tokens" name="max_tokens" type="number" value={chatbot.max_tokens || ''} onChange={handleChange} min="100" max="8000" placeholder="e.g., 1000" />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="temperature">Temperature (optional, 0-2, default: 0.7)</Label>
              <Input id="temperature" name="temperature" type="number" value={chatbot.temperature || ''} onChange={handleChange} min="0" max="2" step="0.1" placeholder="e.g., 0.7"/>
            </FormGroup>

            <FormGroup>
              <Label htmlFor="enable_rag">Knowledge Base (RAG)</Label>
              <CheckboxGroup>
                <input id="enable_rag" name="enable_rag" type="checkbox" checked={chatbot.enable_rag || false} onChange={handleCheckboxChange} />
                <span>Enable knowledge base for this chatbot</span>
              </CheckboxGroup>
              <HelpText>
                If enabled, the chatbot can use documents you upload to answer questions. 
                This requires documents to be processed and embedded.
              </HelpText>
            </FormGroup>

            <Button type="submit" disabled={saving} style={{ width: '100%' }}>
              {saving ? 'Saving...' : 'Save Chatbot Changes'}
            </Button>
          </EditForm>
          
          {chatbot.enable_rag && (
            <>
                <Divider />
                <SectionTitle>Knowledge Base Documents</SectionTitle>
                <p style={{color: "#555", fontSize: "0.9rem", marginBottom: "16px"}}>
                    Upload PDF, Word, or TXT files. These will be processed and embedded to be used by your chatbot.
                </p>
                
                {docsError && <Alert variant="error">{docsError}</Alert>}

                <DocumentUploader 
                    chatbotId={chatbotId} 
                    onUploadSuccess={() => {
                        setSuccessMessage("Document uploaded. Refreshing list...");
                        fetchDocuments(); // Re-fetch documents after successful upload
                    }} 
                />
                
                {getViewingDocument() && (
                    <EmbeddingStatus 
                    document={getViewingDocument()!} 
                    chatbotId={chatbotId}
                    onRefresh={() => {
                        setSuccessMessage("Document status refreshed.");
                        fetchDocuments();
                    }} // Re-fetch documents when status might have changed
                    />
                )}
                
                {docsLoading ? (
                    <p>Loading documents...</p>
                ) : (
                    <DocumentList 
                    documents={documents}
                    onProcessDocument={handleProcessDocument}
                    onDeleteDocument={handleDeleteDocument}
                    onViewStatus={setViewingDocumentId}
                    />
                )}
            </>
          )}
        </Card>
      </Container>
    </PageWrapper>
  );
}