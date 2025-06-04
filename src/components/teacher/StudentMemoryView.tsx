// src/components/teacher/StudentMemoryView.tsx
'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Card } from '@/components/ui/Card';
import { ModernButton } from '@/components/shared/ModernButton';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { createClient } from '@/lib/supabase/client';

const MemoryContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const MemoryCard = styled(Card)`
  padding: 1.5rem;
`;

const SectionTitle = styled.h3`
  margin: 0 0 1rem 0;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 1.2rem;
`;

const MemoryItem = styled.div`
  background: ${({ theme }) => theme.colors.backgroundCard};
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const MemoryMeta = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.textLight};
  margin-bottom: 0.5rem;
`;

const TopicsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const TopicBadge = styled.span<{ type?: 'mastered' | 'progress' | 'struggling' }>`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  background: ${({ theme, type }) => {
    switch (type) {
      case 'mastered': return theme.colors.success + '20';
      case 'struggling': return theme.colors.danger + '20';
      default: return theme.colors.primary + '20';
    }
  }};
  color: ${({ theme, type }) => {
    switch (type) {
      case 'mastered': return theme.colors.success;
      case 'struggling': return theme.colors.danger;
      default: return theme.colors.primary;
    }
  }};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: ${({ theme }) => theme.colors.textLight};
`;

interface StudentMemoryViewProps {
  studentId: string;
  chatbotId: string;
  studentName?: string;
}

interface Memory {
  id: string;
  conversation_summary: string;
  key_topics: string[];
  learning_insights: {
    understood: string[];
    struggling: string[];
    progress: string;
  };
  next_steps: string;
  created_at: string;
  message_count: number;
  session_duration_seconds: number;
}

interface LearningProfile {
  topics_mastered: string[];
  topics_in_progress: string[];
  topics_struggling: string[];
  preferred_explanation_style?: string;
  pace_preference?: string;
  total_sessions: number;
  total_messages: number;
  last_session_at?: string;
}

export default function StudentMemoryView({ studentId, chatbotId, studentName }: StudentMemoryViewProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [profile, setProfile] = useState<LearningProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchMemoryData();
  }, [studentId, chatbotId]);

  const fetchMemoryData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/student/memory?studentId=${studentId}&chatbotId=${chatbotId}&limit=10`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch memory data');
      }

      const data = await response.json();
      setMemories(data.memories || []);
      setProfile(data.profile);
    } catch (err) {
      console.error('Error fetching memory data:', err);
      setError('Failed to load memory data');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min`;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <LoadingSpinner />
        <p style={{ marginTop: '1rem' }}>Loading memory data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <p style={{ color: 'red' }}>{error}</p>
        <ModernButton onClick={fetchMemoryData}>Retry</ModernButton>
      </Card>
    );
  }

  return (
    <MemoryContainer>
      {/* Learning Profile */}
      {profile && (
        <MemoryCard>
          <SectionTitle>Learning Profile</SectionTitle>
          
          <p><strong>Total Sessions:</strong> {profile.total_sessions}</p>
          <p><strong>Total Messages:</strong> {profile.total_messages}</p>
          {profile.last_session_at && (
            <p><strong>Last Session:</strong> {formatTimeAgo(profile.last_session_at)}</p>
          )}
          
          {profile.preferred_explanation_style && (
            <p><strong>Learning Style:</strong> {profile.preferred_explanation_style}</p>
          )}
          
          {profile.pace_preference && (
            <p><strong>Pace Preference:</strong> {profile.pace_preference}</p>
          )}

          {profile.topics_mastered.length > 0 && (
            <>
              <h4>Topics Mastered</h4>
              <TopicsList>
                {profile.topics_mastered.map((topic, idx) => (
                  <TopicBadge key={idx} type="mastered">{topic}</TopicBadge>
                ))}
              </TopicsList>
            </>
          )}

          {profile.topics_in_progress.length > 0 && (
            <>
              <h4>Currently Learning</h4>
              <TopicsList>
                {profile.topics_in_progress.map((topic, idx) => (
                  <TopicBadge key={idx} type="progress">{topic}</TopicBadge>
                ))}
              </TopicsList>
            </>
          )}

          {profile.topics_struggling.length > 0 && (
            <>
              <h4>Needs Support With</h4>
              <TopicsList>
                {profile.topics_struggling.map((topic, idx) => (
                  <TopicBadge key={idx} type="struggling">{topic}</TopicBadge>
                ))}
              </TopicsList>
            </>
          )}
        </MemoryCard>
      )}

      {/* Conversation History */}
      <MemoryCard>
        <SectionTitle>Recent Conversations</SectionTitle>
        
        {memories.length === 0 ? (
          <EmptyState>No conversation history yet</EmptyState>
        ) : (
          memories.map((memory) => (
            <MemoryItem key={memory.id}>
              <MemoryMeta>
                {formatTimeAgo(memory.created_at)} • {memory.message_count} messages • {formatDuration(memory.session_duration_seconds)}
              </MemoryMeta>
              
              <p><strong>Summary:</strong> {memory.conversation_summary}</p>
              
              {memory.key_topics.length > 0 && (
                <>
                  <strong>Topics Discussed:</strong>
                  <TopicsList>
                    {memory.key_topics.map((topic, idx) => (
                      <TopicBadge key={idx}>{topic}</TopicBadge>
                    ))}
                  </TopicsList>
                </>
              )}
              
              {memory.learning_insights.progress && (
                <p style={{ marginTop: '0.5rem' }}>
                  <strong>Progress:</strong> {memory.learning_insights.progress}
                </p>
              )}
              
              {memory.next_steps && (
                <p style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>
                  <strong>Next Steps:</strong> {memory.next_steps}
                </p>
              )}
            </MemoryItem>
          ))
        )}
      </MemoryCard>
    </MemoryContainer>
  );
}