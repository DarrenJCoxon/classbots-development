// src/components/teacher/DocumentUploader.tsx
'use client';

import { useState, useRef, ChangeEvent, DragEvent } from 'react'; // Added specific event types
import styled from 'styled-components';
import { ModernButton } from '@/components/shared/ModernButton';
import type { DocumentType } from '@/types/knowledge-base.types'; // Ensure this path is correct

const UploaderContainer = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const UploadArea = styled.div<{ $isDragging: boolean }>`
  border: 2px dashed ${({ theme, $isDragging }) => 
    $isDragging ? theme.colors.primary : 'rgba(152, 93, 215, 0.3)'};
  border-radius: 20px;
  padding: ${({ theme }) => theme.spacing.xl};
  text-align: center;
  transition: all 0.3s ease;
  background: ${({ theme, $isDragging }) => 
    $isDragging 
      ? 'rgba(152, 93, 215, 0.1)' 
      : 'rgba(255, 255, 255, 0.8)'};
  backdrop-filter: blur(10px);
  
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    background: rgba(152, 93, 215, 0.05);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(152, 93, 215, 0.1);
  }
  cursor: pointer;
`;

const FileInput = styled.input`
  display: none;
`;

const UploadIcon = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.md};
  font-size: 3rem;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.magenta}
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
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

const SelectedFileContainer = styled.div` // Renamed from SelectedFile to avoid conflict
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

const ProgressFill = styled.div<{ progress: number }>`
  height: 100%;
  width: ${props => props.progress}%;
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

import type { Document as KnowledgeDocument } from '@/types/knowledge-base.types';

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

interface DocumentUploaderProps {
  chatbotId: string;
  onUploadSuccess: (document?: KnowledgeDocument) => void; // Callback after successful upload
}

export default function DocumentUploader({ chatbotId, onUploadSuccess }: DocumentUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setError(null);
    setSuccessMessage(null);
    const validTypes: DocumentType[] = ['pdf', 'docx', 'txt'];
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (!extension || (!validTypes.includes(extension as DocumentType) && extension !== 'doc')) {
      setError('Invalid file type. Please upload PDF, Word (.doc, .docx), or TXT.');
      setSelectedFile(null);
      return;
    }
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError('File too large. Maximum size is 10MB.');
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);
    setSuccessMessage(null);
    setUploadProgress(0);
    setUploadStatus('Preparing upload...');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('chatbotId', chatbotId); // << MODIFICATION: Add chatbotId to FormData

    try {
      // Simulate progress for file preparation
      setUploadProgress(10);
      setUploadStatus('Uploading file...');
      
      // << MODIFICATION: Change API endpoint >>
      const response = await fetch('/api/teacher/documents', {
        method: 'POST',
        body: formData,
      });

      // Simulate progress during upload
      setUploadProgress(50);
      setUploadStatus('Processing document...');

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload document');
      }
      
      // Complete progress
      setUploadProgress(100);
      setUploadStatus('Upload complete!');
      
      setSuccessMessage(data.message || 'Document uploaded and processing started automatically!');
      setSelectedFile(null); 
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Reset file input
      }
      // Pass the document data to the parent component for immediate display
      onUploadSuccess(data.document); // Call parent callback with the new document
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred during upload.');
    } finally {
      setIsUploading(false);
      // Reset progress after a short delay
      setTimeout(() => {
        setUploadProgress(0);
        setUploadStatus('');
      }, 2000);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <UploaderContainer>
      {error && <ModernAlert $variant="error">{error}</ModernAlert>}
      {successMessage && <ModernAlert $variant="success">{successMessage}</ModernAlert>}
      
      <UploadArea
        $isDragging={isDragging}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <FileInput
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.txt"
        />
        <UploadIcon>📄</UploadIcon> {/* Replace with actual icon if you have one */}
        <UploadText>{isDragging ? 'Drop your file here' : 'Click or drag file to upload'}</UploadText>
        <FileTypeInfo style={{ marginTop: '8px', marginBottom: '8px' }}>
          Documents will be automatically processed after upload
        </FileTypeInfo>
        <FileTypeInfo>Supported: PDF, DOC, DOCX, TXT (Max 10MB)</FileTypeInfo>
        {!selectedFile && (
            <ModernButton size="small" variant="ghost" type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click();}}>
                Browse Files
            </ModernButton>
        )}
      </UploadArea>

      {selectedFile && (
        <>
          <SelectedFileContainer>
            <FileName title={selectedFile.name}>{selectedFile.name}</FileName>
            <FileSize>{formatFileSize(selectedFile.size)}</FileSize>
            <ModernButton               size="small"
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if(fileInputRef.current) fileInputRef.current.value = ""; setError(null);}}
              type="button"
            >
              Remove
            </ModernButton>
          </SelectedFileContainer>
          
          <ModernButton             onClick={handleUpload}
            disabled={isUploading}
            fullWidth
            style={{ marginTop: '16px' }}
            type="button"
          >
            {isUploading ? 'Uploading...' : `Upload ${selectedFile.name}`}
          </ModernButton>
          
          {isUploading && (
            <>
              <ProgressBar>
                <ProgressFill progress={uploadProgress} />
              </ProgressBar>
              <StatusText>{uploadStatus}</StatusText>
            </>
          )}
        </>
      )}
    </UploaderContainer>
  );
}