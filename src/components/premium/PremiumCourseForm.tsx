import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiSave, FiAlertCircle, FiDollarSign, FiGlobe, FiUsers } from 'react-icons/fi';
import { ModernButton } from '@/components/shared/ModernButton';
import { Input, FormField, FormLabel, FormError, FormHelperText } from '@/components/ui';
import type { CreatePremiumCourseData, PremiumCourse } from '@/types/premium-course.types';

interface PremiumCourseFormProps {
  course?: PremiumCourse | null;
  onSubmit: (courseData: CreatePremiumCourseData) => Promise<void>;
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

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
  }
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
  margin: 0 0 16px 0;
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

const Select = styled.select`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid rgba(152, 93, 215, 0.2);
  border-radius: 12px;
  font-size: 16px;
  font-family: inherit;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 4px rgba(152, 93, 215, 0.1);
  }
`;

const PriceRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 120px 100px;
  gap: 16px;
  align-items: end;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
  }
`;

const TagsInput = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 16px;
  border: 2px solid rgba(152, 93, 215, 0.2);
  border-radius: 12px;
  min-height: 50px;
  background: white;
  transition: all 0.3s ease;
  
  &:focus-within {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 4px rgba(152, 93, 215, 0.1);
  }
`;

const Tag = styled.span`
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.magenta}
  );
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  
  button {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    
    &:hover {
      opacity: 0.7;
    }
  }
`;

