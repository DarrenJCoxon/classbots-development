'use client';

import React, { useState, useEffect } from 'react';
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

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
  z-index: 10;
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
  text-align: center;
  color: #666;
`;

const ErrorTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.5rem;
`;

const ErrorMessage = styled.p`
  font-size: 1rem;
  line-height: 1.5;
  max-width: 400px;
`;

const UnsupportedMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
  text-align: center;
  color: #666;
`;

interface VideoPlayerProps {
  videoInfo: VideoInfo;
  title?: string;
}

export function VideoPlayer({ videoInfo, title }: VideoPlayerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset states when video changes
    setLoading(true);
    setError(null);
  }, [videoInfo.videoId]);

  const handleIframeLoad = () => {
    setLoading(false);
  };

  const handleIframeError = () => {
    setError('Failed to load video. Please check your internet connection.');
    setLoading(false);
  };

  // Handle unsupported video platforms
  if (!videoInfo.embedUrl || videoInfo.platform === 'unknown') {
    return (
      <VideoContainer>
        <UnsupportedMessage>
          <ErrorTitle>Unsupported Video Platform</ErrorTitle>
          <ErrorMessage>
            Currently, only YouTube and Vimeo videos are supported.
          </ErrorMessage>
          {videoInfo.originalUrl && (
            <ErrorMessage style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
              Original URL: {videoInfo.originalUrl}
            </ErrorMessage>
          )}
        </UnsupportedMessage>
      </VideoContainer>
    );
  }

  if (error) {
    return (
      <VideoContainer>
        <ErrorContainer>
          <ErrorTitle>Unable to Load Video</ErrorTitle>
          <ErrorMessage>{error}</ErrorMessage>
        </ErrorContainer>
      </VideoContainer>
    );
  }

  // Build iframe src with appropriate parameters
  let iframeSrc = videoInfo.embedUrl;
  
  if (videoInfo.platform === 'youtube') {
    // Add YouTube parameters for better embedding experience
    const params = new URLSearchParams({
      rel: '0', // Don't show related videos
      modestbranding: '1', // Minimal YouTube branding
      autoplay: '0', // Don't autoplay
      fs: '1', // Allow fullscreen
    });
    iframeSrc = `${videoInfo.embedUrl}?${params.toString()}`;
  } else if (videoInfo.platform === 'vimeo') {
    // Add Vimeo parameters
    const params = new URLSearchParams({
      autopause: '1',
      byline: '0',
      portrait: '0',
      title: '0',
    });
    iframeSrc = `${videoInfo.embedUrl}?${params.toString()}`;
  }

  return (
    <VideoContainer>
      <VideoWrapper>
        {loading && (
          <LoadingOverlay>
            <ModernLoader />
          </LoadingOverlay>
        )}
        <StyledIframe
          src={iframeSrc}
          title={title || 'Video Player'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          onLoad={handleIframeLoad}
          onError={handleIframeError}
        />
      </VideoWrapper>
    </VideoContainer>
  );
}