import React, { useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FiX, FiSave, FiAlertCircle, FiBookOpen } from 'react-icons/fi';
import { ModernButton } from '@/components/shared/ModernButton';
import { Input, FormField, FormLabel, FormError, FormHelperText } from '@/components/ui';
import type { CreatePremiumModuleData } from '@/types/premium-course.types';

interface ModuleFormProps {
  courseId: string;
  module?: any; // For editing existing modules
  moduleOrder: number; // For new modules
  onSubmit: (moduleData: CreatePremiumModuleData) => Promise<void>;
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
`;

const FormContainer = styled(motion.div)`
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  max-width: 600px;
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

const FormGrid = styled.div`
  display: grid;
  gap: 24px;
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

export const ModuleForm: React.FC<ModuleFormProps> = ({
  courseId,
  module,
  moduleOrder,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<CreatePremiumModuleData>({
    title: module?.title || '',
    description: module?.description || '',
    module_order: module?.module_order || moduleOrder,
    is_preview: module?.is_preview || false,
    unlock_after_module: module?.unlock_after_module || undefined
  });
  
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [generalError, setGeneralError] = useState('');

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Module title is required';
    } else if (formData.title.length < 3) {
      newErrors.title = 'Module title must be at least 3 characters';
    } else if (formData.title.length > 200) {
      newErrors.title = 'Module title must be 200 characters or less';
    }
    
    if (formData.description && formData.description.length > 1000) {
      newErrors.description = 'Description must be 1000 characters or less';
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
      console.error('Error submitting module:', error);
      setGeneralError('Failed to save module. Please try again.');
    }
  };

  const handleChange = (field: keyof CreatePremiumModuleData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear errors
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    if (generalError) {
      setGeneralError('');
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
          <HeaderTitle>
            <FiBookOpen style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            {module ? 'Edit Module' : 'Create New Module'}
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
              
              <FormField>
                <FormLabel $required>Module Title</FormLabel>
                <Input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="e.g., Introduction to React Hooks"
                  $hasError={!!errors.title}
                  disabled={isLoading}
                />
                {errors.title && <FormError>{errors.title}</FormError>}
                <FormHelperText>
                  {formData.title.length}/200 characters
                </FormHelperText>
              </FormField>
              
              <FormField>
                <FormLabel>Module Description</FormLabel>
                <TextArea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Describe what students will learn in this module..."
                  disabled={isLoading}
                />
                {errors.description && <FormError>{errors.description}</FormError>}
                <FormHelperText>
                  {formData.description?.length || 0}/1000 characters • Optional: Provide more details about this module's content
                </FormHelperText>
              </FormField>
              
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
                    Preview Module
                  </CheckboxLabel>
                  <CheckboxDescription>
                    Allow non-enrolled students to view this module as a preview. 
                    Great for showcasing your course content and encouraging enrollments.
                  </CheckboxDescription>
                </CheckboxContent>
              </CheckboxField>
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
            {module ? 'Update Module' : 'Create Module'}
          </ModernButton>
        </FormFooter>
      </FormContainer>
    </Overlay>
  );
};