const TagInput = styled.input`
  border: none;
  outline: none;
  background: none;
  flex: 1;
  min-width: 100px;
  font-size: 16px;
  
  &::placeholder {
    color: ${({ theme }) => theme.colors.textLight};
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

const categories = [
  'Programming',
  'Design',
  'Business',
  'Marketing',
  'Photography',
  'Music',
  'Health & Fitness',
  'Language',
  'Lifestyle',
  'Personal Development',
  'Teaching & Academics',
  'Other'
];

const difficultyLevels = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' }
];

const priceTypes = [
  { value: 'free', label: 'Free' },
  { value: 'one_time', label: 'One-time Payment' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'tiered', label: 'Tiered Pricing' }
];

const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];

export const PremiumCourseForm: React.FC<PremiumCourseFormProps> = ({
  course,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<CreatePremiumCourseData>({
    title: course?.title || '',
    slug: course?.slug || '',
    description: course?.description || '',
    short_description: course?.short_description || '',
    thumbnail_url: course?.thumbnail_url || '',
    trailer_video_url: course?.trailer_video_url || '',
    difficulty_level: course?.difficulty_level || 'beginner',
    estimated_duration_hours: course?.estimated_duration_hours || 1,
    language: course?.language || 'en',
    category: course?.category || '',
    tags: course?.tags || [],
    price_type: course?.price_type || 'free',
    price_amount: course?.price_amount || 0,
    currency: course?.currency || 'USD',
    requires_approval: course?.requires_approval || false,
    max_students: course?.max_students || undefined,
    meta_title: course?.meta_title || '',
    meta_description: course?.meta_description || ''
  });
  
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [generalError, setGeneralError] = useState('');
  const [tagInput, setTagInput] = useState('');

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Course title is required';
    }
    
    if (!formData.slug.trim()) {
      newErrors.slug = 'URL slug is required';
    }
    
    if (formData.price_type !== 'free' && formData.price_amount <= 0) {
      newErrors.price_amount = 'Price must be greater than 0 for paid courses';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
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
      console.error('Error submitting course:', error);
      setGeneralError('Failed to save course. Please try again.');
    }
  };

  const handleChange = (field: keyof CreatePremiumCourseData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-generate slug from title
    if (field === 'title' && !course) {
      setFormData(prev => ({ ...prev, slug: generateSlug(value) }));
    }
    
    // Clear errors
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    if (generalError) {
      setGeneralError('');
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
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
          <HeaderTitle>{course ? 'Edit Course' : 'Create New Premium Course'}</HeaderTitle>
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
                  <FormLabel $required>Course Title</FormLabel>
                  <Input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="e.g., Complete React Development Masterclass"
                    $hasError={!!errors.title}
                    disabled={isLoading}
                  />
                  {errors.title && <FormError>{errors.title}</FormError>}
                </FormField>
                
                <FormField>
                  <FormLabel $required>URL Slug</FormLabel>
                  <Input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => handleChange('slug', e.target.value)}
                    placeholder="complete-react-development-masterclass"
                    $hasError={!!errors.slug}
                    disabled={isLoading}
                  />
                  {errors.slug && <FormError>{errors.slug}</FormError>}
                  <FormHelperText>This will be used in the course URL</FormHelperText>
                </FormField>
                
                <FormField>
                  <FormLabel>Short Description</FormLabel>
                  <TextArea
                    value={formData.short_description}
                    onChange={(e) => handleChange('short_description', e.target.value)}
                    placeholder="A brief, compelling description for course cards and previews..."
                    disabled={isLoading}
                    style={{ minHeight: '80px' }}
                  />
                  <FormHelperText>
                    {formData.short_description?.length || 0}/500 characters
                  </FormHelperText>
                </FormField>
                
                <FormField>
                  <FormLabel>Full Description</FormLabel>
                  <TextArea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Detailed course description, what students will learn, prerequisites, etc..."
                    disabled={isLoading}
                  />
                </FormField>
              </FormSection>
              
              <FormSection>
                <SectionTitle>Course Details</SectionTitle>
                
                <FormRow>
                  <FormField>
                    <FormLabel>Category</FormLabel>
                    <Select
                      value={formData.category}
                      onChange={(e) => handleChange('category', e.target.value)}
                      disabled={isLoading}
                    >
                      <option value="">Select a category</option>
                      {categories.map(category => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  
                  <FormField>
                    <FormLabel>Difficulty Level</FormLabel>
                    <Select
                      value={formData.difficulty_level}
                      onChange={(e) => handleChange('difficulty_level', e.target.value)}
                      disabled={isLoading}
                    >
                      {difficultyLevels.map(level => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                </FormRow>
                
                <FormRow>
                  <FormField>
                    <FormLabel>Estimated Duration (Hours)</FormLabel>
                    <Input
                      type="number"
                      value={formData.estimated_duration_hours}
                      onChange={(e) => handleChange('estimated_duration_hours', parseInt(e.target.value) || 0)}
                      min="1"
                      disabled={isLoading}
                    />
                  </FormField>
                  
                  <FormField>
                    <FormLabel>Language</FormLabel>
                    <Input
                      type="text"
                      value={formData.language}
                      onChange={(e) => handleChange('language', e.target.value)}
                      placeholder="en"
                      disabled={isLoading}
                    />
                  </FormField>
                </FormRow>
                
                <FormField>
                  <FormLabel>Tags</FormLabel>
                  <TagsInput>
                    {formData.tags?.map(tag => (
                      <Tag key={tag}>
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)}>
                          <FiX size={12} />
                        </button>
                      </Tag>
                    ))}
                    <TagInput
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      onBlur={addTag}
                      placeholder="Add tags..."
                      disabled={isLoading}
                    />
                  </TagsInput>
                  <FormHelperText>Press Enter or comma to add tags</FormHelperText>
                </FormField>
              </FormSection>
              
              <FormSection>
                <SectionTitle>
                  <FiDollarSign />
                  Pricing
                </SectionTitle>
                
                <PriceRow>
                  <FormField>
                    <FormLabel>Price Type</FormLabel>
                    <Select
                      value={formData.price_type}
                      onChange={(e) => handleChange('price_type', e.target.value)}
                      disabled={isLoading}
                    >
                      {priceTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  
                  {formData.price_type !== 'free' && (
                    <>
                      <FormField>
                        <FormLabel>Price</FormLabel>
                        <Input
                          type="number"
                          value={formData.price_amount}
                          onChange={(e) => handleChange('price_amount', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          $hasError={!!errors.price_amount}
                          disabled={isLoading}
                        />
                        {errors.price_amount && <FormError>{errors.price_amount}</FormError>}
                      </FormField>
                      
                      <FormField>
                        <FormLabel>Currency</FormLabel>
                        <Select
                          value={formData.currency}
                          onChange={(e) => handleChange('currency', e.target.value)}
                          disabled={isLoading}
                        >
                          {currencies.map(currency => (
                            <option key={currency} value={currency}>
                              {currency}
                            </option>
                          ))}
                        </Select>
                      </FormField>
                    </>
                  )}
                </PriceRow>
              </FormSection>
              
              <FormSection>
                <SectionTitle>Media & SEO</SectionTitle>
                
                <FormRow>
                  <FormField>
                    <FormLabel>Thumbnail URL</FormLabel>
                    <Input
                      type="url"
                      value={formData.thumbnail_url}
                      onChange={(e) => handleChange('thumbnail_url', e.target.value)}
                      placeholder="https://example.com/thumbnail.jpg"
                      disabled={isLoading}
                    />
                  </FormField>
                  
                  <FormField>
                    <FormLabel>Trailer Video URL</FormLabel>
                    <Input
                      type="url"
                      value={formData.trailer_video_url}
                      onChange={(e) => handleChange('trailer_video_url', e.target.value)}
                      placeholder="https://example.com/trailer.mp4"
                      disabled={isLoading}
                    />
                  </FormField>
                </FormRow>
                
                <FormRow>
                  <FormField>
                    <FormLabel>Meta Title</FormLabel>
                    <Input
                      type="text"
                      value={formData.meta_title}
                      onChange={(e) => handleChange('meta_title', e.target.value)}
                      placeholder="SEO title for search engines"
                      disabled={isLoading}
                    />
                  </FormField>
                  
                  <FormField>
                    <FormLabel>Meta Description</FormLabel>
                    <Input
                      type="text"
                      value={formData.meta_description}
                      onChange={(e) => handleChange('meta_description', e.target.value)}
                      placeholder="SEO description for search engines"
                      disabled={isLoading}
                    />
                  </FormField>
                </FormRow>
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
            disabled={isLoading}
          >
            <FiSave />
            {course ? 'Update Course' : 'Create Course'}
          </ModernButton>
        </FormFooter>
      </FormContainer>
    </Overlay>
  );
};