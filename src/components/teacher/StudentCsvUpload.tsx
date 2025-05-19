// src/components/teacher/StudentCsvUpload.tsx
'use client';

import { useState, useRef } from 'react';
import styled from 'styled-components';
import { Card, Button, Alert } from '@/styles/StyledComponents';

// --- Styled Components ---
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: ${({ theme }) => theme.spacing.md};
`;

const ModalContent = styled(Card)`
  width: 100%;
  max-width: 500px;
  margin: 20px;
  position: relative;
  text-align: center;
  border-top: none !important;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow-y: hidden; /* Hide overflow at the card level */
`;

const ModalTitle = styled.h3`
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text};
`;

const ModalText = styled.p`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  color: ${({ theme }) => theme.colors.textLight};
  text-align: left;
`;

const ModalActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  justify-content: center;
  margin-top: ${({ theme }) => theme.spacing.xl};
`;

const FileUploadWrapper = styled.div`
  border: 2px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  padding: ${({ theme }) => theme.spacing.lg};
  margin: ${({ theme }) => theme.spacing.lg} 0;
  text-align: center;
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    background-color: ${({ theme }) => theme.colors.background};
  }
`;

const HiddenInput = styled.input`
  display: none;
`;

const TemplateLink = styled.a`
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 500;
  text-decoration: underline;
  cursor: pointer;
`;

const ResultsContainer = styled.div`
  margin-top: ${({ theme }) => theme.spacing.lg};
  padding: ${({ theme }) => theme.spacing.md};
  max-height: 300px;
  overflow-y: auto;
  text-align: left;
  background: ${({ theme }) => theme.colors.backgroundDark};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: ${({ theme }) => theme.colors.borderDark};
    border-radius: 3px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  scrollbar-width: thin; /* Firefox */
  scrollbar-color: ${({ theme }) => theme.colors.borderDark} transparent; /* Firefox */
`;

const MagicLinkItem = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  border-left: 3px solid ${({ theme }) => theme.colors.primary};
`;

const ExpiryWarning = styled.div`
  margin-top: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.secondary}20;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  border-left: 3px solid ${({ theme }) => theme.colors.secondary};
  font-size: 0.9rem;
`;

const StudentName = styled.div`
  font-weight: 600;
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const MagicLink = styled.div`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.8rem;
  word-break: break-all;
  padding: ${({ theme }) => theme.spacing.xs};
  background: ${({ theme }) => theme.colors.backgroundDark};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

const CopyButton = styled(Button).attrs({ size: 'small' })`
  margin-top: ${({ theme }) => theme.spacing.xs};
  font-size: 0.8rem;
`;

const CopyAllButton = styled(Button)`
  margin-top: ${({ theme }) => theme.spacing.md};
  /* This component inherits all Button props */
