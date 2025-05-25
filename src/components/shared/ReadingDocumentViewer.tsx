// src/components/shared/ReadingDocumentViewer.tsx
'use client';

import { useState, useEffect } from 'react';
import SimplePDFViewer from './SimplePDFViewer';

interface ReadingDocumentViewerProps {
  chatbotId: string;
  userId?: string;
}

export default function ReadingDocumentViewer({ chatbotId, userId }: ReadingDocumentViewerProps) {
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReadingDocument();
  }, [chatbotId]);

  const fetchReadingDocument = async () => {
    setLoading(true);
    setError(null);

    try {
      // Build query params
      const params = new URLSearchParams({ chatbotId });
      if (userId) {
        params.append('userId', userId);
      }

      const response = await fetch(`/api/student/reading-document?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[ReadingDocumentViewer] API Error:', response.status, errorData);
        
        if (response.status === 404) {
          // No document uploaded yet - this is not an error state
          setDocumentUrl(null);
          setError(null);
        } else {
          setError(errorData.error || `Failed to fetch reading document (${response.status})`);
        }
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log('[ReadingDocumentViewer] API Response:', data);
      
      if (data.document && data.document.file_url) {
        // Clean the URL - remove any fragments
        const cleanUrl = data.document.file_url.split('#')[0];
        console.log('[ReadingDocumentViewer] Setting clean document URL:', cleanUrl);
        setDocumentUrl(cleanUrl);
      } else {
        console.log('[ReadingDocumentViewer] No document URL found in response');
        setDocumentUrl(null);
      }
    } catch (err) {
      console.error('[ReadingDocumentViewer] Error fetching reading document:', err);
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SimplePDFViewer 
      documentUrl={documentUrl}
      loading={loading}
      error={error}
    />
  );
}