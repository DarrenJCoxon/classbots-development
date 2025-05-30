'use client';

import React, { useState } from 'react';
import styled from 'styled-components';
import { VideoInfo } from '@/lib/utils/video-utils';
import ModernLoader from './ModernLoader';

const VideoContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
`;

const VideoWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  flex: 1;
`;

const StyledIframe = styled.iframe`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
`;

// Removed completion overlay components as assessment button is now always visible below chat

// Removed progress bar components as we're not tracking video progress anymore

interface VideoPlayerWithTrackingProps {
  videoInfo: VideoInfo;
  title?: string;
}

export function VideoPlayerWithTracking({ 
  videoInfo, 
  title
}: VideoPlayerWithTrackingProps) {
  const [loading, setLoading] = useState(true);

  // Simplified component - no progress tracking needed

  // Removed progress loading - assessment button is always visible

  // Removed progress updating - not needed anymore

  const handleIframeLoad = () => {
    setLoading(false);
  };

  // Removed progress tracking logic

  // Build iframe src with appropriate parameters
  let iframeSrc = videoInfo.embedUrl || '';
  
  if (videoInfo.platform === 'youtube' && videoInfo.embedUrl) {
    const params = new URLSearchParams({
      rel: '0',
      modestbranding: '1',
      autoplay: '0',
      fs: '1',
      enablejsapi: '1', // Enable JS API for better tracking
    });
    iframeSrc = `${videoInfo.embedUrl}?${params.toString()}`;
  }

  return (
    <VideoContainer>
      <VideoWrapper>
        {loading && (
          <div style={{ 
            position: 'absolute', 
            inset: 0, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.8)'
          }}>
            <ModernLoader />
          </div>
        )}
        
        <StyledIframe
          src={iframeSrc}
          title={title || 'Video Player'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          onLoad={handleIframeLoad}
        />
      </VideoWrapper>
    </VideoContainer>
  );
}