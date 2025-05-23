'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Card, Button, Alert, Input, FormGroup, Label } from '@/styles/StyledComponents';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

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

const FormCard = styled(Card)`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const FormActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  justify-content: flex-end;
  margin-top: ${({ theme }) => theme.spacing.xl};
  padding-top: ${({ theme }) => theme.spacing.lg};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const StatusSection = styled.div`
  margin-top: ${({ theme }) => theme.spacing.lg};
  padding-top: ${({ theme }) => theme.spacing.lg};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const StatusButtons = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const StatusButton = styled(Button)<{ $active: boolean }>`
  background: ${({ theme, $active }) => 
    $active ? theme.colors.primary : theme.colors.backgroundDark};
  color: ${({ theme, $active }) => 
    $active ? '#fff' : theme.colors.text};
  border: 1px solid ${({ theme, $active }) => 
    $active ? theme.colors.primary : theme.colors.border};
  
  &:hover {
    background: ${({ theme, $active }) => 
      $active ? theme.colors.primary : theme.colors.backgroundDark};
  }
`;

interface SkolrReadSession {
  id: string;
  title: string;
  description?: string;
  status: 'draft' | 'active' | 'archived';
  mainDocument: {
    name: string;
    type: string;
  };
  chatbot: {
    name: string;
  };
}

export default function EditSkolrReadPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.roomId as string;
  const sessionId = params?.sessionId as string;
  
  const [session, setSession] = useState<SkolrReadSession | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'draft' | 'active' | 'archived'>('draft');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchSession = async () => {
      if (!sessionId) return;

      try {
        const response = await fetch(`/api/teacher/skolrread/${sessionId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch session');
        }
        
        const sessionData = await response.json();
        
        setSession(sessionData);
        setTitle(sessionData.title);
        setDescription(sessionData.description || '');
        setStatus(sessionData.status);
        setError('');
      } catch (err) {
        console.error('Error fetching session:', err);
        setError('Failed to load session');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  const handleBack = () => {
    router.push(`/teacher-dashboard/rooms/${roomId}/skolrread`);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/teacher/skolrread/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update session');
      }

      setSuccessMessage('Session updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);

      // Update local session data
      if (session) {
        setSession({
          ...session,
          title,
          description,
          status,
        });
      }
    } catch (err) {
      console.error('Error updating session:', err);
      setError(err instanceof Error ? err.message : 'Failed to update session');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this SkolrRead session? This action cannot be undone.')) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/teacher/skolrread/${sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete session');
      }

      router.push(`/teacher-dashboard/rooms/${roomId}/skolrread`);
    } catch (err) {
      console.error('Error deleting session:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete session');
      setSaving(false);
    }
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

  if (!session) {
    return (
      <PageContainer>
        <Alert variant="error">Session not found</Alert>
        <Button onClick={handleBack} style={{ marginTop: '1rem' }}>
          ← Back to SkolrRead
        </Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <BackButton variant="outline" onClick={handleBack}>
        ← Back to SkolrRead
      </BackButton>

      <Header>
        <Title>
          ✏️ Edit SkolrRead Session
        </Title>
        <Subtitle>
          Modify session details and settings
        </Subtitle>
      </Header>

      {error && (
        <Alert variant="error" style={{ marginBottom: '2rem' }}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success" style={{ marginBottom: '2rem' }}>
          {successMessage}
        </Alert>
      )}

      <FormCard>
        <h2 style={{ margin: '0 0 1rem 0', color: 'var(--color-text)' }}>Session Details</h2>
        
        <FormGroup>
          <Label htmlFor="title">Session Title *</Label>
          <Input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter session title"
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
          />
        </FormGroup>

        <div style={{ 
          padding: '1rem', 
          background: '#f8f9fa', 
          borderRadius: '8px',
          marginTop: '1rem'
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>Session Info</h4>
          <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: '#666' }}>
            📄 <strong>Document:</strong> {session.mainDocument.name}
          </p>
          <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: '#666' }}>
            🤖 <strong>AI Assistant:</strong> {session.chatbot.name}
          </p>
        </div>

        <StatusSection>
          <Label>Session Status</Label>
          <p style={{ 
            fontSize: '0.85rem', 
            color: 'var(--color-text-muted)', 
            margin: '0.5rem 0' 
          }}>
            Control who can access this session
          </p>
          <StatusButtons>
            <StatusButton
              size="small"
              $active={status === 'draft'}
              onClick={() => setStatus('draft')}
            >
              📝 Draft
            </StatusButton>
            <StatusButton
              size="small"
              $active={status === 'active'}
              onClick={() => setStatus('active')}
            >
              ✅ Active
            </StatusButton>
            <StatusButton
              size="small"
              $active={status === 'archived'}
              onClick={() => setStatus('archived')}
            >
              📦 Archived
            </StatusButton>
          </StatusButtons>
          <p style={{ 
            fontSize: '0.8rem', 
            color: 'var(--color-text-muted)', 
            margin: '0.75rem 0 0 0' 
          }}>
            {status === 'draft' && 'Only visible to you - students cannot access'}
            {status === 'active' && 'Students can access and participate in this session'}
            {status === 'archived' && 'Read-only - students can view but not participate'}
          </p>
        </StatusSection>
      </FormCard>

      <FormActions>
        <Button
          variant="danger"
          onClick={handleDelete}
          disabled={saving}
        >
          🗑️ Delete Session
        </Button>
        <div style={{ flex: 1 }} />
        <Button variant="outline" onClick={handleBack}>
          Cancel
        </Button>
        <Button 
          onClick={handleSave}
          disabled={saving || !title.trim()}
        >
          {saving ? (
            <>
              <LoadingSpinner size="small" /> Saving...
            </>
          ) : (
            '💾 Save Changes'
          )}
        </Button>
      </FormActions>
    </PageContainer>
  );
}