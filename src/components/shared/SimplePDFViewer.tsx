// Simple PDF viewer for Reading Room documents
'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Alert } from '@/styles/StyledComponents';
import LoadingSpinner from './LoadingSpinner';

const ViewerContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: #f5f5f5;
  border-radius: 8px;
  overflow: visible;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    min-height: 100%;
  }
`;

const StyledIframe = styled.iframe`
  width: 100%;
  height: 100%;
  border: none;
  background: white;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    min-height: 480px; /* Typical PDF page height */
    height: auto;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 1rem;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
  
  h3 {
    color: ${({ theme }) => theme.colors.text};
    margin-bottom: 0.5rem;
  }
  
  p {
    margin: 0;
  }
`;

interface SimplePDFViewerProps {
  documentUrl: string | null;
  loading?: boolean;
  error?: string | null;
}

export default function SimplePDFViewer({ documentUrl, loading = false, error = null }: SimplePDFViewerProps) {
  const [iframeError, setIframeError] = useState(false);

  useEffect(() => {
    setIframeError(false);
  }, [documentUrl]);

  if (loading) {
    return (
      <LoadingContainer>
        <LoadingSpinner size="large" />
        <p>Loading document...</p>
      </LoadingContainer>
    );
  }

  if (error) {
    return (
      <ViewerContainer>
        <Alert variant="error">{error}</Alert>
      </ViewerContainer>
    );
  }

  if (!documentUrl) {
    return (
      <EmptyState>
        <h3>No Reading Document</h3>
        <p>The teacher hasn't uploaded a reading document yet.</p>
        <p style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
          Please check back later or contact your teacher.
        </p>
      </EmptyState>
    );
  }

  if (iframeError) {
    return (
      <ViewerContainer>
        <Alert variant="error">
          Failed to load the PDF document. 
          <br />
          <a href={documentUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
            Click here to open in a new tab
          </a>
        </Alert>
      </ViewerContainer>
    );
  }

  // Clean URL and add PDF embed parameters to hide browser chrome
  const cleanUrl = documentUrl.split('#')[0];
  const embedUrl = `${cleanUrl}#view=FitH&toolbar=0&navpanes=0`;
  
  console.log('[SimplePDFViewer] Loading PDF from:', embedUrl);

  return (
    <ViewerContainer>
      <StyledIframe
        src={embedUrl}
        title="Reading Document"
        loading="lazy"
        onError={() => {
          console.error('[SimplePDFViewer] Failed to load PDF');
          setIframeError(true);
        }}
      />
    </ViewerContainer>
  );
}