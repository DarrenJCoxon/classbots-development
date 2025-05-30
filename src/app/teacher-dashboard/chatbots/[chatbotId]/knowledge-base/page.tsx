// src/app/teacher-dashboard/chatbots/[chatbotId]/knowledge-base/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Container, Card } from '@/styles/StyledComponents';
import DocumentUploader from '@/components/teacher/DocumentUploader';
import DocumentListWithBatch from '@/components/teacher/DocumentListWithBatch';
import EmbeddingStatus from '@/components/teacher/EmbeddingStatus';
import EnhancedRagScraper from '@/components/teacher/EnhancedRagScraper';
import { GlassCard } from '@/components/shared/GlassCard';
import { ModernButton } from '@/components/shared/ModernButton';
import { PageTransition } from '@/components/shared/PageTransition';
import FastProcessingToggle from '@/components/teacher/FastProcessingToggle';
import type { Document as KnowledgeDocument } from '@/types/knowledge-base.types'; // Ensure path

const PageWrapper = styled.div`
  padding: ${({ theme }) => theme.spacing.xl} 0;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  min-height: 100vh;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.lg};
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(152, 93, 215, 0.1);
  box-shadow: 0 8px 32px rgba(152, 93, 215, 0.05);
`;

const BackButton = styled(ModernButton)`
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 14px;
    padding: 8px 16px;
    white-space: nowrap;
  }
`;

const Title = styled.h1`
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.magenta}
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  font-family: ${({ theme }) => theme.fonts.heading};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 1.5rem;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  text-align: center;
  color: ${({ theme }) => theme.colors.primary};
  font-family: ${({ theme }) => theme.fonts.body};
  font-size: 1.1rem;
`;

const Section = styled(GlassCard)`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  padding: ${({ theme }) => theme.spacing.xl};
  
  h2 {
    margin-top: 0;
    margin-bottom: ${({ theme }) => theme.spacing.md};
    color: ${({ theme }) => theme.colors.text};
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: 1.5rem;
    font-weight: 600;
  }
  
  p {
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.95rem;
    margin-bottom: ${({ theme }) => theme.spacing.lg};
    line-height: 1.6;
    font-family: ${({ theme }) => theme.fonts.body};
  }
`;

const ModernAlert = styled.div<{ $variant?: 'success' | 'error' | 'warning' }>`
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  border-radius: 12px;
  backdrop-filter: blur(10px);
  font-family: ${({ theme }) => theme.fonts.body};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  animation: fadeIn 0.3s ease-in-out;
  
  ${({ $variant, theme }) => {
    switch ($variant) {
      case 'success':
        return `
          background: rgba(76, 190, 243, 0.1);
          color: ${theme.colors.success};
          border: 1px solid rgba(76, 190, 243, 0.2);
        `;
      case 'error':
        return `
          background: rgba(254, 67, 114, 0.1);
          color: ${theme.colors.danger};
          border: 1px solid rgba(254, 67, 114, 0.2);
        `;
      case 'warning':
        return `
          background: rgba(200, 72, 175, 0.1);
          color: ${theme.colors.warning};
          border: 1px solid rgba(200, 72, 175, 0.2);
        `;
      default:
        return `
          background: rgba(152, 93, 215, 0.1);
          color: ${theme.colors.primary};
          border: 1px solid rgba(152, 93, 215, 0.2);
        `;
    }
  }}
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
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
  const [useFastMode, setUseFastMode] = useState<boolean>(false);
  // Removed grid view - list only
  
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const chatbotId = params?.chatbotId as string;

  const fetchChatbotInfo = useCallback(async () => {
    if(!chatbotId) return;
    try {
      // First check if we have a valid session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('Session error:', sessionError);
        // Try to refresh the session
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshedSession) {
          throw new Error('Authentication expired. Please log in again.');
        }
      }
      
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
      // Check if it's a JWT error and provide better guidance
      if (err instanceof Error && err.message.includes('JWT')) {
        setPageError('Your session has expired. Please refresh the page or log in again.');
        // Optionally redirect to login after a delay
        setTimeout(() => {
          router.push('/auth');
        }, 3000);
      } else {
        setPageError(err instanceof Error ? err.message : 'Failed to fetch chatbot information');
      }
    }
  }, [chatbotId, supabase, router]);

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
        body: JSON.stringify({ documentId, fastMode: useFastMode }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to start document processing');
      }
      const result = await response.json();
      setSuccessMessage(`Document processing started in ${result.mode || 'standard'} mode.`);
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

  const handleBatchProcessDocuments = async (documentIds: string[]) => {
    setDocsError(null);
    setSuccessMessage(null);
    try {
      const response = await fetch(`/api/teacher/chatbots/${chatbotId}/vectorize-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentIds, fastMode: useFastMode }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to start batch processing');
      }
      const result = await response.json();
      setSuccessMessage(`Started processing ${result.documentsQueued} documents in ${result.mode} mode.`);
      // Update documents to processing state
      setDocuments(prevDocs => 
        prevDocs.map(doc => 
          documentIds.includes(doc.document_id) ? { ...doc, status: 'processing' } : doc
        )
      );
    } catch (err) {
      console.error('Error batch processing documents:', err);
      setDocsError(err instanceof Error ? err.message : 'Could not process documents.');
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
                <ModernAlert $variant="error" style={{marginTop: '20px'}}>{pageError}</ModernAlert>
                <ModernButton onClick={() => router.push('/teacher-dashboard/chatbots')} style={{marginTop: '16px'}}>
                    Back to Chatbots
                </ModernButton>
            </Container>
        </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageTransition>
        <Container>
        <Header>
          <Title>Knowledge Base: {chatbotName || "Chatbot"}</Title>
          <BackButton 
            variant="ghost" 
            size="medium"
            onClick={() => router.push(`/teacher-dashboard/chatbots/${chatbotId}/edit`)}
          >
            ← Back to Chatbot Config
          </BackButton>
        </Header>
        
        {successMessage && <ModernAlert $variant="success">{successMessage}</ModernAlert>}
        {docsError && <ModernAlert $variant="error">{docsError}</ModernAlert>}
        
        <Section variant="light" hoverable={undefined}>
          <h2>Add Content to Knowledge Base</h2>
          <p>Add content by uploading documents or scraping webpages. This content will be processed and made available for your chatbot to use when RAG is enabled.</p>
          
          <EnhancedRagScraper
            chatbotId={chatbotId}
            onScrapeSuccess={(newDocument) => {
                // Immediately add the new document to the list if provided
                if (newDocument) {
                    setDocuments(prev => [newDocument, ...prev]);
                }
                // Also refresh the full list for consistency
                fetchDocuments();
            }}
          />
          
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
        
        <Section variant="light" hoverable={undefined}>
            <h2>Uploaded Documents</h2>
            <FastProcessingToggle 
              checked={useFastMode} 
              onChange={setUseFastMode} 
            />
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
              <DocumentListWithBatch 
                documents={documents}
                onProcessDocument={handleProcessDocument}
                onDeleteDocument={handleDeleteDocument}
                onViewStatus={setViewingDocumentId}
                onBatchProcess={handleBatchProcessDocuments}
                fastMode={useFastMode}
              />
            )}
        </Section>
      </Container>
      </PageTransition>
    </PageWrapper>
  );
}