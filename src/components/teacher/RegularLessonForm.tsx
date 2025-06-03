'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { ModernButton } from '@/components/shared/ModernButton';
import { Alert } from '@/styles/StyledComponents';
import { parseVideoUrl, validateVideoUrl } from '@/lib/utils/video-utils';
import type { CourseLesson } from '@/types/database.types';

const FormContainer = styled.div`
  background: white;
  border-radius: 16px;
  padding: 32px;
  border: 1px solid rgba(152, 93, 215, 0.1);
  box-shadow: 0 2px 8px rgba(152, 93, 215, 0.05);
  margin-bottom: 32px;
`;

const FormTitle = styled.h2`
  margin: 0 0 24px 0;
  font-size: 24px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const FormGrid = styled.div`
  display: grid;
  gap: 24px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
`;

const Input = styled.input`
  padding: 12px 16px;
  border: 1px solid rgba(152, 93, 215, 0.2);
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(152, 93, 215, 0.1);
  }
  
  &::placeholder {
    color: ${({ theme }) => theme.colors.textLight};
  }
`;

const TextArea = styled.textarea`
  padding: 12px 16px;
  border: 1px solid rgba(152, 93, 215, 0.2);
  border-radius: 8px;
  font-size: 14px;
  min-height: 100px;
  resize: vertical;
  font-family: inherit;
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(152, 93, 215, 0.1);
  }
  
  &::placeholder {
    color: ${({ theme }) => theme.colors.textLight};
  }
`;

const VideoPreview = styled.div`
  margin-top: 12px;
  padding: 16px;
  background: rgba(250, 248, 254, 0.5);
  border-radius: 8px;
  border: 1px solid rgba(152, 93, 215, 0.1);
`;

const PreviewTitle = styled.h4`
  margin: 0 0 8px 0;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textLight};
  font-weight: 500;
`;

const VideoInfo = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const VideoDetails = styled.div`
  flex: 1;
`;

const VideoUrl = styled.p`
  margin: 0;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
  word-break: break-all;
`;

const Platform = styled.span`
  display: inline-block;
  margin-top: 4px;
  padding: 2px 8px;
  background: ${({ theme }) => theme.colors.primary}20;
  color: ${({ theme }) => theme.colors.primary};
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid rgba(152, 93, 215, 0.1);
`;

interface RegularLessonFormProps {
  courseId: string;
  lesson?: CourseLesson | null; // For editing
  onSuccess: () => void;
  onCancel: () => void;
}

export function RegularLessonForm({ courseId, lesson, onSuccess, onCancel }: RegularLessonFormProps) {
  const [formData, setFormData] = useState({
    title: lesson?.title || '',
    description: lesson?.description || '',
    video_url: lesson?.video_url || '',
    lesson_order: lesson?.lesson_order || 1,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validatedVideo, setValidatedVideo] = useState<ReturnType<typeof parseVideoUrl> | null>(null);

  const isEditing = !!lesson;

  useEffect(() => {
    if (formData.video_url) {
      const validation = validateVideoUrl(formData.video_url);
      if (validation.valid) {
        setValidatedVideo(parseVideoUrl(formData.video_url));
        setError(null);
      } else {
        setValidatedVideo(null);
        if (formData.video_url.length > 10) {
          setError(validation.error || 'Invalid video URL');
        }
      }
    } else {
      setValidatedVideo(null);
      setError(null);
    }
  }, [formData.video_url]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('Lesson title is required');
      return;
    }
    
    if (!formData.video_url.trim()) {
      setError('Video URL is required');
      return;
    }
    
    if (!validatedVideo) {
      setError('Please enter a valid YouTube, Vimeo, or Loom URL');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        video_url: formData.video_url.trim(),
        video_platform: validatedVideo.platform,
        lesson_order: formData.lesson_order,
        is_active: true
      };

      const url = isEditing 
        ? `/api/teacher/courses/${courseId}/lessons/${lesson.lesson_id}`
        : `/api/teacher/courses/${courseId}/lessons`;
        
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${isEditing ? 'update' : 'create'} lesson`);
      }

      onSuccess();
    } catch (err) {
      console.error('Error saving lesson:', err);
      setError(err instanceof Error ? err.message : 'Failed to save lesson');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormContainer>
      <FormTitle>
        {isEditing ? 'Edit Lesson' : 'Create New Lesson'}
      </FormTitle>
      
      <form onSubmit={handleSubmit}>
        <FormGrid>
          <FormGroup>
            <Label htmlFor="title">Lesson Title *</Label>
            <Input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter lesson title..."
              required
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="description">Description</Label>
            <TextArea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter lesson description..."
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="video_url">Video URL *</Label>
            <Input
              id="video_url"
              type="url"
              value={formData.video_url}
              onChange={(e) => handleInputChange('video_url', e.target.value)}
              placeholder="https://youtube.com/watch?v=... or https://vimeo.com/... or https://loom.com/share/..."
              required
            />
            
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
          </FormGroup>

          <FormGroup>
            <Label htmlFor="lesson_order">Lesson Order</Label>
            <Input
              id="lesson_order"
              type="number"
              min="1"
              value={formData.lesson_order}
              onChange={(e) => handleInputChange('lesson_order', parseInt(e.target.value) || 1)}
            />
          </FormGroup>
        </FormGrid>

        {error && <Alert variant="error" style={{ marginTop: '16px' }}>{error}</Alert>}

        <ButtonGroup>
          <ModernButton
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </ModernButton>
          <ModernButton
            type="submit"
            variant="primary"
            disabled={isSubmitting || !validatedVideo}
          >
            {isSubmitting 
              ? (isEditing ? 'Updating...' : 'Creating...') 
              : (isEditing ? 'Update Lesson' : 'Create Lesson')
            }
          </ModernButton>
        </ButtonGroup>
      </form>
    </FormContainer>
  );
}