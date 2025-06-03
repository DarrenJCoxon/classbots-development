import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiX, 
  FiSave, 
  FiAlertCircle, 
  FiVideo,
  FiFileText,
  FiHelpCircle,
  FiClipboard,
  FiRadio,
  FiUpload,
  FiLink,
  FiPlay,
  FiDownload,
  FiClock,
  FiEye,
  FiCheck,
  FiPlus,
  FiSettings
} from 'react-icons/fi';
import { ModernButton } from '@/components/shared/ModernButton';
import { Input, FormField, FormLabel, FormError, FormHelperText } from '@/components/ui';
import { VideoUploader } from '@/components/premium/VideoUploader';
import type { CreatePremiumLessonData } from '@/types/premium-course.types';

interface LessonFormProps {
  courseId: string;
  moduleId: string;
  lesson?: any; // For editing existing lessons
  lessonOrder: number; // For new lessons
  onSubmit: (lessonData: CreatePremiumLessonData) => Promise<void>;
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
  max-width: 900px;
  width: 100%;
  max-height: 95vh;
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
  font-size: 24px;
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

const FormSection = styled.div`
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(152, 93, 215, 0.1);
  
  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h3`
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  display: flex;
  align-items: center;
  gap: 8px;
  
  svg {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const FormGrid = styled.div`
  display: grid;
  gap: 24px;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 12px 16px;
  border: 2px solid rgba(152, 93, 215, 0.2);
  border-radius: 12px;
  font-size: 16px;
  font-family: inherit;
  resize: vertical;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.8);
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    background: white;
    box-shadow: 0 0 0 4px rgba(152, 93, 215, 0.1);
  }
  
  &::placeholder {
    color: ${({ theme }) => theme.colors.textLight};
  }
`;

const LessonTypeSelector = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
`;

const LessonTypeCard = styled.button<{ $isSelected: boolean; $color: string }>`
  padding: 16px;
  border: 2px solid ${({ $isSelected, $color }) => 
    $isSelected ? $color : 'rgba(152, 93, 215, 0.2)'
  };
  border-radius: 12px;
  background: ${({ $isSelected, $color }) => 
    $isSelected ? $color + '10' : 'white'
  };
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
  
  &:hover {
    border-color: ${({ $color }) => $color};
    background: ${({ $color }) => $color + '10'};
  }
  
  svg {
    width: 24px;
    height: 24px;
    color: ${({ $color }) => $color};
    margin-bottom: 8px;
  }
  
  .type-name {
    font-size: 14px;
    font-weight: 500;
    color: ${({ theme }) => theme.colors.text};
    margin: 0;
  }
  
  .type-desc {
    font-size: 12px;
    color: ${({ theme }) => theme.colors.textLight};
    margin: 4px 0 0 0;
  }
`;

const VideoUploadArea = styled.div`
  border: 2px dashed rgba(152, 93, 215, 0.3);
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  background: rgba(250, 248, 254, 0.5);
  transition: all 0.3s ease;
  
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    background: rgba(250, 248, 254, 0.8);
  }
  
  svg {
    width: 48px;
    height: 48px;
    color: ${({ theme }) => theme.colors.primary};
    margin-bottom: 16px;
  }
  
  h4 {
    margin: 0 0 8px 0;
    font-size: 18px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text};
  }
  
  p {
    margin: 0 0 16px 0;
    color: ${({ theme }) => theme.colors.textLight};
    font-size: 14px;
  }
`;

const VideoPreview = styled.div`
  background: rgba(250, 248, 254, 0.5);
  border: 1px solid rgba(152, 93, 215, 0.2);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  
  .video-info {
    flex: 1;
    
    h4 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 500;
      color: ${({ theme }) => theme.colors.text};
    }
    
    p {
      margin: 0;
      font-size: 14px;
      color: ${({ theme }) => theme.colors.textLight};
    }
  }
  
  .video-actions {
    display: flex;
    gap: 8px;
  }
`;

const CheckboxField = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: rgba(250, 248, 254, 0.5);
  border-radius: 12px;
  border: 1px solid rgba(152, 93, 215, 0.1);
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  accent-color: ${({ theme }) => theme.colors.primary};
  margin-top: 2px;
`;

