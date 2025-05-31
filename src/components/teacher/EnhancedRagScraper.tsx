// src/components/teacher/EnhancedRagScraper.tsx
'use client';

import { useState } from 'react';
import styled from 'styled-components';
import { Input, FormGroup, Label } from '@/styles/StyledComponents';
import { ModernButton } from '@/components/shared/ModernButton';
import type { Document as KnowledgeDocument } from '@/types/knowledge-base.types';

// Styled components for the web scraper
const ScraperContainer = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 32px;
  border: 1px solid rgba(152, 93, 215, 0.1);
  box-shadow: 0 8px 32px rgba(152, 93, 215, 0.05);
`;

const SectionTitle = styled.h3`
  font-size: 20px;
  font-weight: 700;
  font-family: ${({ theme }) => theme.fonts.heading};
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.magenta}
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const FileTypeInfo = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.875rem;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  font-family: ${({ theme }) => theme.fonts.body};
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 12px;
  background: rgba(152, 93, 215, 0.1);
  border-radius: 20px;
  margin-top: ${({ theme }) => theme.spacing.md};
  overflow: hidden;
  border: 1px solid rgba(152, 93, 215, 0.1);
`;

const Progress = styled.div<{ $progress: number }>`
  height: 100%;
  width: ${props => props.$progress}%;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.magenta}
  );
  transition: width 0.3s ease;
  box-shadow: 0 0 10px rgba(152, 93, 215, 0.3);
`;

const StatusText = styled.div`
  font-size: 0.875rem;
  margin-top: ${({ theme }) => theme.spacing.sm};
  color: ${({ theme }) => theme.colors.primary};
  font-family: ${({ theme }) => theme.fonts.body};
  font-weight: 600;
