// src/components/teacher/DocumentUploader.tsx
'use client';

import { useState, useRef, ChangeEvent, DragEvent } from 'react'; // Added specific event types
import styled from 'styled-components';
import { Button, Alert } from '@/styles/StyledComponents';
import type { DocumentType } from '@/types/knowledge-base.types'; // Ensure this path is correct

const UploaderContainer = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const UploadArea = styled.div<{ $isDragging: boolean }>`
  border: 2px dashed ${({ theme, $isDragging }) => 
    $isDragging ? theme.colors.primary : theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  padding: ${({ theme }) => theme.spacing.xl};
  text-align: center;
  transition: all ${({ theme }) => theme.transitions.fast};
  background-color: ${({ theme, $isDragging }) => 
    $isDragging ? `${theme.colors.primary}10` : theme.colors.backgroundCard};
  
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    background-color: ${({ theme }) => `${theme.colors.primary}05`};
  }
  cursor: pointer;
`;

const FileInput = styled.input`
  display: none;
`;

const UploadIcon = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.md};
  font-size: 2rem;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const UploadText = styled.p`
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text};
`;

const FileTypeInfo = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.875rem;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const SelectedFileContainer = styled.div` // Renamed from SelectedFile to avoid conflict
  margin-top: ${({ theme }) => theme.spacing.md};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.md};
  background-color: ${({ theme }) => theme.colors.backgroundDark};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
`;

const FileName = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const FileSize = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.875rem;
`;

import type { Document as KnowledgeDocument } from '@/types/knowledge-base.types';

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

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('chatbotId', chatbotId); // << MODIFICATION: Add chatbotId to FormData

    try {
      // << MODIFICATION: Change API endpoint >>
      const response = await fetch('/api/teacher/documents', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload document');
      }
      
      setSuccessMessage(data.message || 'Document uploaded successfully!');
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
      {error && <Alert variant="error" style={{ marginBottom: '16px' }}>{error}</Alert>}
      {successMessage && <Alert variant="success" style={{ marginBottom: '16px' }}>{successMessage}</Alert>}
      
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
        <FileTypeInfo>Supported: PDF, DOC, DOCX, TXT (Max 10MB)</FileTypeInfo>
        {!selectedFile && (
            <Button size="small" variant="outline" type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click();}}>
                Browse Files
            </Button>
        )}
      </UploadArea>

      {selectedFile && (
        <>
          <SelectedFileContainer>
            <FileName title={selectedFile.name}>{selectedFile.name}</FileName>
            <FileSize>{formatFileSize(selectedFile.size)}</FileSize>
            <Button
              size="small"
              variant="outline"
              onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if(fileInputRef.current) fileInputRef.current.value = ""; setError(null);}}
              type="button"
            >
              Remove
            </Button>
          </SelectedFileContainer>
          
          <Button
            onClick={handleUpload}
            disabled={isUploading}
            style={{ marginTop: '16px', width: '100%' }}
            type="button"
          >
            {isUploading ? 'Uploading...' : `Upload ${selectedFile.name}`}
          </Button>
        </>
      )}
    </UploaderContainer>
  );
}