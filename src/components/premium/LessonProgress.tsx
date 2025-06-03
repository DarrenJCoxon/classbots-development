'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { 
  FiPlay, 
  FiPause, 
  FiClock, 
  FiEye, 
  FiCheckCircle,
  FiCircle,
  FiTrendingUp,
  FiRepeat
} from 'react-icons/fi';
import type { PremiumLessonProgress } from '@/types/premium-course.types';

interface LessonProgressProps {
  courseId: string;
  lessonId: string;
  isTeacher?: boolean;
  studentId?: string; // For teachers viewing student progress
}

const ProgressContainer = styled.div`
  background: white;
  border-radius: 16px;
  border: 1px solid rgba(152, 93, 215, 0.1);
  box-shadow: 0 2px 8px rgba(152, 93, 215, 0.05);
  overflow: hidden;
`;

const ProgressHeader = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid rgba(152, 93, 215, 0.1);
  background: rgba(250, 248, 254, 0.5);
`;

const ProgressTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const ProgressBody = styled.div`
  padding: 24px;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: rgba(152, 93, 215, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 20px;
`;

const ProgressFill = styled(motion.div)<{ $percentage: number }>`
  height: 100%;
  width: ${({ $percentage }) => $percentage}%;
  background: linear-gradient(135deg, #8B5CF6, #EC4899);
  border-radius: 4px;
  transition: width 0.3s ease;
`;

const ProgressStats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
`;

const StatItem = styled.div`
  text-align: center;
  padding: 12px;
  background: rgba(250, 248, 254, 0.5);
  border-radius: 8px;
  border: 1px solid rgba(152, 93, 215, 0.1);
`;

const StatValue = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
`;

const StatLabel = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textLight};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
`;

const CompletionStatus = styled.div<{ $completed: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 8px;
  background: ${({ $completed, theme }) => 
    $completed 
      ? `${theme.colors.success}20` 
      : `${theme.colors.warning}20`
  };
  color: ${({ $completed, theme }) => 
    $completed 
      ? theme.colors.success 
      : theme.colors.warning
  };
  font-weight: 500;
  margin-bottom: 16px;
`;

const ProgressDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid rgba(152, 93, 215, 0.05);
  
  &:last-child {
    border-bottom: none;
  }
`;

const DetailLabel = styled.span`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textLight};
  display: flex;
  align-items: center;
  gap: 6px;
  
  svg {
    width: 14px;
    height: 14px;
  }
`;

const DetailValue = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
`;

const VideoSegments = styled.div`
  margin-top: 16px;
`;

const SegmentBar = styled.div`
  width: 100%;
  height: 6px;
  background: rgba(152, 93, 215, 0.1);
  border-radius: 3px;
  position: relative;
  margin-bottom: 8px;
`;

const WatchedSegment = styled.div<{ $start: number; $end: number; $duration: number }>`
  position: absolute;
  height: 100%;
  background: ${({ theme }) => theme.colors.success};
  border-radius: 3px;
  left: ${({ $start, $duration }) => ($start / $duration) * 100}%;
  width: ${({ $start, $end, $duration }) => (($end - $start) / $duration) * 100}%;
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: ${({ theme }) => theme.colors.textLight};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: ${({ theme }) => theme.colors.textLight};
  
  h4 {
    margin: 0 0 8px 0;
    font-size: 16px;
    font-weight: 500;
  }
  
  p {
    margin: 0;
    font-size: 14px;
  }
`;

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}h ${mins}m ${secs}s`;
  }
  return `${mins}m ${secs}s`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString();
};

export const LessonProgress: React.FC<LessonProgressProps> = ({
  courseId,
  lessonId,
  isTeacher = false,
  studentId
}) => {
  const [progress, setProgress] = useState<PremiumLessonProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProgress();
  }, [courseId, lessonId, studentId]);

  const fetchProgress = async () => {
    try {
      let url = `/api/premium/courses/${courseId}/lessons/${lessonId}/progress`;
      if (studentId) {
        url += `?studentId=${studentId}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setProgress(data.progress);
      } else {
        setError(data.error || 'Failed to load progress');
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
      setError('Failed to load progress');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ProgressContainer>
        <ProgressHeader>
          <ProgressTitle>Progress</ProgressTitle>
        </ProgressHeader>
        <ProgressBody>
          <LoadingState>Loading progress...</LoadingState>
        </ProgressBody>
      </ProgressContainer>
    );
  }

  if (error || !progress) {
    return (
      <ProgressContainer>
        <ProgressHeader>
          <ProgressTitle>Progress</ProgressTitle>
        </ProgressHeader>
        <ProgressBody>
          <EmptyState>
            <h4>No progress data</h4>
            <p>
              {isTeacher 
                ? 'Student progress will appear here once they start the lesson.'
                : 'Your progress will be tracked as you watch the lesson.'
              }
            </p>
          </EmptyState>
        </ProgressBody>
      </ProgressContainer>
    );
  }

  const videoDuration = 3600; // This should come from lesson data
  const watchPercentage = Math.min(100, (progress.watch_time_seconds / videoDuration) * 100);

  return (
    <ProgressContainer>
      <ProgressHeader>
        <ProgressTitle>Progress</ProgressTitle>
      </ProgressHeader>

      <ProgressBody>
        {/* Completion Status */}
        <CompletionStatus $completed={progress.is_completed}>
          {progress.is_completed ? <FiCheckCircle /> : <FiCircle />}
          {progress.is_completed ? 'Completed' : 'In Progress'}
        </CompletionStatus>

        {/* Progress Bar */}
        <ProgressBar>
          <ProgressFill
            $percentage={progress.progress_percentage}
            initial={{ width: 0 }}
            animate={{ width: `${progress.progress_percentage}%` }}
            transition={{ duration: 0.5 }}
          />
        </ProgressBar>

        {/* Progress Stats */}
        <ProgressStats>
          <StatItem>
            <StatValue>
              <FiTrendingUp />
              {Math.round(progress.progress_percentage)}%
            </StatValue>
            <StatLabel>Complete</StatLabel>
          </StatItem>
          
          <StatItem>
            <StatValue>
              <FiClock />
              {formatTime(progress.watch_time_seconds)}
            </StatValue>
            <StatLabel>Watch Time</StatLabel>
          </StatItem>
          
          <StatItem>
            <StatValue>
              <FiRepeat />
              {progress.rewatch_count}
            </StatValue>
            <StatLabel>Rewatches</StatLabel>
          </StatItem>
          
          <StatItem>
            <StatValue>
              <FiEye />
              {progress.notes_count}
            </StatValue>
            <StatLabel>Notes</StatLabel>
          </StatItem>
        </ProgressStats>

        {/* Detailed Progress */}
        <ProgressDetails>
          <DetailRow>
            <DetailLabel>
              <FiPlay />
              Started
            </DetailLabel>
            <DetailValue>{formatDate(progress.started_at)}</DetailValue>
          </DetailRow>
          
          {progress.completed_at && (
            <DetailRow>
              <DetailLabel>
                <FiCheckCircle />
                Completed
              </DetailLabel>
              <DetailValue>{formatDate(progress.completed_at)}</DetailValue>
            </DetailRow>
          )}
          
          <DetailRow>
            <DetailLabel>
              <FiClock />
              Last Accessed
            </DetailLabel>
            <DetailValue>{formatDate(progress.last_accessed)}</DetailValue>
          </DetailRow>
          
          <DetailRow>
            <DetailLabel>
              Video Position
            </DetailLabel>
            <DetailValue>{formatTime(progress.video_position_seconds)}</DetailValue>
          </DetailRow>
          
          <DetailRow>
            <DetailLabel>
              Playback Speed
            </DetailLabel>
            <DetailValue>{progress.playback_speed}x</DetailValue>
          </DetailRow>
        </ProgressDetails>

        {/* Video Segments Visualization */}
        {progress.video_segments_watched && progress.video_segments_watched.length > 0 && (
          <VideoSegments>
            <DetailLabel style={{ marginBottom: '8px' }}>
              Watched Segments
            </DetailLabel>
            <SegmentBar>
              {progress.video_segments_watched.map((segment, index) => (
                <WatchedSegment
                  key={index}
                  $start={segment.start}
                  $end={segment.end}
                  $duration={videoDuration}
                />
              ))}
            </SegmentBar>
            <div style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>
              Green segments show watched portions of the video
            </div>
          </VideoSegments>
        )}
      </ProgressBody>
    </ProgressContainer>
  );
};