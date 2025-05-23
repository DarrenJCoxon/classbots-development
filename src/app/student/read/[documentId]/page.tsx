'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import styled from 'styled-components';
import ReliablePDFViewer from '@/components/shared/ReliablePDFViewer';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { Alert } from '@/styles/StyledComponents';

const PageContainer = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.background};
`;

const Header = styled.div`
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.backgroundCard};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.5rem;
  color: ${({ theme }) => theme.colors.text};
`;

const BackLink = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;
  text-decoration: underline;
  padding: ${({ theme }) => theme.spacing.xs} 0;
  
  &:hover {
    color: ${({ theme }) => theme.colors.primaryDark};
  }
`;

const ContentArea = styled.div`
  flex: 1;
  display: flex;
  padding: ${({ theme }) => theme.spacing.lg};
  gap: ${({ theme }) => theme.spacing.lg};
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;

const ReaderContainer = styled.div`
  flex: 2;
  min-height: 0;
  animation: fadeIn 0.6s ease-out;
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const ChatContainer = styled.div`
  flex: 1;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: ${({ theme }) => theme.borderRadius.large};
  padding: ${({ theme }) => theme.spacing.lg};
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  animation: slideIn 0.6s ease-out 0.2s both;
  
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  }
`;

const LoadingContainer = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const ErrorContainer = styled.div`
  flex: 1;
  padding: ${({ theme }) => theme.spacing.xl};
`;

interface DocumentData {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
}

export default function StudentReadPage() {
  const params = useParams();
  const documentId = params?.documentId as string;
  
  const [document, setDocument] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    const fetchDocument = async () => {
      if (!documentId) {
        setError('No document ID provided');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/student/document/${documentId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch document');
        }

        setDocument(data.document);
        setError(null);
      } catch (err) {
        console.error('Error fetching document:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [documentId]);

  const handlePageChange = (pageNumber: number, totalPages: number) => {
    setCurrentPage(pageNumber);
    setTotalPages(totalPages);
  };

  const handleDocumentLoad = (totalPages: number) => {
    setTotalPages(totalPages);
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingContainer>
          <LoadingSpinner />
        </LoadingContainer>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <ErrorContainer>
          <Alert variant="error">
            <strong>Error loading document:</strong> {error}
          </Alert>
          <BackLink onClick={() => window.history.back()}>
            ← Back to Dashboard
          </BackLink>
        </ErrorContainer>
      </PageContainer>
    );
  }

  if (!document) {
    return (
      <PageContainer>
        <ErrorContainer>
          <Alert variant="error">
            Document not found or you don't have access to it.
          </Alert>
          <BackLink onClick={() => window.history.back()}>
            ← Back to Dashboard
          </BackLink>
        </ErrorContainer>
      </PageContainer>
    );
  }

  // Check if it's a PDF document
  if (document.type !== 'pdf') {
    return (
      <PageContainer>
        <ErrorContainer>
          <Alert variant="error">
            This document type ({document.type}) is not supported for reading view yet. 
            PDF documents only.
          </Alert>
          <BackLink onClick={() => window.history.back()}>
            ← Back to Dashboard
          </BackLink>
        </ErrorContainer>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Header>
        <div>
          <BackLink onClick={() => window.history.back()}>
            ← Back to Dashboard
          </BackLink>
          <Title>Reading: {document.name}</Title>
        </div>
        {totalPages > 0 && (
          <div style={{ fontSize: '0.9rem', color: '#666' }}>
            Page {currentPage} of {totalPages}
          </div>
        )}
      </Header>

      <ContentArea>
        <ReaderContainer>
          <ReliablePDFViewer
            documentUrl={document.url}
            documentName={document.name}
            onPageChange={handlePageChange}
            onDocumentLoad={handleDocumentLoad}
          />
        </ReaderContainer>

        <ChatContainer>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤖</div>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>AI Study Assistant</h3>
            <p style={{ color: '#666', fontSize: '0.95rem', lineHeight: '1.6' }}>
              Ask questions about what you're reading and get instant help understanding the content.
            </p>
            <div style={{ 
              marginTop: '2rem',
              padding: '1rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px',
              color: 'white',
              fontSize: '0.85rem'
            }}>
              💡 Coming Soon: Interactive AI Chat
            </div>
          </div>
        </ChatContainer>
      </ContentArea>
    </PageContainer>
  );
}