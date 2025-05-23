'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Card, Button, Alert } from '@/styles/StyledComponents';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { createClient } from '@/lib/supabase/client';

const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl};
`;

const Header = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  gap: ${({ theme }) => theme.spacing.md};
`;

const Title = styled.h1`
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  flex: 1;
`;

const Icon = styled.span`
  font-size: 1.5rem;
`;

const SkolrReadGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const SkolrReadCard = styled(Card)`
  transition: all ${({ theme }) => theme.transitions.normal};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.lg};
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: between;
  align-items: flex-start;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const BookTitle = styled.h3`
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
  font-size: 1.1rem;
  font-weight: 600;
  flex: 1;
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

const BookInfo = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const BookMeta = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.textMuted};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const KnowledgeBase = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.textLight};
`;

const CardContent = styled.div`
  cursor: pointer;
`;

const CardActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.md};
  padding-top: ${({ theme }) => theme.spacing.md};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const Stats = styled.div`
  display: flex;
  justify-content: between;
  padding-top: ${({ theme }) => theme.spacing.md};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const Stat = styled.div`
  text-align: center;
`;

const StatNumber = styled.div`
  font-size: 1.2rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
`;

const StatLabel = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xxl};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const EmptyIcon = styled.div`
  font-size: 3rem;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

interface SkolrReadSession {
  id: string;
  title: string;
  mainDocument: {
    name: string;
    type: string;
    pages?: number;
  };
  status: 'draft' | 'active' | 'archived';
  knowledgeBaseCount: number;
  studentCount: number;
  readingProgress: number;
  chatMessages: number;
  createdAt: string;
}

export default function SkolrReadPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.roomId as string;
  
  const [sessions, setSessions] = useState<SkolrReadSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      if (!roomId) return;

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

        // Fetch actual SkolrRead sessions from database
        const response = await fetch(`/api/teacher/skolrread?roomId=${roomId}`);
        
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
        
        setSessions(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching SkolrRead data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load SkolrRead sessions');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [roomId]);

  const handleCreateNew = () => {
    router.push(`/teacher-dashboard/rooms/${roomId}/skolrread/create`);
  };

  const handleSessionClick = (sessionId: string) => {
    router.push(`/teacher-dashboard/rooms/${roomId}/skolrread/${sessionId}`);
  };

  const handleEditSession = (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the card click
    router.push(`/teacher-dashboard/rooms/${roomId}/skolrread/${sessionId}/edit`);
  };

  if (loading) {
    return (
      <PageContainer>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <LoadingSpinner />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Header>
        <Title>
          <Icon>📖</Icon>
          SkolrRead Sessions
          {roomName && <span style={{ fontSize: '0.8em', fontWeight: 'normal', color: '#666' }}>
            — {roomName}
          </span>}
        </Title>
        <Button onClick={handleCreateNew}>
          + Create SkolrRead
        </Button>
      </Header>

      {error && (
        <Alert variant="error" style={{ marginBottom: '2rem' }}>
          {error}
        </Alert>
      )}

      {sessions.length === 0 ? (
        <EmptyState>
          <EmptyIcon>📚</EmptyIcon>
          <h3>No SkolrRead Sessions Yet</h3>
          <p>Create your first interactive reading experience!</p>
          <p style={{ fontSize: '0.9rem', margin: '1rem 0' }}>
            Upload a book, add supporting materials, and let students read with AI assistance.
          </p>
          <Button onClick={handleCreateNew}>
            Create Your First SkolrRead
          </Button>
        </EmptyState>
      ) : (
        <SkolrReadGrid>
          {sessions.map((session) => (
            <SkolrReadCard key={session.id}>
              <CardContent onClick={() => handleSessionClick(session.id)}>
                <CardHeader>
                  <BookTitle>{session.title}</BookTitle>
                  <Status $status={session.status}>
                    {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                  </Status>
                </CardHeader>

                <BookInfo>
                  <BookMeta>
                    📄 {session.mainDocument.name}
                    {session.mainDocument.pages && ` • ${session.mainDocument.pages} pages`}
                  </BookMeta>
                  <KnowledgeBase>
                    📚 {session.knowledgeBaseCount} supporting documents in knowledge base
                  </KnowledgeBase>
                </BookInfo>

                <Stats>
                  <Stat>
                    <StatNumber>{session.studentCount}</StatNumber>
                    <StatLabel>Students</StatLabel>
                  </Stat>
                  <Stat>
                    <StatNumber>{session.readingProgress}%</StatNumber>
                    <StatLabel>Avg Progress</StatLabel>
                  </Stat>
                  <Stat>
                    <StatNumber>{session.chatMessages}</StatNumber>
                    <StatLabel>Chat Messages</StatLabel>
                  </Stat>
                </Stats>
              </CardContent>

              <CardActions>
                <Button
                  size="small"
                  variant="outline"
                  onClick={(e) => handleEditSession(session.id, e)}
                >
                  ✏️ Edit
                </Button>
                <Button
                  size="small"
                  onClick={() => handleSessionClick(session.id)}
                >
                  📖 Open Session
                </Button>
              </CardActions>
            </SkolrReadCard>
          ))}
        </SkolrReadGrid>
      )}
    </PageContainer>
  );
}