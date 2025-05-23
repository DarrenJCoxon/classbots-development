'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Card, Button, Alert } from '@/styles/StyledComponents';
import ReliablePDFViewer from '@/components/shared/ReliablePDFViewer';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import Chat from '@/components/shared/Chat';
import { createClient } from '@/lib/supabase/client';
import type { Chatbot } from '@/types/database.types';

const PageContainer = styled.div`
  height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.background};
  overflow: hidden;
`;

const Header = styled.div`
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.backgroundCard};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.md};
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
`;

const BackButton = styled(Button)`
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
`;

const Title = styled.div`
  display: flex;
  flex-direction: column;
`;

const SessionName = styled.h1`
  margin: 0;
  font-size: 1.3rem;
  color: ${({ theme }) => theme.colors.text};
`;

const DocumentName = styled.p`
  margin: 0;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const Status = styled.span<{ $status: string }>`
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.small};
  font-size: 0.8rem;
  font-weight: 500;
  background: ${({ theme, $status }) => 
    $status === 'active' ? `${theme.colors.green}20` :
    $status === 'draft' ? `${theme.colors.blue}20` : 
    `${theme.colors.textMuted}20`};
  color: ${({ theme, $status }) => 
    $status === 'active' ? theme.colors.green :
    $status === 'draft' ? theme.colors.blue :
    theme.colors.textMuted};
`;

const ContentArea = styled.div`
  flex: 1;
  display: flex;
  padding: ${({ theme }) => theme.spacing.md};
  gap: ${({ theme }) => theme.spacing.md};
  overflow: hidden;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  width: 100%;
  max-width: 2400px;
  margin: 0 auto;
  
  @media (max-width: 1400px) {
    padding: ${({ theme }) => theme.spacing.sm};
    gap: ${({ theme }) => theme.spacing.sm};
  }
  
  @media (min-width: 1800px) {
    padding: ${({ theme }) => theme.spacing.lg};
    gap: ${({ theme }) => theme.spacing.lg};
  }
`;

const DocumentSection = styled.div`
  flex: 3;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  animation: fadeIn 0.6s ease-out;
  
  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
`;

const SidePanel = styled.div`
  flex: 2;
  min-width: 480px;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const PanelCard = styled(Card)`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  border: none;
  animation: slideIn 0.6s ease-out 0.2s both;
  
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  }
`;

const PanelHeader = styled.h3`
  margin: 0 0 ${({ theme }) => theme.spacing.md} 0;
  color: ${({ theme }) => theme.colors.text};
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const ChatPreview = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
  overflow-y: auto;
`;

const ChatMessage = styled.div`
  padding: ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => theme.colors.backgroundDark};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  font-size: 0.9rem;
`;

const StudentName = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const MessageText = styled.div`
  color: ${({ theme }) => theme.colors.text};
`;

const KnowledgeBaseList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const DocumentItem = styled.div`
  padding: ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => theme.colors.backgroundDark};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const LoadingContainer = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
`;

interface SkolrReadSession {
  id: string;
  title: string;
  status: 'draft' | 'active' | 'archived';
  room?: {
    id: string;
    name: string;
  };
  chatbot?: {
    id: string;
    name: string;
  };
  mainDocument: {
    name: string;
    url: string;
    type: string;
    pages?: number;
  };
  knowledgeBase: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  recentChats: Array<{
    id: string;
    studentName: string;
    message: string;
    timestamp: string;
  }>;
}

