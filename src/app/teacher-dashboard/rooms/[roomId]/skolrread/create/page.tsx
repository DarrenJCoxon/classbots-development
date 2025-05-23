'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Card, Button, Alert, Input, FormGroup, Label } from '@/styles/StyledComponents';
import SkolrReadDocumentUploader from '@/components/teacher/SkolrReadDocumentUploader';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { createClient } from '@/lib/supabase/client';

const PageContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl};
`;

const Header = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const Title = styled.h1`
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
  color: ${({ theme }) => theme.colors.text};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const Subtitle = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 1.1rem;
`;

const BackButton = styled(Button)`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Step = styled(Card)`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const StepHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const StepNumber = styled.div`
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.9rem;
`;

const StepTitle = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
  font-size: 1.3rem;
`;

const StepDescription = styled.p`
  margin: 0 0 ${({ theme }) => theme.spacing.md} 0;
  color: ${({ theme }) => theme.colors.textLight};
`;

const FormActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  justify-content: flex-end;
  margin-top: ${({ theme }) => theme.spacing.xl};
  padding-top: ${({ theme }) => theme.spacing.lg};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const DocumentPreview = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.backgroundDark};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const DocumentIcon = styled.div`
  font-size: 1.5rem;
`;

const DocumentInfo = styled.div`
  flex: 1;
`;

