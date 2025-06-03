import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiX, 
  FiSave, 
  FiAlertCircle, 
  FiYoutube, 
  FiVideo,
  FiLink,
  FiFile,
  FiTrash2,
  FiUpload
} from 'react-icons/fi';
import { SiVimeo, SiLoom } from 'react-icons/si';
import { ModernButton } from '@/components/shared/ModernButton';
import { VideoUploader } from '@/components/premium/VideoUploader';
import { Input, FormField, FormLabel, FormError, FormHelperText } from '@/components/ui';
import type { PremiumCourseLesson } from '@/types/premium-course.types';

interface LessonFormProps {
  courseId: string;
  moduleId: string;
  lesson?: PremiumCourseLesson | null;
  lessonOrder: number;
  onSubmit: (lessonData: Partial<PremiumCourseLesson>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const Overlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  overflow-y: auto;
`;

const FormContainer = styled(motion.div)`
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
`;

const FormHeader = styled.div`
  padding: 32px 32px 24px;
  border-bottom: 1px solid rgba(152, 93, 215, 0.1);
  position: sticky;
  top: 0;
  background: white;
  z-index: 10;
`;

const HeaderTitle = styled.h2`
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.magenta}
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 24px;
  right: 24px;
  background: rgba(152, 93, 215, 0.1);
  border: none;
  border-radius: 12px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(152, 93, 215, 0.2);
    transform: scale(1.05);
  }
  
  svg {
    width: 20px;
    height: 20px;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const FormBody = styled.div`
  padding: 32px;
`;

const FormGrid = styled.div`
  display: grid;
  gap: 24px;
`;

const DescriptionTextArea = styled.textarea`
  width: 100%;
  min-height: 200px;
  padding: 16px;
  border: 2px solid rgba(152, 93, 215, 0.2);
  border-radius: 12px;
  font-size: 16px;
  font-family: inherit;
  line-height: 1.6;
  resize: vertical;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.8);
  direction: ltr;
  text-align: left;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    background: white;
    box-shadow: 0 0 0 4px rgba(152, 93, 215, 0.1);
  }
  
  &::placeholder {
    color: ${({ theme }) => theme.colors.textLight};
    direction: ltr;
    text-align: left;
  }
`;

const VideoUrlSection = styled.div`
  margin-top: 16px;
`;

const PlatformSelector = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
`;

const PlatformButton = styled.button<{ $isSelected: boolean }>`
  flex: 1;
  padding: 12px;
  background: ${({ $isSelected, theme }) => 
    $isSelected ? `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.magenta})` : 'rgba(152, 93, 215, 0.1)'
  };
  color: ${({ $isSelected }) => $isSelected ? 'white' : 'inherit'};
  border: 1px solid rgba(152, 93, 215, 0.2);
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(152, 93, 215, 0.2);
  }
  
  svg {
    width: 20px;
    height: 20px;
  }
`;

const DocumentsSection = styled.div`
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid rgba(152, 93, 215, 0.1);
`;

const DocumentsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
`;

const DocumentItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(152, 93, 215, 0.05);
  border-radius: 10px;
  
  svg {
    width: 20px;
    height: 20px;
    color: ${({ theme }) => theme.colors.primary};
  }
  
  span {
    flex: 1;
    font-size: 14px;
  }
`;

const RemoveButton = styled.button`
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.red};
  transition: transform 0.2s ease;
  
  &:hover {
    transform: scale(1.1);
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

const FileInput = styled.input`
  display: none;
`;

const UploadButton = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(152, 93, 215, 0.1);
  border: 1px solid rgba(152, 93, 215, 0.2);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: 500;
  
  &:hover {
    background: rgba(152, 93, 215, 0.15);
    transform: translateY(-1px);
  }
  
  svg {
    width: 18px;
    height: 18px;
  }
`;

const FormFooter = styled.div`
  padding: 24px 32px;
  border-top: 1px solid rgba(152, 93, 215, 0.1);
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  background: rgba(250, 248, 254, 0.5);
`;

const ErrorAlert = styled(motion.div)`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  
  svg {
    width: 20px;
    height: 20px;
    color: ${({ theme }) => theme.colors.red};
    flex-shrink: 0;
    margin-top: 2px;
  }
  
  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.red};
    font-size: 14px;
    line-height: 1.5;
  }
