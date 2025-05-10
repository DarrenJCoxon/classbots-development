// src/components/teacher/EmbeddingStatus.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Card, Alert } from '@/styles/StyledComponents';
import { Document, ProcessingStats } from '@/types/knowledge-base.types';

const StatusContainer = styled(Card)`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Title = styled.h3`
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
`;

const ProgressContainer = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const ProgressBar = styled.div`
  height: 8px;
  background-color: ${({ theme }) => theme.colors.backgroundDark};
  border-radius: ${({ theme }) => theme.borderRadius.small};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $progress: number; $hasErrors: boolean }>`
  height: 100%;
  width: ${({ $progress }) => `${$progress}%`};
  background-color: ${({ theme, $hasErrors }) => 
    $hasErrors ? theme.colors.secondary : theme.colors.green};
  transition: width 0.5s ease;
`;

const StatsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const StatCard = styled.div`
  background-color: ${({ theme }) => theme.colors.backgroundDark};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  padding: ${({ theme }) => theme.spacing.md};
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  color: ${({ theme }) => theme.colors.text};
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const StatusText = styled.div<{ $isComplete: boolean; $hasErrors: boolean }>`
  color: ${({ theme, $isComplete, $hasErrors }) => 
    $isComplete 
      ? $hasErrors ? theme.colors.secondary : theme.colors.green 
      : theme.colors.text};
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

interface EmbeddingStatusProps {
  document: Document;
  chatbotId: string;
  onRefresh?: () => void;
}

export default function EmbeddingStatus({ 
  document, 
  chatbotId,
  onRefresh
}: EmbeddingStatusProps) {
  const [stats, setStats] = useState<ProcessingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/teacher/chatbots/${chatbotId}/vectorize?documentId=${document.document_id}`
      );
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch processing status');
      }
      
      const data = await response.json();
      setStats(data.processingStats);
      
      // Update document with latest status
      if (data.document.status !== document.status && onRefresh) {
        onRefresh();
      }
      
      // If processing is complete, stop polling
      if (data.document.status === 'completed' || data.document.status === 'error') {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch processing status');
    } finally {
      setLoading(false);
    }
  }, [document.document_id, document.status, chatbotId, onRefresh, pollingInterval]);

  useEffect(() => {
    fetchStatus();
    
    // Set up polling for processing status
    if (document.status === 'processing' && !pollingInterval) {
      const interval = setInterval(fetchStatus, 5000); // Poll every 5 seconds
      setPollingInterval(interval);
    }
    
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [document.status, fetchStatus, pollingInterval]);

  if (loading) {
    return (
      <StatusContainer>
        <p>Loading processing status...</p>
      </StatusContainer>
    );
  }

  if (error) {
    return (
      <StatusContainer>
        <Alert variant="error">{error}</Alert>
      </StatusContainer>
    );
  }

  if (!stats) {
    return (
      <StatusContainer>
        <p>No processing statistics available</p>
      </StatusContainer>
    );
  }

  const progressPercent = stats.totalChunks > 0
    ? Math.round((stats.processedChunks / stats.totalChunks) * 100)
    : 0;
  
  const hasErrors = stats.errorChunks > 0;
  const isComplete = document.status === 'completed' || 
                     (document.status === 'processing' && progressPercent === 100);

  return (
    <StatusContainer>
      <Header>
        <Title>Document Processing Status</Title>
      </Header>
      
      <ProgressContainer>
        <ProgressBar>
          <ProgressFill $progress={progressPercent} $hasErrors={hasErrors} />
        </ProgressBar>
        <StatusText 
          $isComplete={isComplete} 
          $hasErrors={hasErrors}
        >
          {document.status === 'error' ? 'Processing failed' :
           isComplete ? 'Processing complete' : 'Processing in progress'}
           {hasErrors && ' (with some errors)'}
           {document.status === 'processing' && ` - ${progressPercent}%`}
        </StatusText>
      </ProgressContainer>
      
      <StatsContainer>
        <StatCard>
          <StatValue>{stats.totalChunks}</StatValue>
          <StatLabel>Total Chunks</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.processedChunks}</StatValue>
          <StatLabel>Processed</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.errorChunks}</StatValue>
          <StatLabel>Errors</StatLabel>
        </StatCard>
      </StatsContainer>
      
      {document.error_message && (
        <Alert variant="error">Error: {document.error_message}</Alert>
      )}
    </StatusContainer>
  );
}