const DocumentName = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const DocumentMeta = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.textMuted};
`;

interface UploadedDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  path?: string;
  url?: string;
}

export default function CreateSkolrReadPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.roomId as string;
  
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionDescription, setSessionDescription] = useState('');
  const [mainDocument, setMainDocument] = useState<UploadedDocument | null>(null);
  const [selectedChatbot, setSelectedChatbot] = useState('');
  const [chatbots, setChatbots] = useState<Array<{id: string, name: string}>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [roomName, setRoomName] = useState('');

  // Handler for when document is uploaded
  const handleDocumentReady = (document: UploadedDocument | null) => {
    console.log('Document ready:', document);
    if (document && document.id) {
      setMainDocument(document);
      setError('');
    } else {
      setMainDocument(null);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient();
        
        // Get room name
        const { data: room } = await supabase
          .from('rooms')
          .select('room_name')
          .eq('room_id', roomId)
          .single();
        
        if (room) {
          setRoomName(room.room_name);
        }

        // Get available chatbots for this room
        const { data: roomChatbots } = await supabase
          .from('room_chatbots')
          .select(`
            chatbots (
              chatbot_id,
              name
            )
          `)
          .eq('room_id', roomId);

        if (roomChatbots) {
          const chatbotList = roomChatbots
            .map((rc: any) => rc.chatbots)
            .filter(Boolean)
            .map((cb: any) => ({
              id: cb.chatbot_id,
              name: cb.name
            }));
          setChatbots(chatbotList);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load room data');
      }
    };

    if (roomId) {
      fetchData();
    }
  }, [roomId]);




  const handleBack = () => {
    router.push(`/teacher-dashboard/rooms/${roomId}/skolrread`);
  };

  const handleCreate = async () => {
    if (!sessionTitle.trim()) {
      setError('Please enter a session title');
      return;
    }

    if (!selectedChatbot) {
      setError('Please select a chatbot to power the AI assistance');
      return;
    }

    if (!mainDocument) {
      setError('Please upload a document for students to read');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create SkolrRead session with document info
      const response = await fetch('/api/teacher/skolrread', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId,
          chatbotId: selectedChatbot,
          title: sessionTitle,
          description: sessionDescription,
          documentInfo: {
            name: mainDocument.name,
            path: mainDocument.path || '',
            type: mainDocument.type,
            size: mainDocument.size,
            url: mainDocument.url || ''
          }
        }),
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If we can't parse error as JSON, use status text
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      console.log('✅ Session created successfully:', data);
      const sessionId = data.session?.id;
      const navigationUrl = `/teacher-dashboard/rooms/${roomId}/skolrread/${sessionId}`;
      
      console.log('📊 Debug Info:');
      console.log('- Room ID:', roomId);
      console.log('- Session ID:', sessionId);
      console.log('- Full URL:', navigationUrl);
      console.log('- Session ID type:', typeof sessionId);
      console.log('- Session ID length:', sessionId?.length);
      
      if (!sessionId) {
        console.error('❌ No session ID in response!');
        setError('Session created but no ID returned');
        return;
      }
      
      // Redirect to the new session
      router.push(navigationUrl);
      
    } catch (err) {
      console.error('Error creating SkolrRead session:', err);
      setError(err instanceof Error ? err.message : 'Failed to create SkolrRead session. Please try again.');
    } finally {
      setLoading(false);
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
    <PageContainer>
      <BackButton variant="outline" onClick={handleBack}>
        ← Back to SkolrRead
      </BackButton>

      <Header>
        <Title>
          📖 Create SkolrRead Session
        </Title>
        <Subtitle>
          Set up an interactive reading experience for {roomName}
        </Subtitle>
      </Header>

      {error && (
        <Alert variant="error" style={{ marginBottom: '2rem' }}>
          {error}
        </Alert>
      )}

      <Step>
        <StepHeader>
          <StepNumber>1</StepNumber>
          <StepTitle>Session Details</StepTitle>
        </StepHeader>
        <StepDescription>
          Give your reading session a name and description to help students understand what they'll be reading.
        </StepDescription>
        
        <FormGroup>
          <Label htmlFor="sessionTitle">Session Title *</Label>
          <Input
            id="sessionTitle"
            type="text"
            value={sessionTitle}
            onChange={(e) => setSessionTitle(e.target.value)}
            placeholder="e.g., Macbeth - Act 1 Study, Romeo & Juliet Chapter Analysis"
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="sessionDescription">Description (Optional)</Label>
          <Input
            id="sessionDescription"
            type="text"
            value={sessionDescription}
            onChange={(e) => setSessionDescription(e.target.value)}
            placeholder="Brief description of what students will learn from this reading"
          />
        </FormGroup>
      </Step>

      <Step>
        <StepHeader>
          <StepNumber>2</StepNumber>
          <StepTitle>Select AI Assistant</StepTitle>
        </StepHeader>
        <StepDescription>
          Choose which chatbot will provide AI assistance to students while they read. 
          The chatbot will use its knowledge base to answer questions about the content.
        </StepDescription>

        {chatbots.length > 0 ? (
          <FormGroup>
            <Label htmlFor="chatbot">Available Chatbots</Label>
            <select
              id="chatbot"
              value={selectedChatbot}
              onChange={(e) => setSelectedChatbot(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            >
              <option value="">Select a chatbot...</option>
              {chatbots.map((bot) => (
                <option key={bot.id} value={bot.id}>
                  {bot.name}
                </option>
              ))}
            </select>
          </FormGroup>
        ) : (
          <Alert variant="warning">
            No chatbots are available in this room. You need to create a chatbot first before setting up SkolrRead.
          </Alert>
        )}
      </Step>

      <Step>
        <StepHeader>
          <StepNumber>3</StepNumber>
          <StepTitle>Upload Reading Document</StepTitle>
        </StepHeader>
        <StepDescription>
          Upload the document that students will read. This document will be displayed in the reading viewer.
          It will NOT be added to the chatbot's knowledge base.
        </StepDescription>

        <SkolrReadDocumentUploader
          onDocumentReady={handleDocumentReady}
          existingDocument={mainDocument}
        />
      </Step>


      <FormActions>
        <Button variant="outline" onClick={handleBack}>
          Cancel
        </Button>
        <Button 
          onClick={handleCreate}
          disabled={loading || !sessionTitle.trim() || !mainDocument || !selectedChatbot}
        >
          {loading ? (
            <>
              <LoadingSpinner size="small" /> Creating...
            </>
          ) : (
            'Create SkolrRead Session'
          )}
        </Button>
      </FormActions>
    </PageContainer>
  );
}