// src/components/teacher/EmbeddingStatus.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Card, Alert } from '@/styles/StyledComponents';
import { GlassCard } from '@/components/shared/GlassCard';
import { Document, ProcessingStats } from '@/types/knowledge-base.types';

const StatusContainer = styled(GlassCard)`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  padding: ${({ theme }) => theme.spacing.xl};
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  padding-bottom: ${({ theme }) => theme.spacing.md};
  border-bottom: 1px solid rgba(152, 93, 215, 0.1);
`;

const Title = styled.h3`
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.25rem;
  font-weight: 600;
`;

const ProgressContainer = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const ProgressBar = styled.div`
  height: 12px;
  background: rgba(152, 93, 215, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(152, 93, 215, 0.2);
  border-radius: 20px;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);
`;

const ProgressFill = styled.div<{ $progress: number; $hasErrors: boolean }>`
  height: 100%;
  width: ${({ $progress }) => `${$progress}%`};
  background: ${({ theme, $hasErrors }) => 
    $hasErrors 
      ? `linear-gradient(135deg, ${theme.colors.warning}, ${theme.colors.danger})`
      : `linear-gradient(135deg, ${theme.colors.success}, ${theme.colors.primary})`
  };
  transition: width 0.5s ease;
  border-radius: 20px;
  box-shadow: 0 2px 8px ${({ theme, $hasErrors }) => 
    $hasErrors ? 'rgba(254, 67, 114, 0.3)' : 'rgba(76, 190, 243, 0.3)'
  };
`;

const StatsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const StatCard = styled.div`
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(152, 93, 215, 0.1);
  border-radius: ${({ theme }) => theme.borderRadius.large};
  padding: ${({ theme }) => theme.spacing.lg};
  text-align: center;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(152, 93, 215, 0.1);
    border-color: rgba(152, 93, 215, 0.2);
  }
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.magenta}
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-family: ${({ theme }) => theme.fonts.heading};
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.textMuted};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-family: ${({ theme }) => theme.fonts.body};
`;

const StatusText = styled.div<{ $isComplete: boolean; $hasErrors: boolean }>`
  color: ${({ theme, $isComplete, $hasErrors }) => 
    $isComplete 
      ? $hasErrors ? theme.colors.danger : theme.colors.success 
      : theme.colors.text};
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  font-weight: 600;
  font-size: 1rem;
  font-family: ${({ theme }) => theme.fonts.body};
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
      <StatusContainer variant="light" hoverable={false}>
        <p>Loading processing status...</p>
      </StatusContainer>
    );
  }

  if (error) {
    return (
      <StatusContainer variant="light" hoverable={false}>
        <ModernAlert $variant="error">{error}</ModernAlert>
      </StatusContainer>
    );
  }

  if (!stats) {
    return (
      <StatusContainer variant="light" hoverable={false}>
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
    <StatusContainer variant="light" hoverable={false}>
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
        <ModernAlert $variant="error">Error: {document.error_message}</ModernAlert>
      )}
    </StatusContainer>
  );
}