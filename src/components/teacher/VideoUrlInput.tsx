'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { parseVideoUrl, validateVideoUrl } from '@/lib/utils/video-utils';
import { ModernButton } from '@/components/shared/ModernButton';
import { Alert } from '@/styles/StyledComponents';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const InputGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
`;

const Input = styled.input`
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #4f46e5;
  }

  &::placeholder {
    color: #999;
  }
`;

const VideoPreview = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
`;

const PreviewTitle = styled.h4`
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
`;

const VideoInfo = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const VideoDetails = styled.div`
  flex: 1;
`;

const VideoUrl = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: #374151;
  word-break: break-all;
`;

const Platform = styled.span`
  display: inline-block;
  margin-top: 0.25rem;
  padding: 0.125rem 0.5rem;
  background: #e0e7ff;
  color: #4338ca;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
`;

interface VideoUrlInputProps {
  chatbotId: string;
  currentVideoUrl?: string | null;
  onSaveSuccess?: () => void;
}

export function VideoUrlInput({ chatbotId, currentVideoUrl, onSaveSuccess }: VideoUrlInputProps) {
  const [videoUrl, setVideoUrl] = useState(currentVideoUrl || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validatedVideo, setValidatedVideo] = useState<ReturnType<typeof parseVideoUrl> | null>(null);

  useEffect(() => {
    if (videoUrl) {
      const validation = validateVideoUrl(videoUrl);
      if (validation.valid) {
        setValidatedVideo(parseVideoUrl(videoUrl));
        setError(null);
      } else {
        setValidatedVideo(null);
        if (videoUrl.length > 10) { // Only show error for non-empty inputs
          setError(validation.error || 'Invalid video URL');
        }
      }
    } else {
      setValidatedVideo(null);
      setError(null);
    }
  }, [videoUrl]);

  const handleSave = async () => {
    if (!validatedVideo) {
      setError('Please enter a valid YouTube or Vimeo URL');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/teacher/chatbots/${chatbotId}/reading-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save video');
      }

      setSuccess(true);
      if (onSaveSuccess) {
        onSaveSuccess();
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save video');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('Are you sure you want to remove this video?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/teacher/chatbots/${chatbotId}/reading-document`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove video');
      }

      setVideoUrl('');
      setValidatedVideo(null);
      setSuccess(true);
      
      if (onSaveSuccess) {
        onSaveSuccess();
      }
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove video');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <InputGroup>
        <Input
          type="url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
          disabled={loading}
        />
        <ModernButton           onClick={handleSave}
          disabled={!validatedVideo || loading}
          variant="primary"
        >
          {loading ? 'Saving...' : 'Save Video'}
        </ModernButton>
        {currentVideoUrl && (
          <ModernButton             onClick={handleRemove}
            disabled={loading}
            variant="secondary"
          >
            Remove
          </ModernButton>
        )}
      </InputGroup>

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">Video saved successfully!</Alert>}

      {validatedVideo && validatedVideo.videoId && (
        <VideoPreview>
          <PreviewTitle>Video Preview</PreviewTitle>
          <VideoInfo>
            <VideoDetails>
              <VideoUrl>{validatedVideo.originalUrl}</VideoUrl>
              <Platform>{validatedVideo.platform}</Platform>
            </VideoDetails>
          </VideoInfo>
        </VideoPreview>
      )}
    </Container>
  );
}