`;

const ModernAlert = styled.div<{ $variant?: 'success' | 'error' }>`
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: 12px;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  backdrop-filter: blur(10px);
  font-family: ${({ theme }) => theme.fonts.body};
  animation: fadeIn 0.3s ease-in-out;
  
  ${({ $variant, theme }) => {
    switch ($variant) {
      case 'success':
        return `
          background: rgba(34, 197, 94, 0.1);
          color: ${theme.colors.green};
          border: 1px solid rgba(34, 197, 94, 0.2);
        `;
      case 'error':
        return `
          background: rgba(239, 68, 68, 0.1);
          color: ${theme.colors.red};
          border: 1px solid rgba(239, 68, 68, 0.2);
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

const StyledFormGroup = styled(FormGroup)`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const StyledLabel = styled(Label)`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  font-family: ${({ theme }) => theme.fonts.heading};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.875rem;
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const StyledInput = styled(Input)`
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(152, 93, 215, 0.2);
  backdrop-filter: blur(10px);
  transition: all 0.2s ease;
  font-family: ${({ theme }) => theme.fonts.body};
  
  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 2px rgba(152, 93, 215, 0.1);
  }
  
  &::placeholder {
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

interface EnhancedRagScraperProps {
  chatbotId: string;
  onScrapeSuccess?: (document?: KnowledgeDocument) => void;
}

export default function EnhancedRagScraper({ chatbotId, onScrapeSuccess }: EnhancedRagScraperProps) {
  const [url, setUrl] = useState('');
  const [scraping, setScraping] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // Store document ID for internal processing only (not displayed to user)
  const [status, setStatus] = useState<string>('');

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_urlError) {
      return false;
    }
  };

  const handleScrape = async () => {
    if (!url.trim() || !chatbotId) {
      setError(`Missing required data: ${!url.trim() ? 'No URL entered' : 'No Skolr ID provided'}`);
      return;
    }
    
    if (!validateUrl(url)) {
      setError('Please enter a valid URL starting with http:// or https://');
      return;
    }
    
    console.log(`Scraping URL for chatbot ID: ${chatbotId}`);
    
    setScraping(true);
    setError(null);
    setSuccessMessage(null);
    setProgress(0);
    setStatus('Scraping webpage content...');
    
    try {
      // Create form data with URL information
      const formData = new FormData();
      formData.append('url', url.trim());
      formData.append('chatbotId', chatbotId);
      
      // First, scrape the webpage using FormData
      const scrapeResponse = await fetch('/api/teacher/documents', {
        method: 'POST',
        body: formData,
      });
      
      if (!scrapeResponse.ok) {
        const data = await scrapeResponse.json().catch(() => ({}));
        console.error('Scraping error response:', data);
        throw new Error(data.error || `Failed to scrape webpage (Status: ${scrapeResponse.status})`);
      }
      
      const scrapeData = await scrapeResponse.json();
      console.log('Scraping response data:', scrapeData);
      
      // Get document ID from the response - could be in different formats
      const scrapedDocumentId = 
        scrapeData.documentId || 
        (scrapeData.document && scrapeData.document.document_id);
      
      if (!scrapedDocumentId) {
        console.error('Unexpected response format:', scrapeData);
        throw new Error('No document ID returned from scraping');
      }
      
      // Store document ID for processing
      const documentIdForVectorizing = scrapedDocumentId;
      setProgress(50);
      setStatus('Webpage scraped. Starting processing...');
      setSuccessMessage('Webpage scraped successfully! Processing...');
      
      // Process the scraped content
      setProcessing(true);
      console.log(`Processing document ID: ${scrapedDocumentId} for chatbot: ${chatbotId}`);
      const processResponse = await fetch(`/api/teacher/chatbots/${chatbotId}/vectorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: documentIdForVectorizing }),
      });
      
      if (!processResponse.ok) {
        const data = await processResponse.json().catch(() => ({}));
        
        // If document is already being processed, show a more helpful message
        if (data.error && data.error.includes('already being processed')) {
          const minutes = data.minutesSinceUpdate ? ` (started ${data.minutesSinceUpdate} minutes ago)` : '';
          throw new Error(`This webpage is already being processed${minutes}. Please wait a few minutes and try again.`);
        }
        
        throw new Error(data.error || 'Failed to process webpage content');
      }
      
      setProgress(100);
      setStatus('Webpage content processed successfully!');
      setSuccessMessage('Webpage content extracted and processing started. It will be available for RAG soon.');
      
      // Clear the URL input
      setUrl('');
      
      // Notify parent with the document data
      if (onScrapeSuccess) {
        onScrapeSuccess(scrapeData.document);
      }
    } catch (err) {
      console.error('Error scraping webpage:', err);
      setError(err instanceof Error ? err.message : 'Failed to scrape webpage');
      setStatus('Error occurred');
    } finally {
      setScraping(false);
      setProcessing(false);
    }
  };

  return (
    <ScraperContainer>
      <SectionTitle>Web Scraper for Knowledge Base</SectionTitle>
      
      {error && <ModernAlert $variant="error">{error}</ModernAlert>}
      {successMessage && <ModernAlert $variant="success">{successMessage}</ModernAlert>}
      
      <StyledFormGroup>
        <StyledLabel htmlFor="webpage-url">Webpage URL</StyledLabel>
        <StyledInput
          id="webpage-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/article"
          type="url"
          disabled={scraping || processing}
        />
        <FileTypeInfo>
          Enter a URL to scrape content from a webpage directly into your knowledge base.
        </FileTypeInfo>
      </StyledFormGroup>
      
      <ModernButton 
        variant="primary" 
        disabled={!url.trim() || !url.startsWith('http') || scraping || processing}
        fullWidth
        onClick={handleScrape}
      >
        {scraping || processing ? 'Processing...' : 'Extract & Process Content'}
      </ModernButton>
      
      {(scraping || processing) && (
        <>
          <ProgressBar>
            <Progress $progress={progress} />
          </ProgressBar>
          <StatusText>{status}</StatusText>
        </>
      )}
    </ScraperContainer>
  );
}