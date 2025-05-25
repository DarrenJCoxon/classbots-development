// src/components/teacher/ReadingDocumentUploader.tsx
'use client';

import { useState, useRef, ChangeEvent, DragEvent, useEffect } from 'react';
import styled from 'styled-components';
import { Button, Alert } from '@/styles/StyledComponents';

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
  font-size: 3rem;
`;

const UploadText = styled.p`
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text};
  font-weight: 500;
`;

const FileTypeInfo = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.875rem;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const CurrentDocumentContainer = styled.div`
  margin-top: ${({ theme }) => theme.spacing.lg};
  padding: ${({ theme }) => theme.spacing.lg};
  background-color: ${({ theme }) => theme.colors.backgroundDark};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const DocumentInfo = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const DocumentName = styled.h4`
  margin: 0;
  font-size: 1.1rem;
  color: ${({ theme }) => theme.colors.text};
`;

const DocumentMeta = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.875rem;
`;

const PreviewButton = styled(Button)`
  margin-right: ${({ theme }) => theme.spacing.sm};
`;

interface ReadingDocument {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  created_at: string;
  updated_at: string;
}

interface ReadingDocumentUploaderProps {
  chatbotId: string;
  onUploadSuccess?: () => void;
}

export default function ReadingDocumentUploader({ chatbotId, onUploadSuccess }: ReadingDocumentUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentDocument, setCurrentDocument] = useState<ReadingDocument | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch current reading document on mount
  useEffect(() => {
    fetchCurrentDocument();
  }, [chatbotId]);

  const fetchCurrentDocument = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/teacher/chatbots/${chatbotId}/reading-document`);
      const data = await response.json();
      
      if (response.ok && data.document) {
        setCurrentDocument(data.document);
      }
    } catch (err) {
      console.error('Error fetching reading document:', err);
    } finally {
      setIsLoading(false);
    }
  };

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
    
    // Only accept PDF files
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are allowed for reading documents');
      setSelectedFile(null);
      return;
    }
    
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      setError('File too large. Maximum size is 20MB.');
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

    try {
      const response = await fetch(`/api/teacher/chatbots/${chatbotId}/reading-document`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload reading document');
      }
      
      setSuccessMessage('Reading document uploaded successfully!');
      setSelectedFile(null);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      // Refresh the current document
      await fetchCurrentDocument();
      
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during upload.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentDocument || !confirm('Are you sure you want to delete the current reading document?')) {
      return;
    }

    setError(null);
    try {
      const response = await fetch(`/api/teacher/chatbots/${chatbotId}/reading-document`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete reading document');
      }

      setSuccessMessage('Reading document deleted successfully');
      setCurrentDocument(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <UploaderContainer>
        <Alert variant="info">Loading reading document...</Alert>
      </UploaderContainer>
    );
  }

  return (
    <UploaderContainer>
      {error && <Alert variant="error" style={{ marginBottom: '16px' }}>{error}</Alert>}
      {successMessage && <Alert variant="success" style={{ marginBottom: '16px' }}>{successMessage}</Alert>}
      
      {currentDocument ? (
        <CurrentDocumentContainer>
          <DocumentInfo>
            <div>
              <DocumentName>📖 {currentDocument.file_name}</DocumentName>
              <DocumentMeta>
                {formatFileSize(currentDocument.file_size)} • Uploaded {formatDate(currentDocument.updated_at || currentDocument.created_at)}
              </DocumentMeta>
            </div>
          </DocumentInfo>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <PreviewButton
              variant="outline"
              size="small"
              onClick={() => window.open(currentDocument.file_url, '_blank')}
            >
              Preview PDF
            </PreviewButton>
            <Button
              variant="outline"
              size="small"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
          
          <Alert variant="info" style={{ marginTop: '16px' }}>
            To replace this document, upload a new PDF file below.
          </Alert>
        </CurrentDocumentContainer>
      ) : null}
      
      <UploadArea
        $isDragging={isDragging}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{ marginTop: currentDocument ? '16px' : '0' }}
      >
        <FileInput
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf"
        />
        <UploadIcon>📖</UploadIcon>
        <UploadText>
          {currentDocument 
            ? 'Click or drag to upload a new reading document'
            : 'Click or drag to upload your reading document'
          }
        </UploadText>
        <FileTypeInfo>PDF files only (Max 20MB)</FileTypeInfo>
        {!selectedFile && (
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
        )}
      </UploadArea>

      {selectedFile && (
        <>
          <div style={{
            marginTop: '16px',
            padding: '16px',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <strong>{selectedFile.name}</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: '#666' }}>
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <Button
              size="small"
              variant="outline"
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
                setError(null);
              }}
              type="button"
            >
              Remove
            </Button>
          </div>
          
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