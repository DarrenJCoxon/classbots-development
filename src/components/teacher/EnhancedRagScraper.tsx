// src/components/teacher/EnhancedRagScraper.tsx
'use client';

import { useState } from 'react';
import styled from 'styled-components';
import { Button, Alert, Input, FormGroup, Label } from '@/styles/StyledComponents';
import type { Document as KnowledgeDocument } from '@/types/knowledge-base.types';

// Styled components for the web scraper
const ScraperContainer = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  background-color: ${({ theme }) => theme.colors.backgroundCard};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  padding: ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const SectionTitle = styled.h3`
  font-size: 1.1rem;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  color: ${({ theme }) => theme.colors.text};
`;

const FileTypeInfo = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.875rem;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 12px;
  background-color: ${({ theme }) => theme.colors.backgroundDark};
  border-radius: ${({ theme }) => theme.borderRadius.small};
  margin-top: ${({ theme }) => theme.spacing.md};
  overflow: hidden;
`;

const Progress = styled.div<{ $progress: number }>`
  height: 100%;
  width: ${props => props.$progress}%;
  background-color: ${({ theme }) => theme.colors.primary};
  transition: width 0.3s ease;
`;

const StatusText = styled.div`
  font-size: 0.9rem;
  margin-top: ${({ theme }) => theme.spacing.sm};
  color: ${({ theme }) => theme.colors.textLight};
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
      setError(`Missing required data: ${!url.trim() ? 'No URL entered' : 'No chatbot ID provided'}`);
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
      
      {error && <Alert variant="error" style={{ marginBottom: '16px' }}>{error}</Alert>}
      {successMessage && <Alert variant="success" style={{ marginBottom: '16px' }}>{successMessage}</Alert>}
      
      <FormGroup>
        <Label htmlFor="webpage-url">Webpage URL</Label>
        <Input
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
      </FormGroup>
      
      <Button 
        variant="primary" 
        disabled={!url.trim() || !url.startsWith('http') || scraping || processing}
        style={{ marginTop: '8px', width: '100%' }}
        onClick={handleScrape}
      >
        {scraping || processing ? 'Processing...' : 'Extract & Process Content'}
      </Button>
      
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