const CheckboxContent = styled.div`
  flex: 1;
`;

const CheckboxLabel = styled.label`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 4px;
  display: block;
`;

const CheckboxDescription = styled.p`
  margin: 0;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textLight};
  line-height: 1.4;
`;

const ResourcesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ResourceItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(250, 248, 254, 0.5);
  border-radius: 8px;
  border: 1px solid rgba(152, 93, 215, 0.1);
  
  svg {
    color: ${({ theme }) => theme.colors.primary};
  }
  
  .resource-info {
    flex: 1;
    
    .resource-name {
      font-size: 14px;
      font-weight: 500;
      color: ${({ theme }) => theme.colors.text};
      margin-bottom: 2px;
    }
    
    .resource-size {
      font-size: 12px;
      color: ${({ theme }) => theme.colors.textLight};
    }
  }
  
  button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    color: ${({ theme }) => theme.colors.textLight};
    
    &:hover {
      color: ${({ theme }) => theme.colors.red};
    }
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

const lessonTypes = [
  {
    type: 'video',
    name: 'Video Lesson',
    description: 'Video content with player',
    icon: FiVideo,
    color: '#8B5CF6'
  },
  {
    type: 'text',
    name: 'Text/Article',
    description: 'Written content',
    icon: FiFileText,
    color: '#10B981'
  },
  {
    type: 'quiz',
    name: 'Quiz',
    description: 'Interactive assessment',
    icon: FiHelpCircle,
    color: '#F59E0B'
  },
  {
    type: 'assignment',
    name: 'Assignment',
    description: 'Student submissions',
    icon: FiClipboard,
    color: '#EF4444'
  },
  {
    type: 'live',
    name: 'Live Session',
    description: 'Scheduled live content',
    icon: FiRadio,
    color: '#EC4899'
  }
];

