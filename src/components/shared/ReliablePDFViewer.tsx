'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Button, Alert } from '@/styles/StyledComponents';

const ViewerContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f8f9fa;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: white;
  border-bottom: 1px solid #e9ecef;
  gap: 1rem;
  flex-shrink: 0;
`;

const DocumentTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #212529;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ViewerFrame = styled.iframe`
  flex: 1;
  border: none;
  width: 100%;
  min-height: 600px;
  background: white;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 400px;
  gap: 1rem;
`;

const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 4px solid #e9ecef;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const LoadingProgress = styled.div`
  width: 200px;
  height: 4px;
  background: #e9ecef;
  border-radius: 2px;
  overflow: hidden;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    background: linear-gradient(90deg, transparent, #007bff, transparent);
    animation: loading 2s infinite;
  }
  
  @keyframes loading {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 400px;
  gap: 1rem;
  text-align: center;
  padding: 2rem;
`;

const MethodSelector = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

interface ReliablePDFViewerProps {
  documentUrl: string;
  documentName: string;
  onPageChange?: (pageNumber: number, totalPages: number) => void;
  onDocumentLoad?: (totalPages: number) => void;
}

export default function ReliablePDFViewer({ 
  documentUrl, 
  documentName,
  onPageChange,
  onDocumentLoad
}: ReliablePDFViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<'proxy' | 'direct' | 'embed'>('proxy');
  const [finalUrl, setFinalUrl] = useState<string>('');

  useEffect(() => {
    console.log('🎯 ReliablePDFViewer received URL:', documentUrl);
    console.log('📋 Document name:', documentName);
    
    if (!documentUrl) {
      setError('No document URL provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let processedUrl = documentUrl;
    let effectiveMethod = method;

    // Handle local test PDF
    if (documentUrl === '/test.pdf' || documentUrl.endsWith('/test.pdf')) {
      processedUrl = '/test.pdf';
      effectiveMethod = 'direct';
      console.log('🧪 Using local test PDF');
    }
    // Handle Supabase URLs - use direct method for signed URLs
    else if (documentUrl.includes('.supabase.co/') || documentUrl.includes('supabase.co/storage/')) {
      processedUrl = documentUrl;
      effectiveMethod = 'direct';
      console.log('🔐 Using direct method for Supabase URL');
      console.log('📎 Supabase URL:', documentUrl.substring(0, 150) + '...');
    }
    // Determine which method to use and process URL accordingly
    else if (method === 'proxy' && documentUrl.startsWith('http') && !documentUrl.includes(window.location.hostname)) {
      // Use proxy for external URLs
      processedUrl = `/api/pdf-proxy?url=${encodeURIComponent(documentUrl)}`;
      console.log('📄 Using PDF proxy method');
    } else if (method === 'direct') {
      // Use direct URL
      processedUrl = documentUrl;
      console.log('📄 Using direct PDF method');
    } else if (method === 'embed') {
      // Use PDF.js viewer
      processedUrl = `/api/pdf-viewer?url=${encodeURIComponent(documentUrl)}`;
      console.log('📄 Using PDF.js embed method');
    }

    console.log('🔗 Final PDF URL:', processedUrl);
    setFinalUrl(processedUrl);
    
    // For large PDFs, local files, and Supabase URLs, skip the HEAD test and load directly
    const isLocalFile = documentUrl.startsWith('/') && !documentUrl.startsWith('http');
    const isSupabaseUrl = documentUrl.includes('.supabase.co/');
    const isLargeFileMethod = effectiveMethod === 'proxy'; // Proxy handles large files better
    
    if (isLargeFileMethod || isLocalFile || isSupabaseUrl) {
      console.log('📊 Skipping HEAD test for large PDF, loading directly');
      setLoading(false);
      setError(null);
      onDocumentLoad?.(1);
    } else {
      // Test the URL for smaller files
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      fetch(processedUrl, { 
        method: 'HEAD',
        signal: controller.signal
      })
        .then(response => {
          clearTimeout(timeoutId);
          console.log('📊 PDF URL test:', response.status, response.statusText);
          if (response.ok) {
            setLoading(false);
            setError(null);
            onDocumentLoad?.(1);
          } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        })
        .catch(err => {
          clearTimeout(timeoutId);
          console.error('❌ PDF URL test failed:', err);
          if (method === 'proxy') {
            console.log('🔄 Falling back to direct method');
            setMethod('direct');
          } else if (method === 'direct') {
            console.log('🔄 Falling back to embed method');
            setMethod('embed');
          } else {
            setError(`Failed to load PDF: ${err.message}`);
            setLoading(false);
          }
        });
    }

  }, [documentUrl, method, onDocumentLoad]);

  if (!documentUrl || documentUrl === '') {
    console.log('⚠️ No document URL provided to ReliablePDFViewer');
    return (
      <ViewerContainer>
        <ErrorContainer>
          <Alert variant="warning">
            <h4>No Document Available</h4>
            <p>Please upload a PDF document to view it here.</p>
          </Alert>
        </ErrorContainer>
      </ViewerContainer>
    );
  }

  if (loading) {
    return (
      <ViewerContainer>
        <LoadingContainer>
          <LoadingSpinner />
          <div>Loading {documentName}...</div>
          <LoadingProgress />
          <div style={{ fontSize: '0.875rem', color: '#666' }}>
            Method: {method} • Large files may take longer
          </div>
        </LoadingContainer>
      </ViewerContainer>
    );
  }

  if (error) {
    return (
      <ViewerContainer>
        <ErrorContainer>
          <Alert variant="error">
            <h4>Failed to Load PDF</h4>
            <p>{error}</p>
          </Alert>
          <MethodSelector>
            <Button 
              size="small" 
              onClick={() => { setMethod('proxy'); setError(null); }}
              disabled={method === 'proxy'}
            >
              Try Proxy
            </Button>
            <Button 
              size="small" 
              onClick={() => { setMethod('direct'); setError(null); }}
              disabled={method === 'direct'}
            >
              Try Direct
            </Button>
            <Button 
              size="small" 
              onClick={() => window.open(documentUrl, '_blank')}
            >
              Open External
            </Button>
          </MethodSelector>
        </ErrorContainer>
      </ViewerContainer>
    );
  }

  const iframeSrc = method === 'embed' 
    ? finalUrl
    : `${finalUrl}#toolbar=1&navpanes=0&scrollbar=1&page=1&view=FitH&zoom=100`; // navpanes=0 removes left navigation pane

  console.log('🖼️ Rendering iframe with src:', iframeSrc);

  return (
    <ViewerContainer>
      <Toolbar>
        <DocumentTitle>📄 {documentName}</DocumentTitle>
        <MethodSelector>
          <span style={{ fontSize: '0.875rem', color: '#666' }}>
            Method: {method}
          </span>
          <Button 
            size="small" 
            onClick={() => window.open(documentUrl, '_blank')}
          >
            Open in New Tab
          </Button>
        </MethodSelector>
      </Toolbar>
      
      <ViewerFrame
        src={iframeSrc}
        title={documentName}
        onLoad={() => {
          console.log('✅ PDF iframe loaded successfully');
          setLoading(false);
        }}
        onError={() => {
          console.error('❌ PDF iframe failed to load');
          setError('Failed to load PDF in iframe');
        }}
      />
    </ViewerContainer>
  );
}