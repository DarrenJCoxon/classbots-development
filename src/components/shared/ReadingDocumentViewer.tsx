// src/components/shared/ReadingDocumentViewer.tsx
'use client';

import { useState, useEffect } from 'react';
import SimplePDFViewer from './SimplePDFViewer';
import { MediaViewer } from './MediaViewer';
import { VideoPlayerWithTracking } from './VideoPlayerWithTracking';
import { parseVideoUrl } from '@/lib/utils/video-utils';

interface ReadingDocumentViewerProps {
  chatbotId: string;
  userId?: string;
}

export default function ReadingDocumentViewer({ 
  chatbotId, 
  userId
}: ReadingDocumentViewerProps) {
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [contentType, setContentType] = useState<'pdf' | 'video'>('pdf');
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
      
      if (data.document) {
        const docContentType = data.document.content_type || 'pdf';
        setContentType(docContentType);
        
        // Get the appropriate URL based on content type
        let url = null;
        if (docContentType === 'video') {
          // For videos, the file_url contains the video URL
          url = data.document.file_url;
        } else {
          // For PDFs, use file_url
          url = data.document.file_url;
        }
        
        if (url) {
          // Clean the URL - remove any fragments
          const cleanUrl = url.split('#')[0];
          console.log('[ReadingDocumentViewer] Setting document:', {
            url: cleanUrl,
            contentType: docContentType
          });
          setDocumentUrl(cleanUrl);
        } else {
          console.log('[ReadingDocumentViewer] No document URL found in response');
          setDocumentUrl(null);
        }
      } else {
        console.log('[ReadingDocumentViewer] No document in response');
        setDocumentUrl(null);
      }
    } catch (err) {
      console.error('[ReadingDocumentViewer] Error fetching reading document:', err);
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  // For video content, use VideoPlayerWithTracking if we have tracking info
  if (contentType === 'video' && documentUrl) {
    if (loading) {
      return (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          color: '#666'
        }}>
          Loading video...
        </div>
      );
    }
    if (error) {
      return (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          color: '#ef4444',
          padding: '2rem',
          textAlign: 'center'
        }}>
          {error}
        </div>
      );
    }
    
    // Always use VideoPlayerWithTracking for videos
    const videoInfo = parseVideoUrl(documentUrl);
    return (
      <VideoPlayerWithTracking
        videoInfo={videoInfo}
        title="Video Content"
      />
    );
  }
  
  // For PDF content, use SimplePDFViewer
  return (
    <SimplePDFViewer 
      documentUrl={documentUrl}
      loading={loading}
      error={error}
    />
  );
}