`;

// Premium courses only support self-hosted videos

interface Document {
  id: string;
  name: string;
  file?: File;
  url?: string;
  size?: number;
  type?: string;
}

export const LessonForm: React.FC<LessonFormProps> = ({
  courseId,
  moduleId,
  lesson,
  lessonOrder,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    title: lesson?.title || '',
    description: lesson?.description || '',
    video_url: lesson?.video_url || '',
    // Premium courses only use self-hosted videos
    lesson_type: lesson?.lesson_type || 'video',
    lesson_order: lesson?.lesson_order || lessonOrder,
    estimated_duration_minutes: lesson?.estimated_duration_minutes || null,
    is_preview: lesson?.is_preview || false,
    is_mandatory: lesson?.is_mandatory !== false
  });
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [generalError, setGeneralError] = useState('');
  const [uploadedVideoData, setUploadedVideoData] = useState<any>(null);

  // Load existing documents when editing a lesson
  useEffect(() => {
    if (lesson?.downloadable_resources && Array.isArray(lesson.downloadable_resources)) {
      const existingDocs = lesson.downloadable_resources.map((resource: any) => ({
        id: resource.id || Math.random().toString(36).substr(2, 9),
        name: resource.name,
        url: resource.url,
        size: resource.size
      }));
      setDocuments(existingDocs);
    }
  }, [lesson]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Lesson title is required';
    }
    
    // Premium courses require video upload (only check on form submit, not during upload)
    if (!formData.video_url.trim() && !uploadedVideoData) {
      newErrors.video_url = 'Please upload a video';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Premium courses only use self-hosted videos, so no URL validation needed

  const handleVideoUploadComplete = (videoData: any) => {
    setUploadedVideoData(videoData);
    handleChange('video_url', videoData.id);
    if (videoData.duration) {
      handleChange('estimated_duration_minutes', Math.ceil(videoData.duration / 60));
    }
    // Clear any video_url errors when video uploads successfully
    if (errors.video_url) {
      setErrors(prev => ({ ...prev, video_url: '' }));
    }
    setGeneralError(''); // Clear any general errors
  };

  const handleVideoUploadError = (error: string) => {
    setGeneralError(`Video upload failed: ${error}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    
    if (!validateForm()) {
      return;
    }
    
    try {
      const lessonData: Partial<PremiumCourseLesson> = {
        course_id: courseId,
        module_id: moduleId,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        lesson_type: formData.lesson_type,
        video_url: formData.video_url.trim(),
        video_platform: null, // Premium courses don't use external platforms
        lesson_order: formData.lesson_order,
        estimated_duration_minutes: formData.estimated_duration_minutes,
        is_preview: formData.is_preview,
        is_mandatory: formData.is_mandatory,
        downloadable_resources: documents.map(doc => ({
          id: doc.id,
          name: doc.name,
          url: doc.url || '', // Will be populated after upload
          size: doc.size || doc.file?.size || 0,
          type: doc.type || doc.file?.type || 'application/octet-stream'
        })),
        ...(uploadedVideoData && {
          video_duration_seconds: uploadedVideoData.duration,
          video_thumbnail_url: uploadedVideoData.thumbnailUrl,
          video_quality_levels: uploadedVideoData.qualities
        })
      };
      
      if (lesson) {
        lessonData.lesson_id = lesson.lesson_id;
      }
      
      await onSubmit(lessonData);
    } catch (error) {
      console.error('Error submitting lesson:', error);
      setGeneralError('Failed to save lesson. Please try again.');
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    if (generalError) {
      setGeneralError('');
    }
  };

  // Removed rich text formatting for now - using simple textarea

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newDocs = Array.from(files).map(file => {
        // Create temporary URL for immediate preview
        const tempUrl = URL.createObjectURL(file);
        return {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          file,
          url: tempUrl, // Temporary URL for preview
          size: file.size,
          type: file.type
        };
      });
      setDocuments(prev => [...prev, ...newDocs]);
    }
  };

  const removeDocument = (id: string) => {
    setDocuments(prev => {
      const docToRemove = prev.find(doc => doc.id === id);
      if (docToRemove?.url && docToRemove.url.startsWith('blob:')) {
        // Clean up temporary URL to prevent memory leaks
        URL.revokeObjectURL(docToRemove.url);
      }
      return prev.filter(doc => doc.id !== id);
    });
  };

  return (
    <Overlay
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <FormContainer
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 25 }}
        onClick={(e) => e.stopPropagation()}
      >
        <FormHeader>
          <HeaderTitle>{lesson ? 'Edit Lesson' : 'Create New Lesson'}</HeaderTitle>
          <CloseButton onClick={onCancel}>
            <FiX />
          </CloseButton>
        </FormHeader>
        
        <FormBody>
          <form onSubmit={handleSubmit}>
            <FormGrid>
              {generalError && (
                <ErrorAlert
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <FiAlertCircle />
                  <p>{generalError}</p>
                </ErrorAlert>
              )}
              
              <FormField>
                <FormLabel $required>Lesson Title</FormLabel>
                <Input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="e.g., Introduction to Algebra"
                  $hasError={!!errors.title}
                  disabled={isLoading}
                />
                {errors.title && <FormError>{errors.title}</FormError>}
              </FormField>
              
              <FormField>
                <FormLabel>Lesson Order</FormLabel>
                <Input
                  type="number"
                  value={formData.lesson_order}
                  onChange={(e) => handleChange('lesson_order', parseInt(e.target.value) || 1)}
                  min="1"
                  disabled={isLoading}
                />
                <FormHelperText>The order in which this lesson appears in the course</FormHelperText>
              </FormField>
              
              <FormField>
                <FormLabel>Description & Instructions</FormLabel>
                <DescriptionTextArea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Add description, learning objectives, or instructions for this lesson..."
                  disabled={isLoading}
                />
                <FormHelperText>
                  This will be shown to students before they watch the video. You can use line breaks and basic formatting.
                </FormHelperText>
              </FormField>
              
              <FormField>
                <FormLabel>Estimated Duration (minutes)</FormLabel>
                <Input
                  type="number"
                  value={formData.estimated_duration_minutes || ''}
                  onChange={(e) => handleChange('estimated_duration_minutes', parseInt(e.target.value) || null)}
                  placeholder="e.g., 15"
                  min="1"
                  disabled={isLoading}
                />
                <FormHelperText>Approximate lesson duration to help students plan their time</FormHelperText>
              </FormField>
              
              <VideoUrlSection>
                <FormLabel $required>Upload Video</FormLabel>
                <FormHelperText style={{ marginBottom: '16px' }}>
                  Premium courses require self-hosted videos for the best student experience and full control over playback.
                </FormHelperText>
                <VideoUploader
                  courseId={courseId}
                  lessonId={lesson?.lesson_id || 'new'}
                  onUploadComplete={handleVideoUploadComplete}
                  onUploadError={handleVideoUploadError}
                  disabled={isLoading}
                />
                {formData.video_url && (
                  <FormHelperText style={{ marginTop: '8px' }}>
                    ✓ Video uploaded successfully (ID: {formData.video_url})
                  </FormHelperText>
                )}
                {errors.video_url && <FormError>{errors.video_url}</FormError>}
              </VideoUrlSection>
              
              <DocumentsSection>
                <FormLabel>Accompanying Documents</FormLabel>
                <FormHelperText>
                  Upload PDFs, worksheets, or other materials for this lesson
                </FormHelperText>
                
                <DocumentsList>
                  {documents.map(doc => (
                    <DocumentItem key={doc.id}>
                      <FiFile />
                      <span>{doc.name}</span>
                      <RemoveButton 
                        type="button"
                        onClick={() => removeDocument(doc.id)}
                      >
                        <FiTrash2 />
                      </RemoveButton>
                    </DocumentItem>
                  ))}
                </DocumentsList>
                
                <div style={{ marginTop: '16px' }}>
                  <FileInput
                    type="file"
                    id="document-upload"
                    multiple
                    accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                    onChange={handleFileUpload}
                    disabled={isLoading}
                  />
                  <UploadButton htmlFor="document-upload">
                    <FiFile /> Add Documents
                  </UploadButton>
                </div>
              </DocumentsSection>
            </FormGrid>
          </form>
        </FormBody>
        
        <FormFooter>
          <ModernButton
            variant="ghost"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </ModernButton>
          <ModernButton
            variant="primary"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            <FiSave />
            {lesson ? 'Update Lesson' : 'Create Lesson'}
          </ModernButton>
        </FormFooter>
      </FormContainer>
    </Overlay>
  );
};