// src/components/teacher/StudentCsvUpload.tsx
'use client';

import { useState, useRef } from 'react';
import styled from 'styled-components';
import { FiX, FiUpload } from 'react-icons/fi';
import { ModernButton } from '@/components/shared/ModernButton';
import { Label, FormGroup, FormText } from '@/components/ui/Form';
import { Text } from '@/components/ui/Typography';
import { Alert } from '@/styles/StyledComponents';

// --- Styled Components ---
const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(5px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: ${({ theme }) => theme.spacing.md};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 0;
    align-items: flex-start;
  }
`;

const FormCard = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 0;
  border: 1px solid rgba(152, 93, 215, 0.1);
  box-shadow: 0 20px 60px rgba(152, 93, 215, 0.2);
  width: 100%;
  max-width: 650px;
  margin: 20px;
  position: relative;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow-y: hidden;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    margin: 0;
    width: 100%;
    min-height: 100vh;
    max-height: 100vh;
    border-radius: 0;
    box-shadow: none;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.lg};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  flex-shrink: 0;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${({ theme }) => theme.spacing.md};
  }
`;

const Title = styled.h2`
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  font-family: ${({ theme }) => theme.fonts.heading};
  text-transform: uppercase;
  letter-spacing: 1px;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.magenta}
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const CloseButton = styled.button`
  background: rgba(152, 93, 215, 0.1);
  border: none;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;
  font-size: 1.5rem;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(152, 93, 215, 0.2);
    transform: scale(1.05);
  }
`;

const FormContent = styled.div`
  padding: ${({ theme }) => theme.spacing.lg};
  overflow-y: auto;
  flex-grow: 1;
  max-height: calc(90vh - 140px);
  overscroll-behavior: contain;

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
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.colors.borderDark} transparent;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${({ theme }) => theme.spacing.md};
    max-height: calc(100vh - 140px);
  }
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.lg};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  flex-shrink: 0;
  background-color: ${({ theme }) => theme.colors.background};
  position: sticky;
  bottom: 0;
  z-index: 5;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-direction: column-reverse;
    padding: ${({ theme }) => theme.spacing.md};
  }
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


const ResultsContainer = styled.div`
  margin-top: ${({ theme }) => theme.spacing.lg};
  padding: ${({ theme }) => theme.spacing.md};
  max-height: 300px;
  overflow-y: auto;
  text-align: left;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${({ theme }) => theme.borderRadius.md};
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: rgba(152, 93, 215, 0.3);
    border-radius: 4px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  scrollbar-width: thin;
  scrollbar-color: rgba(152, 93, 215, 0.3) transparent;
`;


const MagicLinkItem = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  border-left: 3px solid ${({ theme }) => theme.colors.primary};
`;

const ExpiryWarning = styled.div`
  background-color: ${({ theme }) => theme.colors.warningBackground || '#FFF3CD'};
  color: ${({ theme }) => theme.colors.warningText || '#856404'};
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  font-size: 0.9rem;
`;

const StudentName = styled.div`
  font-weight: 600;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const MagicLink = styled.div`
  font-family: monospace;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.primary};
  word-break: break-all;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
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
            email: null,
            magicLink: "https://example.com/debug-link"
          }]);
        }
      }
      // If partial success (some students failed)
      else if (data?.failedImports && data.failedImports.length > 0) {
        const successCount = data.students?.length || 0;
        const failedCount = data.failedImports.length;
        
        setSuccess(`Partially successful: Added ${successCount} out of ${successCount + failedCount} students to room "${roomName}".`);
        
        // Show the first error in the UI
        const firstError = data.failedImports[0];
        setError(`Failed to add ${failedCount} students. First error: ${firstError.error} (Student: ${firstError.student.fullName})`);
        
        // Log all errors with details
        console.error('Failed student imports with details:');
        data.failedImports.forEach((failed: any, index: number) => {
          console.error(`${index + 1}. Student: ${failed.student.fullName}`, {
            error: failed.error,
            details: failed.details,
            index: failed.index
          });
        });
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
    const csvContent = 'First Name,Surname\nJohn,Doe\nJane,Smith\nBob,Johnson';
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
    <Overlay onClick={onClose}>
      <FormCard onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>Import Students</Title>
          <CloseButton onClick={onClose}>
            <FiX />
          </CloseButton>
        </Header>
        
        <FormContent>
          <Text style={{ marginBottom: '16px' }}>
            Upload a CSV file with student information to bulk add them to {roomName}. 
            Each student will receive a unique magic link for passwordless access.
          </Text>
          
          <FormGroup>
            <Label>Required CSV format</Label>
            <FormText>
              Your CSV must have two columns: <strong>First Name</strong> and <strong>Surname</strong>
              <br />
              <a href="#" onClick={(e) => { e.preventDefault(); downloadTemplateCSV(); }} style={{ color: 'var(--color-primary)' }}>
                Download Template CSV
              </a>
            </FormText>
          </FormGroup>

          {error && <Alert variant="error">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

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
              <Label style={{ marginTop: '24px', marginBottom: '12px' }}>Student Magic Links</Label>
              <ExpiryWarning>
                <strong>Important:</strong> These magic links will expire after 24 hours. Please make sure students use their links within this timeframe.
              </ExpiryWarning>
              <ResultsContainer>
                {results.map((student, index) => (
                  <MagicLinkItem key={index}>
                    <StudentName>{student.fullName}</StudentName>
                    <MagicLink>{student.magicLink}</MagicLink>
                    <ModernButton 
                      size="small"
                      variant="secondary"
                      onClick={() => handleCopyLink(student.magicLink)}
                      style={{ marginTop: '8px' }}
                    >
                      Copy Link
                    </ModernButton>
                  </MagicLinkItem>
                ))}
              </ResultsContainer>
              <ModernButton 
                onClick={handleCopyAllLinks}
                style={{ width: '100%', marginTop: '16px' }}
              >
                Copy All Links
              </ModernButton>
            </>
          )}
        </FormContent>

        <Footer>
          <ModernButton variant="secondary" onClick={onClose} disabled={isUploading}>
            Close
          </ModernButton>
        </Footer>
      </FormCard>
    </Overlay>
  );
}