export default function SkolrReadSessionPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.roomId as string;
  const sessionId = params?.sessionId as string;
  
  const [session, setSession] = useState<SkolrReadSession | null>(null);
  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    const fetchSession = async () => {
      if (!sessionId) {
        setError('No session ID provided');
        setLoading(false);
        return;
      }

      try {
        console.log('🔄 Fetching session data for:', sessionId);
        const response = await fetch(`/api/teacher/skolrread/${sessionId}`);
        console.log('📡 Response status:', response.status, response.statusText);
        console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch (jsonError) {
            console.error('❌ Failed to parse error response as JSON:', jsonError);
            // Try to get response as text for debugging
            try {
              const responseText = await response.text();
              console.error('📄 Error response body:', responseText);
            } catch {
              console.error('📄 Could not read error response body');
            }
          }
          throw new Error(errorMessage);
        }
        
        const responseText = await response.text();
        console.log('📄 Raw response:', responseText.substring(0, 200) + '...');
        
        let sessionData;
        try {
          sessionData = JSON.parse(responseText);
        } catch (parseError) {
          console.error('❌ JSON parse error:', parseError);
          console.error('📄 Failed to parse response:', responseText);
          throw new Error('Invalid response format from server');
        }
        
        // Transform API response to match component interface
        console.log('📚 Main document data:', sessionData.mainDocument);
        
        const transformedSession: SkolrReadSession = {
          id: sessionData.id,
          title: sessionData.title,
          status: sessionData.status,
          room: sessionData.room,
          chatbot: sessionData.chatbot,
          mainDocument: sessionData.mainDocument ? {
            name: sessionData.mainDocument.name,
            url: sessionData.mainDocument.url || '',
            type: sessionData.mainDocument.type || 'pdf',
            pages: undefined
          } : {
            name: 'No document uploaded',
            url: '',
            type: 'pdf'
          },
          knowledgeBase: (sessionData.knowledgeBase || []).map((doc: any) => ({
            id: doc.document_id,
            name: doc.file_name,
            type: doc.file_type
          })),
          recentChats: (sessionData.recentChats || []).map((chat: any) => ({
            id: chat.id,
            studentName: chat.studentName,
            message: chat.message,
            timestamp: new Date(chat.timestamp).toLocaleString()
          }))
        };

        setSession(transformedSession);
        setError(null);
        
        // Fetch chatbot data if available
        if (transformedSession.chatbot?.id) {
          try {
            console.log('🤖 Fetching chatbot data for:', transformedSession.chatbot.id);
            const supabase = createClient();
            const { data: chatbotData, error: chatbotError } = await supabase
              .from('chatbots')
              .select('*')
              .eq('chatbot_id', transformedSession.chatbot.id)
              .single();
            
            if (chatbotError) {
              console.error('❌ Error fetching chatbot:', chatbotError);
            } else if (chatbotData) {
              console.log('✅ Chatbot data loaded:', chatbotData.name);
              setChatbot(chatbotData as Chatbot);
            }
          } catch (chatbotErr) {
            console.error('Error fetching chatbot:', chatbotErr);
            // Don't fail the whole page if chatbot fetch fails
          }
        }
      } catch (err) {
        console.error('Error fetching session:', err);
        setError('Failed to load SkolrRead session');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  const handleBack = () => {
    router.push(`/teacher-dashboard/rooms/${roomId}/skolrread`);
  };

  const handlePageChange = (pageNumber: number, totalPages: number) => {
    setCurrentPage(pageNumber);
    setTotalPages(totalPages);
  };

  const handleDocumentLoad = (totalPages: number) => {
    setTotalPages(totalPages);
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingContainer>
          <LoadingSpinner />
        </LoadingContainer>
      </PageContainer>
    );
  }

  if (error || !session) {
    return (
      <PageContainer>
        <div style={{ padding: '2rem' }}>
          <Alert variant="error">
            {error || 'Session not found'}
          </Alert>
          <Button onClick={handleBack} style={{ marginTop: '1rem' }}>
            ← Back to SkolrRead
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Header>
        <HeaderLeft>
          <BackButton variant="outline" onClick={handleBack}>
            ← Back
          </BackButton>
          <Title>
            <SessionName>{session.title}</SessionName>
            <DocumentName>
              📄 {session.mainDocument.name}
              {totalPages > 0 && ` • Page ${currentPage} of ${totalPages}`}
            </DocumentName>
          </Title>
        </HeaderLeft>

        <HeaderRight>
          <Status $status={session.status}>
            {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
          </Status>
          <Button size="small">
            Manage Session
          </Button>
        </HeaderRight>
      </Header>

      <ContentArea>
        <DocumentSection>
          {/* Temporary debug info */}
          {!session.mainDocument.url && (
            <div style={{ 
              padding: '1rem', 
              background: '#fff3cd', 
              border: '1px solid #ffeeba',
              borderRadius: '4px',
              marginBottom: '1rem'
            }}>
              <strong>Debug Info:</strong><br />
              Document Name: {session.mainDocument.name}<br />
              Document URL: {session.mainDocument.url || 'NO URL'}<br />
              Document Type: {session.mainDocument.type}<br />
            </div>
          )}
          
          <ReliablePDFViewer
            documentUrl={session.mainDocument.url}
            documentName={session.mainDocument.name}
            onPageChange={handlePageChange}
            onDocumentLoad={handleDocumentLoad}
          />
        </DocumentSection>

        <SidePanel>
          <PanelCard>
            <PanelHeader>
              🤖 {chatbot?.name || session.chatbot?.name || 'AI Chat Assistant'}
            </PanelHeader>
            {session.room && chatbot ? (
              <Chat
                roomId={session.room.id}
                chatbot={chatbot}
                instanceId={`skolrread-${session.id}`}
                // countryCode will be determined dynamically
              />
            ) : session.chatbot ? (
              <div style={{ 
                flex: 1, 
                display: 'flex', 
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <LoadingSpinner />
              </div>
            ) : (
              <div style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                color: '#666',
                padding: '2rem'
              }}>
                <Alert variant="warning">
                  No chatbot configured for this session
                </Alert>
              </div>
            )}
          </PanelCard>
        </SidePanel>
      </ContentArea>
    </PageContainer>
  );
}