// src/components/teacher/EnhancedRagUploader.tsx
'use client';

import { useState, useRef, ChangeEvent } from 'react';
import styled from 'styled-components';
import { ModernButton } from '@/components/shared/ModernButton';
import type { Document as KnowledgeDocument } from '@/types/knowledge-base.types';

// Styled components for the uploader
const UploaderContainer = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 32px;
  border: 1px solid rgba(152, 93, 215, 0.1);
  box-shadow: 0 8px 32px rgba(152, 93, 215, 0.05);
`;

const UploadArea = styled.div`
  border: 2px dashed rgba(152, 93, 215, 0.3);
  border-radius: 20px;
  padding: ${({ theme }) => theme.spacing.xl};
  text-align: center;
  transition: all 0.3s ease;
  cursor: pointer;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    background: rgba(152, 93, 215, 0.05);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(152, 93, 215, 0.1);
  }
`;

const FileInput = styled.input`
  display: none;
`;

const UploadText = styled.p`
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text};
  font-weight: 600;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.1rem;
`;

const FileTypeInfo = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.875rem;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  font-family: ${({ theme }) => theme.fonts.body};
`;

const SectionTitle = styled.h3`
  font-size: 20px;
  font-weight: 700;
  font-family: ${({ theme }) => theme.fonts.heading};
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.magenta}
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const SelectedFileContainer = styled.div`
  margin-top: ${({ theme }) => theme.spacing.md};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.md};
  background: rgba(152, 93, 215, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(152, 93, 215, 0.2);
`;

const FileName = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.fonts.body};
`;

const FileSize = styled.span`
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.875rem;
  font-weight: 600;
  font-family: ${({ theme }) => theme.fonts.body};
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 12px;
  background: rgba(152, 93, 215, 0.1);
  border-radius: 20px;
  margin-top: ${({ theme }) => theme.spacing.md};
  overflow: hidden;
  border: 1px solid rgba(152, 93, 215, 0.1);
`;

const Progress = styled.div<{ $progress: number }>`
  height: 100%;
  width: ${props => props.$progress}%;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.magenta}
  );
  transition: width 0.3s ease;
  box-shadow: 0 0 10px rgba(152, 93, 215, 0.3);
`;

const StatusText = styled.div`
  font-size: 0.875rem;
  margin-top: ${({ theme }) => theme.spacing.sm};
  color: ${({ theme }) => theme.colors.primary};
  font-family: ${({ theme }) => theme.fonts.body};
  font-weight: 600;
`;

const ModernAlert = styled.div<{ $variant?: 'success' | 'error' }>`
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: 12px;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  backdrop-filter: blur(10px);
  font-family: ${({ theme }) => theme.fonts.body};
  animation: fadeIn 0.3s ease-in-out;
  
  ${({ $variant, theme }) => {
    switch ($variant) {
      case 'success':
        return `
          background: rgba(34, 197, 94, 0.1);
          color: ${theme.colors.green};
          border: 1px solid rgba(34, 197, 94, 0.2);
        `;
      case 'error':
        return `
          background: rgba(239, 68, 68, 0.1);
          color: ${theme.colors.red};
          border: 1px solid rgba(239, 68, 68, 0.2);
        `;
      default:
        return `
          background: rgba(152, 93, 215, 0.1);
          color: ${theme.colors.primary};
          border: 1px solid rgba(152, 93, 215, 0.2);
        `;
    }
  }}
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

interface EnhancedRagUploaderProps {
  chatbotId: string;
  onUploadSuccess?: (document?: KnowledgeDocument) => void;
}

export default function EnhancedRagUploader({ chatbotId, onUploadSuccess }: EnhancedRagUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // Removed unused documentId state
  const [status, setStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setError(null);
    setSuccessMessage(null);
    
    // Check file extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['pdf', 'doc', 'docx', 'txt'];
    
    if (!extension || !validExtensions.includes(extension)) {
      setError('Invalid file type. Please upload PDF, Word (.doc, .docx), or TXT files.');
      return;
    }
    
    // Check file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File too large. Maximum size is 10MB.');
      return;
    }
    
    setFile(file);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleUpload = async () => {
    if (!file || !chatbotId) {
      setError(`Missing required data: ${!file ? 'No file selected' : 'No chatbot ID provided'}`);
      return;
    }
    
    console.log(`Uploading file for chatbot ID: ${chatbotId}`);
    
    setUploading(true);
    setError(null);
    setSuccessMessage(null);
    setProgress(0);
    setStatus('Uploading file...');
    
    try {
      // Create form data for the file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('chatbotId', chatbotId);
      
      // Upload the file
      const uploadResponse = await fetch('/api/teacher/documents', {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        const data = await uploadResponse.json().catch(() => ({}));
        console.error('Upload error response:', data);
        throw new Error(data.error || `Failed to upload document (Status: ${uploadResponse.status})`);
      }
      
      const uploadData = await uploadResponse.json();
      console.log('Upload response data:', uploadData);
      
      // Get document ID from the response - could be in different formats based on API
      const uploadedDocumentId = 
        uploadData.documentId || 
        (uploadData.document && uploadData.document.document_id);
      
      if (!uploadedDocumentId) {
        console.error('Unexpected response format:', uploadData);
        throw new Error('No document ID returned from upload');
      }
      
      // Store documentId for vectorization
      const documentIdForProcessing = uploadedDocumentId;
      setProgress(50);
      setStatus('Document uploaded successfully!');
      setSuccessMessage('Document uploaded! Processing will start automatically.');
      
      // No need to manually process - auto-processing is enabled
      console.log(`Document ${uploadedDocumentId} uploaded. Auto-processing will handle it.`);
      
      setProgress(100);
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setFile(null);
      
      // Notify parent with the document data
      if (onUploadSuccess) {
        onUploadSuccess(uploadData.document);
      }
    } catch (err) {
      console.error('Error uploading document:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload document');
      setStatus('Error occurred');
    } finally {
      setUploading(false);
    }
  };

  return (
    <UploaderContainer>
      <SectionTitle>Upload Documents for Knowledge Base</SectionTitle>
      
      {error && <ModernAlert $variant="error">{error}</ModernAlert>}
      {successMessage && <ModernAlert $variant="success">{successMessage}</ModernAlert>}
      
      <UploadArea onClick={() => fileInputRef.current?.click()}>
        <FileInput
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.txt"
        />
        <UploadText>Click or drag file to upload</UploadText>
        <FileTypeInfo>Supported: PDF, DOC, DOCX, TXT (Max 10MB)</FileTypeInfo>
        <ModernButton 
          size="small" 
          variant="ghost" 
          type="button" 
          onClick={(e) => { 
            e.stopPropagation(); 
            fileInputRef.current?.click();
          }}
        >
          Browse Files
        </ModernButton>
      </UploadArea>
      
      {file && (
        <>
          <SelectedFileContainer>
            <FileName title={file.name}>{file.name}</FileName>
            <FileSize>{formatFileSize(file.size)}</FileSize>
            <ModernButton
              size="small"
              variant="ghost"
              onClick={() => setFile(null)}
              disabled={uploading}
            >
              Remove
            </ModernButton>
          </SelectedFileContainer>
          
          <ModernButton
            onClick={handleUpload}
            disabled={uploading}
            fullWidth
            style={{ marginTop: '16px' }}
          >
            {uploading ? 'Uploading...' : `Upload ${file.name}`}
          </ModernButton>
          
          {uploading && (
            <>
              <ProgressBar>
                <Progress $progress={progress} />
              </ProgressBar>
              <StatusText>{status}</StatusText>
            </>
          )}
        </>
      )}
    </UploaderContainer>
  );
}