// src/components/teacher/ReadingDocumentUploader.tsx
'use client';

import { useState, useRef, ChangeEvent, DragEvent, useEffect } from 'react';
import styled from 'styled-components';
import { ModernButton } from '@/components/shared/ModernButton';

const UploaderContainer = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 32px;
  border: 1px solid rgba(152, 93, 215, 0.1);
  box-shadow: 0 8px 32px rgba(152, 93, 215, 0.05);
`;

const UploadArea = styled.div<{ $isDragging: boolean }>`
  border: 2px dashed rgba(152, 93, 215, 0.3);
  border-radius: 20px;
  padding: ${({ theme }) => theme.spacing.xl};
  text-align: center;
  transition: all 0.3s ease;
  cursor: pointer;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  background: ${({ $isDragging }) => 
    $isDragging ? 'rgba(152, 93, 215, 0.1)' : 'rgba(255, 255, 255, 0.8)'};
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

const CurrentDocumentContainer = styled.div`
  margin-top: ${({ theme }) => theme.spacing.lg};
  padding: ${({ theme }) => theme.spacing.lg};
  background: rgba(152, 93, 215, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(152, 93, 215, 0.2);
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

const PreviewButton = styled(ModernButton)`
  margin-right: ${({ theme }) => theme.spacing.sm};
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

const ModernAlert = styled.div<{ $variant?: 'success' | 'error' | 'info' }>`
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
          background: rgba(76, 190, 243, 0.1);
          color: ${theme.colors.success};
          border: 1px solid rgba(76, 190, 243, 0.2);
        `;
      case 'error':
        return `
          background: rgba(254, 67, 114, 0.1);
          color: ${theme.colors.danger};
          border: 1px solid rgba(254, 67, 114, 0.2);
        `;
      case 'info':
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
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
    setUploadProgress(0);
    setUploadStatus('Preparing upload...');

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      // Use XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      
      // Create a promise to handle the async operation
      const uploadPromise = new Promise<any>((resolve, reject) => {
        // Track upload progress
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percentComplete * 0.9); // 90% for upload
            setUploadStatus(`Uploading... ${percentComplete}%`);
          }
        });
        
        // Handle completion
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (e) {
              reject(new Error('Invalid response format'));
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.error || `Upload failed (Status: ${xhr.status})`));
            } catch (e) {
              reject(new Error(`Upload failed (Status: ${xhr.status})`));
            }
          }
        });
        
        // Handle errors
        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });
        
        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelled'));
        });
        
        // Start the upload
        xhr.open('POST', `/api/teacher/chatbots/${chatbotId}/reading-document`);
        xhr.send(formData);
      });
      
      // Wait for upload to complete
      const data = await uploadPromise;
      console.log('Upload response data:', data);
      
      setUploadProgress(95);
      setUploadStatus('Finalizing...');
      
      setUploadProgress(100);
      setUploadStatus('Upload complete!');
      setSuccessMessage('Reading document uploaded successfully!');
      
      // Clear the file input after a short delay
      setTimeout(() => {
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setUploadProgress(0);
        setUploadStatus('');
      }, 1500);
      
      // Refresh the current document
      await fetchCurrentDocument();
      
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during upload.');
      setUploadProgress(0);
      setUploadStatus('');
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
        <ModernAlert $variant="info">Loading reading document...</ModernAlert>
      </UploaderContainer>
    );
  }

  return (
    <UploaderContainer>
      {error && <ModernAlert $variant="error">{error}</ModernAlert>}
      {successMessage && <ModernAlert $variant="success">{successMessage}</ModernAlert>}
      
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
              variant="ghost"
              size="small"
              onClick={() => window.open(currentDocument.file_url, '_blank')}
            >
              Preview PDF
            </PreviewButton>
            <ModernButton               variant="ghost"
              size="small"
              onClick={handleDelete}
            >
              Delete
            </ModernButton>
          </div>
          
          <ModernAlert $variant="info" style={{ marginTop: '16px' }}>
            To replace this document, upload a new PDF file below.
          </ModernAlert>
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
        )}
      </UploadArea>

      {selectedFile && (
        <>
          <SelectedFileContainer>
            <FileName title={selectedFile.name}>{selectedFile.name}</FileName>
            <FileSize>{formatFileSize(selectedFile.size)}</FileSize>
            <ModernButton               size="small"
              variant="ghost"
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
                setError(null);
              }}
              type="button"
              disabled={isUploading}
            >
              Remove
            </ModernButton>
          </SelectedFileContainer>
          
          <ModernButton             onClick={handleUpload}
            disabled={isUploading}
            style={{ marginTop: '16px', width: '100%' }}
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