// src/app/teacher-dashboard/chatbots/[chatbotId]/knowledge-base/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Container, Card, Button, Alert } from '@/styles/StyledComponents';
import DocumentUploader from '@/components/teacher/DocumentUploader';
import DocumentList from '@/components/teacher/DocumentList';
import EmbeddingStatus from '@/components/teacher/EmbeddingStatus';
import type { Document as KnowledgeDocument } from '@/types/knowledge-base.types'; // Ensure path

const PageWrapper = styled.div`
  padding: ${({ theme }) => theme.spacing.xl} 0;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  flex-wrap: wrap; /* Allow wrapping on smaller screens */
  gap: ${({ theme }) => theme.spacing.md};
`;

const BackButton = styled(Button)`
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 14px;
    padding: 8px 16px;
    white-space: nowrap;
  }
`;

const Title = styled.h1`
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
  font-size: 1.7rem;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 1.3rem;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  text-align: center; // Center text if using p tag
`;

const Section = styled(Card)` // Use Card as base for sections
    margin-bottom: ${({ theme }) => theme.spacing.xl};
    h2 {
        margin-top: 0;
        margin-bottom: ${({ theme }) => theme.spacing.sm};
    }
    p {
        color: ${({ theme }) => theme.colors.textLight};
        font-size: 0.9rem;
        margin-bottom: ${({ theme }) => theme.spacing.lg};
    }
`;


export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [chatbotName, setChatbotName] = useState<string>('');
  const [loading, setLoading] = useState(true); // For initial page load (chatbot name + initial docs)
  const [docsLoading, setDocsLoading] = useState(false); // For subsequent document list refreshes
  const [pageError, setPageError] = useState<string | null>(null); // Renamed from error
  const [docsError, setDocsError] = useState<string | null>(null);
  const [viewingDocumentId, setViewingDocumentId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const chatbotId = params?.chatbotId as string;

  const fetchChatbotInfo = useCallback(async () => {
    if(!chatbotId) return;
    try {
      const { data: chatbot, error: chatbotError } = await supabase
        .from('chatbots')
        .select('name, teacher_id') // Also get teacher_id for auth check
        .eq('chatbot_id', chatbotId)
        .single();

      if (chatbotError) throw chatbotError;
      if (!chatbot) throw new Error("Chatbot not found.");

      // Authorization check: ensure current user owns this chatbot
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== chatbot.teacher_id) {
        throw new Error("You are not authorized to manage this chatbot's knowledge base.");
      }
      setChatbotName(chatbot.name);
    } catch (err) {
      console.error('Error fetching chatbot info:', err);
      setPageError(err instanceof Error ? err.message : 'Failed to fetch chatbot information');
    }
  }, [chatbotId, supabase]);

  const fetchDocuments = useCallback(async () => {
    if (!chatbotId) return;
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
    const loadInitialData = async () => {
        setLoading(true);
        await fetchChatbotInfo();
        await fetchDocuments();
        setLoading(false);
    }
    if (chatbotId) {
        loadInitialData();
    } else {
        setPageError("Chatbot ID is missing from the URL.");
        setLoading(false);
    }
  }, [chatbotId, fetchChatbotInfo, fetchDocuments]);
  
  // Set up polling for document updates to ensure we catch status changes
  useEffect(() => {
    if (!chatbotId || loading) return;
    
    // Set up a polling interval to refresh documents every 5 seconds
    const pollingInterval = setInterval(() => {
      if (documents.some(doc => doc.status === 'processing')) {
        console.log('Polling for document updates...');
        fetchDocuments();
      }
    }, 5000);
    
    return () => clearInterval(pollingInterval);
  }, [chatbotId, documents, fetchDocuments, loading]);

  const handleProcessDocument = async (documentId: string) => {
    setDocsError(null);
    setSuccessMessage(null);
    try {
      const response = await fetch(`/api/teacher/chatbots/${chatbotId}/vectorize`, { // Assuming vectorize endpoint remains nested
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to start document processing');
      }
      setSuccessMessage("Document processing started.");
      setDocuments(prevDocs => 
        prevDocs.map(doc => 
          doc.document_id === documentId ? { ...doc, status: 'processing' } : doc
        )
      );
      setViewingDocumentId(documentId);
    } catch (err) {
      console.error('Error processing document:', err);
      setDocsError(err instanceof Error ? err.message : 'Could not process document.');
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    setDocsError(null);
    setSuccessMessage(null);
    try {
      // << MODIFICATION: Use new API endpoint >>
      const response = await fetch(`/api/teacher/documents?documentId=${documentId}`, { 
          method: 'DELETE' 
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete document');
      }
      setSuccessMessage("Document deleted successfully.");
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
    return (
        <PageWrapper>
            <Container>
                <LoadingContainer><p>Loading knowledge base...</p></LoadingContainer>
            </Container>
        </PageWrapper>
    );
  }

  if (pageError) {
    return (
        <PageWrapper>
            <Container>
                <Alert variant="error" style={{marginTop: '20px'}}>{pageError}</Alert>
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
          <Title>Knowledge Base: {chatbotName || "Chatbot"}</Title>
          <BackButton 
            variant="outline" 
            onClick={() => router.push(`/teacher-dashboard/chatbots/${chatbotId}/edit`)} // Link back to edit page
          >
            ← Back to Chatbot Config
          </BackButton>
        </Header>
        
        {successMessage && <Alert variant="success" style={{marginBottom: '16px'}}>{successMessage}</Alert>}
        {docsError && <Alert variant="error" style={{marginBottom: '16px'}}>{docsError}</Alert>}
        
        <Section>
          <h2>Add Documents</h2>
          <p>Upload PDF, Word, or TXT files. These will be processed and made available for your chatbot to use when RAG is enabled.</p>
          <DocumentUploader 
            chatbotId={chatbotId} 
            onUploadSuccess={(newDocument) => {
                setSuccessMessage("Document uploaded successfully!");
                // Immediately add the new document to the list
                if (newDocument) {
                    setDocuments(prev => [newDocument, ...prev]);
                }
                // Also refresh the full list for consistency
                fetchDocuments();
            }}
          />
        </Section>
        
        <Section>
            <h2>Uploaded Documents</h2>
            {getViewingDocument() && (
              <EmbeddingStatus 
                document={getViewingDocument()!} 
                chatbotId={chatbotId}
                onRefresh={() => {
                    setSuccessMessage("Document status refreshed.");
                    fetchDocuments();
                }}
              />
            )}
            
            {docsLoading && documents.length === 0 ? ( // Show loading only if no docs are displayed yet
              <LoadingContainer><p>Loading documents...</p></LoadingContainer>
            ) : (
              <DocumentList 
                documents={documents}
                onProcessDocument={handleProcessDocument}
                onDeleteDocument={handleDeleteDocument}
                onViewStatus={setViewingDocumentId}
              />
            )}
        </Section>
      </Container>
    </PageWrapper>
  );
}