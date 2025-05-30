'use client';

import React from 'react';
import SimplePDFViewer from './SimplePDFViewer';
import { VideoPlayer } from './VideoPlayer';
import { parseVideoUrl, isVideoUrl } from '@/lib/utils/video-utils';

interface MediaViewerProps {
  url: string;
  title?: string;
  contentType?: 'pdf' | 'video' | 'auto';
}

export function MediaViewer({ url, title, contentType = 'auto' }: MediaViewerProps) {
  // Determine content type
  let actualContentType: 'pdf' | 'video' | 'unknown' = 'unknown';
  
  if (contentType === 'auto') {
    // Auto-detect based on URL
    if (isVideoUrl(url)) {
      actualContentType = 'video';
    } else if (url.toLowerCase().endsWith('.pdf') || url.includes('/documents/')) {
      actualContentType = 'pdf';
    }
  } else {
    actualContentType = contentType;
  }

  // Render appropriate viewer
  if (actualContentType === 'video') {
    const videoInfo = parseVideoUrl(url);
    return <VideoPlayer videoInfo={videoInfo} title={title} />;
  } else if (actualContentType === 'pdf') {
    return <SimplePDFViewer documentUrl={url} />;
  } else {
    // Fallback for unknown content type
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%',
        color: '#666',
        textAlign: 'center',
        padding: '2rem'
      }}>
        <div>
          <h3 style={{ marginBottom: '0.5rem' }}>Unsupported Content Type</h3>
          <p>Unable to display this content.</p>
        </div>
      </div>
    );
  }
}