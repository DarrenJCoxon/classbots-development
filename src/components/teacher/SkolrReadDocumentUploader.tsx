'use client';

import React, { useState, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { Button, Alert, Card } from '@/styles/StyledComponents';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

const UploadArea = styled.div<{ $isDragging: boolean }>`
  border: 2px dashed ${({ theme, $isDragging }) => 
    $isDragging ? theme.colors.primary : theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  padding: ${({ theme }) => theme.spacing.xl};
  text-align: center;
  transition: all 0.2s ease;
  background: ${({ theme, $isDragging }) => 
    $isDragging ? theme.colors.backgroundDark : 'transparent'};
  cursor: pointer;
  position: relative;
  overflow: hidden;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.backgroundDark};
  }
`;

const UploadIcon = styled.div`
  font-size: 3rem;
  color: ${({ theme }) => theme.colors.textMuted};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const UploadText = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
`;

const UploadHint = styled.p`
  color: ${({ theme }) => theme.colors.textLight};
  font-size: 0.9rem;
  margin: 0;
`;

const HiddenInput = styled.input`
  display: none;
`;

const DocumentPreview = styled(Card)`
  margin-top: ${({ theme }) => theme.spacing.lg};
  padding: ${({ theme }) => theme.spacing.md};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
`;

const DocumentIcon = styled.div`
  font-size: 2rem;
  color: ${({ theme }) => theme.colors.primary};
`;

const DocumentInfo = styled.div`
  flex: 1;
`;

const DocumentName = styled.h4`
  margin: 0 0 ${({ theme }) => theme.spacing.xs} 0;
  color: ${({ theme }) => theme.colors.text};
`;

const DocumentMeta = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.9rem;
`;

const RemoveButton = styled(Button)`
  margin-left: auto;
`;

interface UploadedDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  path?: string;
  url?: string;
}

interface SkolrReadDocumentUploaderProps {
  onDocumentReady: (document: UploadedDocument | null) => void;
  existingDocument?: UploadedDocument | null;
}

export default function SkolrReadDocumentUploader({ 
  onDocumentReady,
  existingDocument 
}: SkolrReadDocumentUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedDocument, setUploadedDocument] = useState<UploadedDocument | null>(existingDocument || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/teacher/skolrread/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload document');
      }

      const newDocument: UploadedDocument = {
        id: data.document.id,
        name: data.document.name,
        type: data.document.type,
        size: data.document.size,
        path: data.document.path,
        url: data.document.url
      };

      setUploadedDocument(newDocument);
      onDocumentReady(newDocument);
    } catch (err) {
      console.error('Error uploading document:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload document');
      onDocumentReady(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Please upload a PDF file');
        return;
      }
      handleUpload(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Please upload a PDF file');
        return;
      }
      handleUpload(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleRemove = () => {
    setUploadedDocument(null);
    onDocumentReady(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div>
      {error && (
        <Alert variant="error" style={{ marginBottom: '1rem' }}>
          {error}
        </Alert>
      )}

      {!uploadedDocument && (
        <UploadArea
          $isDragging={isDragging}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <HiddenInput
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            disabled={isUploading}
          />
          
          {isUploading ? (
            <>
              <LoadingSpinner size="large" />
              <UploadText>Uploading document...</UploadText>
            </>
          ) : (
            <>
              <UploadIcon>📄</UploadIcon>
              <UploadText>
                Drop your PDF here or click to browse
              </UploadText>
              <UploadHint>Only PDF files are supported</UploadHint>
            </>
          )}
        </UploadArea>
      )}

      {uploadedDocument && (
        <DocumentPreview>
          <DocumentIcon>📄</DocumentIcon>
          <DocumentInfo>
            <DocumentName>{uploadedDocument.name}</DocumentName>
            <DocumentMeta>
              PDF • {formatFileSize(uploadedDocument.size)}
            </DocumentMeta>
          </DocumentInfo>
          <RemoveButton 
            variant="outline" 
            size="small"
            onClick={handleRemove}
          >
            Remove
          </RemoveButton>
        </DocumentPreview>
      )}
    </div>
  );
}