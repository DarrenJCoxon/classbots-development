// src/components/teacher/EnhancedRagUploader.tsx
'use client';

import { useState, useRef, ChangeEvent } from 'react';
import styled from 'styled-components';
import { Button, Alert } from '@/styles/StyledComponents';

// Styled components for the uploader
const UploaderContainer = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  background-color: ${({ theme }) => theme.colors.backgroundCard};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  padding: ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const UploadArea = styled.div`
  border: 2px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  padding: ${({ theme }) => theme.spacing.lg};
  text-align: center;
  transition: all ${({ theme }) => theme.transitions.fast};
  cursor: pointer;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    background-color: ${({ theme }) => `${theme.colors.primary}05`};
  }
`;

const FileInput = styled.input`
  display: none;
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

const SectionTitle = styled.h3`
  font-size: 1.1rem;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  color: ${({ theme }) => theme.colors.text};
`;

const SelectedFileContainer = styled.div`
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

const ProgressBar = styled.div`
  width: 100%;
  height: 12px;
  background-color: ${({ theme }) => theme.colors.backgroundDark};
  border-radius: ${({ theme }) => theme.borderRadius.small};
  margin-top: ${({ theme }) => theme.spacing.md};
  overflow: hidden;
`;

const Progress = styled.div<{ $progress: number }>`
  height: 100%;
  width: ${props => props.$progress}%;
  background-color: ${({ theme }) => theme.colors.primary};
  transition: width 0.3s ease;
`;

const StatusText = styled.div`
  font-size: 0.9rem;
  margin-top: ${({ theme }) => theme.spacing.sm};
  color: ${({ theme }) => theme.colors.textLight};
`;

interface EnhancedRagUploaderProps {
  chatbotId: string;
  onUploadSuccess?: () => void;
}

export default function EnhancedRagUploader({ chatbotId, onUploadSuccess }: EnhancedRagUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
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
      setStatus('Document uploaded. Starting processing...');
      setSuccessMessage('Document uploaded successfully! Processing...');
      
      // Process the uploaded document
      setProcessing(true);
      console.log(`Processing document ID: ${uploadedDocumentId} for chatbot: ${chatbotId}`);
      const processResponse = await fetch(`/api/teacher/chatbots/${chatbotId}/vectorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: documentIdForProcessing }),
      });
      
      if (!processResponse.ok) {
        const data = await processResponse.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to process document');
      }
      
      setProgress(100);
      setStatus('Document processed successfully!');
      setSuccessMessage('Document uploaded and processing started. It will be available for RAG soon.');
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setFile(null);
      
      // Notify parent
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (err) {
      console.error('Error uploading document:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload document');
      setStatus('Error occurred');
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  return (
    <UploaderContainer>
      <SectionTitle>Upload Documents for Knowledge Base</SectionTitle>
      
      {error && <Alert variant="error" style={{ marginBottom: '16px' }}>{error}</Alert>}
      {successMessage && <Alert variant="success" style={{ marginBottom: '16px' }}>{successMessage}</Alert>}
      
      <UploadArea onClick={() => fileInputRef.current?.click()}>
        <FileInput
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.txt"
        />
        <UploadText>Click or drag file to upload</UploadText>
        <FileTypeInfo>Supported: PDF, DOC, DOCX, TXT (Max 10MB)</FileTypeInfo>
        <Button 
          size="small" 
          variant="outline" 
          type="button" 
          onClick={(e) => { 
            e.stopPropagation(); 
            fileInputRef.current?.click();
          }}
        >
          Browse Files
        </Button>
      </UploadArea>
      
      {file && (
        <>
          <SelectedFileContainer>
            <FileName title={file.name}>{file.name}</FileName>
            <FileSize>{formatFileSize(file.size)}</FileSize>
            <Button
              size="small"
              variant="outline"
              onClick={() => setFile(null)}
              disabled={uploading || processing}
            >
              Remove
            </Button>
          </SelectedFileContainer>
          
          <Button
            onClick={handleUpload}
            disabled={uploading || processing}
            style={{ marginTop: '16px', width: '100%' }}
          >
            {uploading || processing ? 'Processing...' : `Upload & Process ${file.name}`}
          </Button>
          
          {(uploading || processing) && (
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