`;

interface StudentCsvUploadProps {
  roomId: string;
  roomName: string;
  onClose: () => void;
}

interface StudentLinkResult {
  fullName: string;
  email: string | null;
  magicLink: string;
}

export default function StudentCsvUpload({ roomId, roomName, onClose }: StudentCsvUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<StudentLinkResult[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);
    setResults([]);
    
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setError('Please upload a valid CSV file.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('roomId', roomId);

    setIsUploading(true);

    try {
      const importURL = `/api/teacher/rooms/${roomId}/students/import`;
      console.log('Sending CSV import request to:', importURL);
      
      // Send the request with form data
      const response = await fetch(importURL, {
        method: 'POST',
        body: formData,
      });

      console.log('CSV import response status:', response.status, response.statusText);
      
      let data;
      try {
        // Try to parse the JSON, but handle potential parsing errors
        const textResponse = await response.text();
        console.log('Raw response text:', textResponse.substring(0, 200) + (textResponse.length > 200 ? '...' : ''));
        data = textResponse ? JSON.parse(textResponse) : {};
      } catch (parseErr) {
        console.error('Error parsing response:', parseErr);
        throw new Error('Invalid response from server. Check the console for details.');
      }
      
      if (!response.ok) {
        console.error('Import error response:', data);
        console.error('Response status:', response.status, response.statusText);
        
        // Extract more specific error message if available
        const errorMessage = data?.error || `Failed to import students (Status: ${response.status})`;
        throw new Error(errorMessage);
      }

      // Check if we're in debug mode
      if (data?.debug) {
        console.log('Debug mode detected. Mock data:', data);
        setSuccess(`Debug mode: ${data.message || 'Route handler is working'}`);
        
        // Use the mock data provided by the debug route
        if (data.students && data.students.length > 0) {
          setResults(data.students);
        } else {
          setResults([{
            fullName: "Debug Student",
            email: "debug@example.com",
            magicLink: "https://example.com/debug-link"
          }]);
        }
      }
      // If partial success (some students failed)
      else if (data?.failedImports && data.failedImports.length > 0) {
        const successCount = data.students?.length || 0;
        const failedCount = data.failedImports.length;
        
        setSuccess(`Partially successful: Added ${successCount} out of ${successCount + failedCount} students to room "${roomName}".`);
        setError(`Failed to add ${failedCount} students. Please check console for details.`);
        console.error('Failed student imports:', data.failedImports);
        setResults(data?.students || []);
      } else {
        setSuccess(`Successfully added ${data.students?.length || 0} students to room "${roomName}".`);
        setResults(data?.students || []);
      }
    } catch (err) {
      console.error('Error importing students:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred during import.');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCopyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      // Use a safer approach than alert
      setSuccess('Link copied to clipboard!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to copy link:', err);
      setError('Failed to copy link.');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleCopyAllLinks = async () => {
    try {
      const allLinks = results.map(result => `${result.fullName}: ${result.magicLink}`).join('\n\n');
      await navigator.clipboard.writeText(allLinks);
      // Use a safer approach than alert
      setSuccess('All links copied to clipboard!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to copy links:', err);
      setError('Failed to copy links.');
      setTimeout(() => setError(null), 3000);
    }
  };

  const downloadTemplateCSV = () => {
    // Using separate lines for each student to make it clearer in the CSV file
    // Add more rows to demonstrate multiple students can be imported
    const csvContent = 'Full Name,Email\nJohn Doe,john.doe@example.com\nJane Smith,jane.smith@example.com\nBob Johnson,bob.johnson@example.com';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

const ModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0 ${({ theme }) => theme.spacing.lg};
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: ${({ theme }) => theme.colors.borderDark};
    border-radius: 3px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  scrollbar-width: thin; /* Firefox */
  scrollbar-color: ${({ theme }) => theme.colors.borderDark} transparent; /* Firefox */
`;

  return (
    <ModalOverlay>
      <ModalContent>
        <ModalTitle>Import Students for {roomName}</ModalTitle>
        
        <ModalBody>
          <ModalText>
            Upload a CSV file with student information to bulk add them to this room. 
            Each student will receive a unique magic link for passwordless access.
          </ModalText>
          
          <ModalText>
            Required CSV format: <TemplateLink onClick={downloadTemplateCSV}>Download Template</TemplateLink>
          </ModalText>
          <ul>
            <li><strong>Full Name</strong> (required)</li>
            <li><strong>Email</strong> (optional - if provided, students can also login with email)</li>
          </ul>

          {error && <Alert variant="error" style={{ marginBottom: '16px' }}>{error}</Alert>}
          {success && <Alert variant="success" style={{ marginBottom: '16px' }}>{success}</Alert>}

          <FileUploadWrapper onClick={() => fileInputRef.current?.click()}>
            <p>Click to select CSV file or drag and drop</p>
            {isUploading ? <p>Uploading...</p> : <p>Select file</p>}
            <HiddenInput 
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
          </FileUploadWrapper>

          {results.length > 0 && (
            <>
              <ModalText>Student Magic Links (distribute these to your students):</ModalText>
              <ExpiryWarning>
                <strong>Important:</strong> These magic links will expire after 24 hours. Please make sure students use their links within this timeframe.
                If a link expires, you will need to generate a new one for the student.
              </ExpiryWarning>
              <ResultsContainer>
                {results.map((student, index) => (
                  <MagicLinkItem key={index}>
                    <StudentName>{student.fullName}</StudentName>
                    {student.email && <div>Email: {student.email}</div>}
                    <MagicLink>{student.magicLink}</MagicLink>
                    <CopyButton 
                      size="small"
                      variant="outline"
                      onClick={() => handleCopyLink(student.magicLink)}
                    >
                      Copy Link
                    </CopyButton>
                  </MagicLinkItem>
                ))}
              </ResultsContainer>
              <CopyAllButton onClick={handleCopyAllLinks}>Copy All Links</CopyAllButton>
            </>
          )}
        </ModalBody>

        <ModalActions>
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Close
          </Button>
        </ModalActions>
      </ModalContent>
    </ModalOverlay>
  );
}