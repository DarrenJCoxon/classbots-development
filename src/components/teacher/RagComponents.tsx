// src/components/teacher/RagComponents.tsx
'use client';

import { useState, useRef, ChangeEvent } from 'react';
import styled from 'styled-components';
import { Button, Alert, Input, FormGroup, Label } from '@/styles/StyledComponents';

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

// No unused styles - removed unused styled component

export function SimpleDocumentUploader() {
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setFile(files[0]);
    }
  };

  return (
    <UploaderContainer>
      <SectionTitle>Upload Documents</SectionTitle>
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
        <Alert variant="info">
          Selected: {file.name} ({Math.round(file.size / 1024)} KB)
          <div style={{ marginTop: '8px' }}>
            Note: You&apos;ll be able to upload this file after creating the chatbot.
          </div>
        </Alert>
      )}
    </UploaderContainer>
  );
}

export function SimpleWebScraper() {
  const [url, setUrl] = useState('');

  return (
    <UploaderContainer>
      <SectionTitle>Web Scraper</SectionTitle>
      <FormGroup>
        <Label htmlFor="webpage-url">Webpage URL</Label>
        <Input
          id="webpage-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/article"
          type="url"
        />
        <FileTypeInfo>
          Enter a URL to scrape content from a webpage directly into your knowledge base.
        </FileTypeInfo>
      </FormGroup>
      <Button 
        variant="primary" 
        disabled={!url.trim() || !url.startsWith('http')}
        style={{ marginTop: '8px' }}
      >
        Extract Content
      </Button>
      <Alert variant="info" style={{ marginTop: '16px' }}>
        Note: You&apos;ll be able to scrape web content after creating the chatbot.
      </Alert>
    </UploaderContainer>
  );
}