export const LessonForm: React.FC<LessonFormProps> = ({
  courseId,
  moduleId,
  lesson,
  lessonOrder,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<CreatePremiumLessonData>({
    title: lesson?.title || '',
    description: lesson?.description || '',
    lesson_order: lesson?.lesson_order || lessonOrder,
    lesson_type: lesson?.lesson_type || 'video',
    video_url: lesson?.video_url || '',
    video_duration_seconds: lesson?.video_duration_seconds || undefined,
    video_thumbnail_url: lesson?.video_thumbnail_url || '',
    video_quality_levels: lesson?.video_quality_levels || {},
    content_data: lesson?.content_data || {},
    is_preview: lesson?.is_preview || false,
    is_mandatory: lesson?.is_mandatory !== false, // Default to true
    estimated_duration_minutes: lesson?.estimated_duration_minutes || undefined,
    downloadable_resources: lesson?.downloadable_resources || []
  });
  
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [generalError, setGeneralError] = useState('');
  const [videoUploading, setVideoUploading] = useState(false);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Lesson title is required';
    } else if (formData.title.length < 3) {
      newErrors.title = 'Lesson title must be at least 3 characters';
    } else if (formData.title.length > 200) {
      newErrors.title = 'Lesson title must be 200 characters or less';
    }
    
    if (formData.description && formData.description.length > 1000) {
      newErrors.description = 'Description must be 1000 characters or less';
    }
    
    if (formData.lesson_type === 'video' && !formData.video_url?.trim() && !videoUploading) {
      newErrors.video_url = 'Please upload a video or enter a video URL for video lessons';
    }
    
    if (formData.estimated_duration_minutes && formData.estimated_duration_minutes < 1) {
      newErrors.estimated_duration_minutes = 'Duration must be at least 1 minute';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    
    if (!validateForm()) {
      return;
    }
    
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting lesson:', error);
      setGeneralError('Failed to save lesson. Please try again.');
    }
  };

  const handleChange = (field: keyof CreatePremiumLessonData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear errors
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    if (generalError) {
      setGeneralError('');
    }
  };

  const handleVideoUploadComplete = (videoData: any) => {
    handleChange('video_url', videoData.id); // Use video ID instead of UUID
    handleChange('video_duration_seconds', videoData.duration);
    handleChange('video_thumbnail_url', videoData.thumbnailUrl);
    
    // Store quality levels for adaptive streaming
    if (videoData.qualities) {
      handleChange('video_quality_levels', {
        qualities: videoData.qualities,
        hlsUrl: videoData.hlsUrl
      });
    }
    
    setVideoUploading(false);
  };

  const handleVideoUploadError = (error: string) => {
    setGeneralError(error);
    setVideoUploading(false);
  };

  const addResource = () => {
    // TODO: Implement resource upload/selection
    const newResource = {
      name: 'Sample Resource.pdf',
      url: 'https://example.com/resource.pdf',
      size: '2.5 MB',
      type: 'application/pdf'
    };
    
    handleChange('downloadable_resources', [
      ...formData.downloadable_resources,
      newResource
    ]);
  };

  const removeResource = (index: number) => {
    const newResources = formData.downloadable_resources.filter((_: any, i: number) => i !== index);
    handleChange('downloadable_resources', newResources);
  };

  const selectedLessonType = lessonTypes.find(type => type.type === formData.lesson_type);

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
          <HeaderTitle>
            {selectedLessonType && <selectedLessonType.icon style={{ marginRight: '8px', verticalAlign: 'middle' }} />}
            {lesson ? 'Edit Lesson' : 'Create New Lesson'}
          </HeaderTitle>
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
              
              <FormSection>
                <SectionTitle>Basic Information</SectionTitle>
                
                <FormField>
                  <FormLabel $required>Lesson Title</FormLabel>
                  <Input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="e.g., Understanding useState Hook"
                    $hasError={!!errors.title}
                    disabled={isLoading}
                  />
                  {errors.title && <FormError>{errors.title}</FormError>}
                  <FormHelperText>
                    {formData.title.length}/200 characters
                  </FormHelperText>
                </FormField>
                
                <FormField>
                  <FormLabel>Lesson Description</FormLabel>
                  <TextArea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Describe what students will learn in this lesson..."
                    disabled={isLoading}
                  />
                  {errors.description && <FormError>{errors.description}</FormError>}
                  <FormHelperText>
                    {formData.description?.length || 0}/1000 characters • Optional but recommended for better course organization
                  </FormHelperText>
                </FormField>
                
                <FormRow>
                  <FormField>
                    <FormLabel>Estimated Duration (minutes)</FormLabel>
                    <Input
                      type="number"
                      value={formData.estimated_duration_minutes || ''}
                      onChange={(e) => handleChange('estimated_duration_minutes', parseInt(e.target.value) || undefined)}
                      min="1"
                      max="480"
                      placeholder="15"
                      $hasError={!!errors.estimated_duration_minutes}
                      disabled={isLoading}
                    />
                    {errors.estimated_duration_minutes && <FormError>{errors.estimated_duration_minutes}</FormError>}
                    <FormHelperText>
                      Optional: Helps students plan their time (1-480 minutes)
                    </FormHelperText>
                  </FormField>
                </FormRow>
              </FormSection>
              
              <FormSection>
                <SectionTitle>Lesson Type</SectionTitle>
                
                <LessonTypeSelector>
                  {lessonTypes.map((type) => (
                    <LessonTypeCard
                      key={type.type}
                      type="button"
                      $isSelected={formData.lesson_type === type.type}
                      $color={type.color}
                      onClick={() => handleChange('lesson_type', type.type)}
                      disabled={isLoading}
                    >
                      <type.icon />
                      <p className="type-name">{type.name}</p>
                      <p className="type-desc">{type.description}</p>
                    </LessonTypeCard>
                  ))}
                </LessonTypeSelector>
              </FormSection>
              
              {formData.lesson_type === 'video' && (
                <FormSection>
                  <SectionTitle>
                    <FiVideo /> Video Content
                  </SectionTitle>
                  
                  {!formData.video_url ? (
                    <VideoUploader
                      courseId={courseId}
                      lessonId={lesson?.lesson_id || 'new'}
                      onUploadComplete={handleVideoUploadComplete}
                      onUploadError={handleVideoUploadError}
                      disabled={isLoading}
                    />
                  ) : (
                    <VideoPreview>
                      <FiPlay size={24} style={{ color: '#8B5CF6' }} />
                      <div className="video-info">
                        <h4>Video Ready</h4>
                        <p>Video ID: {formData.video_url}</p>
                        {formData.video_duration_seconds && (
                          <p>Duration: {Math.floor(formData.video_duration_seconds / 60)}:{(formData.video_duration_seconds % 60).toString().padStart(2, '0')}</p>
                        )}
                        {formData.video_thumbnail_url && (
                          <p style={{ fontSize: '12px', color: '#666' }}>Thumbnail available</p>
                        )}
                      </div>
                      <div className="video-actions">
                        <ModernButton variant="ghost" size="small">
                          <FiPlay /> Preview
                        </ModernButton>
                        <ModernButton 
                          variant="ghost" 
                          size="small"
                          onClick={() => {
                            handleChange('video_url', '');
                            handleChange('video_duration_seconds', undefined);
                            handleChange('video_thumbnail_url', '');
                            handleChange('video_quality_levels', {});
                          }}
                        >
                          <FiX /> Remove
                        </ModernButton>
                      </div>
                    </VideoPreview>
                  )}
                  
                  {/* Manual URL input as fallback */}
                  <div style={{ marginTop: '16px' }}>
                    <FormField>
                      <FormLabel>Or enter video ID manually</FormLabel>
                      <Input
                        type="text"
                        value={formData.video_url}
                        onChange={(e) => handleChange('video_url', e.target.value)}
                        placeholder="vid_1234567890_abc123def or external URL"
                        $hasError={!!errors.video_url}
                        disabled={isLoading}
                      />
                      {errors.video_url && <FormError>{errors.video_url}</FormError>}
                      <FormHelperText>
                        You can upload a video above or enter a video ID from your server or external video URL
                      </FormHelperText>
                    </FormField>
                  </div>
                </FormSection>
              )}
              
              <FormSection>
                <SectionTitle>
                  <FiDownload /> Downloadable Resources
                </SectionTitle>
                
                <ResourcesList>
                  {formData.downloadable_resources.map((resource: any, index: number) => (
                    <ResourceItem key={index}>
                      <FiDownload />
                      <div className="resource-info">
                        <div className="resource-name">{resource.name}</div>
                        <div className="resource-size">{resource.size}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeResource(index)}
                      >
                        <FiX />
                      </button>
                    </ResourceItem>
                  ))}
                  
                  <ModernButton
                    variant="ghost"
                    onClick={addResource}
                    disabled={isLoading}
                  >
                    <FiPlus /> Add Resource
                  </ModernButton>
                </ResourcesList>
              </FormSection>
              
              <FormSection>
                <SectionTitle>
                  <FiSettings /> Lesson Settings
                </SectionTitle>
                
                <FormGrid>
                  <CheckboxField>
                    <Checkbox
                      type="checkbox"
                      id="is_preview"
                      checked={formData.is_preview}
                      onChange={(e) => handleChange('is_preview', e.target.checked)}
                      disabled={isLoading}
                    />
                    <CheckboxContent>
                      <CheckboxLabel htmlFor="is_preview">
                        <FiEye style={{ marginRight: '4px' }} />
                        Preview Lesson
                      </CheckboxLabel>
                      <CheckboxDescription>
                        Allow non-enrolled students to view this lesson as a preview.
                      </CheckboxDescription>
                    </CheckboxContent>
                  </CheckboxField>
                  
                  <CheckboxField>
                    <Checkbox
                      type="checkbox"
                      id="is_mandatory"
                      checked={formData.is_mandatory}
                      onChange={(e) => handleChange('is_mandatory', e.target.checked)}
                      disabled={isLoading}
                    />
                    <CheckboxContent>
                      <CheckboxLabel htmlFor="is_mandatory">
                        <FiCheck style={{ marginRight: '4px' }} />
                        Mandatory Lesson
                      </CheckboxLabel>
                      <CheckboxDescription>
                        Students must complete this lesson to progress.
                      </CheckboxDescription>
                    </CheckboxContent>
                  </CheckboxField>
                </FormGrid>
              </FormSection>
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
            disabled={isLoading || videoUploading}
          >
            <FiSave />
            {lesson ? 'Update Lesson' : 'Create Lesson'}
          </ModernButton>
        </FormFooter>
      </FormContainer>
    </Overlay>
  );
};