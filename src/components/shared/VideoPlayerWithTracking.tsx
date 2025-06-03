import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { 
  FiPlay, 
  FiPause, 
  FiMaximize,
  FiLoader
} from 'react-icons/fi';

interface VideoPlayerProps {
  videoId: string;
  videoServerUrl?: string;
  onProgress?: (progress: { currentTime: number; duration: number; percentage: number }) => void;
  onComplete?: () => void;
  autoPlay?: boolean;
  muted?: boolean;
  poster?: string;
  // Premium course tracking
  courseId?: string;
  lessonId?: string;
  trackProgress?: boolean;
}

const VideoContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
`;

const VideoElement = styled.video`
  width: 100%;
  height: 100%;
  object-fit: contain;
`;

const VideoOverlay = styled.div<{ $visible: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.1) 0%,
    rgba(0, 0, 0, 0) 20%,
    rgba(0, 0, 0, 0) 80%,
    rgba(0, 0, 0, 0.8) 100%
  );
  opacity: ${({ $visible }) => $visible ? 1 : 0};
  transition: opacity 0.3s ease;
  pointer-events: ${({ $visible }) => $visible ? 'auto' : 'none'};
`;

const PlayButton = styled.button`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 1);
    transform: translate(-50%, -50%) scale(1.1);
  }
  
  svg {
    width: 32px;
    height: 32px;
    color: #333;
    margin-left: 4px;
  }
`;

const Controls = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ControlButton = styled.button`
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
  
  svg {
    width: 20px;
    height: 20px;
  }
`;

const ProgressContainer = styled.div`
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
  overflow: hidden;
  cursor: pointer;
  position: relative;
`;

const ProgressBar = styled.div<{ $percentage: number }>`
  height: 100%;
  background: #8B5CF6;
  width: ${({ $percentage }) => $percentage}%;
  transition: width 0.1s ease;
`;

const TimeDisplay = styled.div`
  color: white;
  font-size: 14px;
  font-weight: 500;
  min-width: 100px;
  text-align: center;
`;

const LoadingSpinner = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  
  svg {
    width: 48px;
    height: 48px;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const ErrorMessage = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  text-align: center;
  
  h3 {
    margin: 0 0 8px 0;
    font-size: 18px;
  }
  
  p {
    margin: 0;
    font-size: 14px;
    opacity: 0.8;
  }
`;

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const VideoPlayerWithTracking: React.FC<VideoPlayerProps> = ({
  videoId,
  videoServerUrl = process.env.NEXT_PUBLIC_VIDEO_SERVER_URL,
  onProgress,
  onComplete,
  autoPlay = false,
  muted = false,
  poster,
  courseId,
  lessonId,
  trackProgress = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Progress tracking state
  const [totalWatchTime, setTotalWatchTime] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const watchedSegments = useRef<Array<{start: number; end: number}>>([]);
  const currentSegmentStart = useRef<number | null>(null);
  
  const videoUrl = `${videoServerUrl}/videos/${videoId}/720p.mp4`;
  const thumbnailUrl = `${videoServerUrl}/thumbnails/${videoId}/thumbnail.jpg`;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      const current = video.currentTime;
      const total = video.duration;
      
      setCurrentTime(current);
      
      if (onProgress && total > 0) {
        onProgress({
          currentTime: current,
          duration: total,
          percentage: (current / total) * 100
        });
      }
      
      if (onComplete && current / total >= 0.95) {
        onComplete();
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = () => {
      setError('Video failed to load. Please try again.');
      setIsLoading(false);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('error', handleError);
    };
  }, [onProgress, onComplete]);

  // Progress tracking functions
  const updateProgress = async (progressData: any) => {
    if (!trackProgress || !courseId || !lessonId) return;
    
    try {
      await fetch(`/api/premium/courses/${courseId}/lessons/${lessonId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(progressData)
      });
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  // Track video play/pause events
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !trackProgress) return;

    const handlePlayTracking = () => {
      currentSegmentStart.current = video.currentTime;
      setLastUpdateTime(Date.now());
    };

    const handlePauseTracking = () => {
      if (currentSegmentStart.current !== null) {
        const segment = {
          start: currentSegmentStart.current,
          end: video.currentTime
        };
        
        if (segment.end > segment.start) {
          watchedSegments.current.push(segment);
          const segmentDuration = segment.end - segment.start;
          setTotalWatchTime(prev => prev + segmentDuration);
        }
        
        currentSegmentStart.current = null;
      }
    };

    const handleRateChange = () => {
      setPlaybackSpeed(video.playbackRate);
    };

    video.addEventListener('play', handlePlayTracking);
    video.addEventListener('pause', handlePauseTracking);
    video.addEventListener('ended', handlePauseTracking);
    video.addEventListener('ratechange', handleRateChange);

    return () => {
      video.removeEventListener('play', handlePlayTracking);
      video.removeEventListener('pause', handlePauseTracking);
      video.removeEventListener('ended', handlePauseTracking);
      video.removeEventListener('ratechange', handleRateChange);
    };
  }, [trackProgress, courseId, lessonId]);

  // Periodic progress updates
  useEffect(() => {
    if (!trackProgress || !isPlaying) return;

    const interval = setInterval(() => {
      const video = videoRef.current;
      if (!video) return;

      const progressPercentage = duration > 0 ? (video.currentTime / duration) * 100 : 0;
      const isCompleted = progressPercentage >= 95; // Consider 95% as completed

      updateProgress({
        progress_percentage: Math.round(progressPercentage),
        watch_time_seconds: totalWatchTime,
        video_position_seconds: video.currentTime,
        video_segments_watched: watchedSegments.current,
        playback_speed: playbackSpeed,
        is_completed: isCompleted
      });
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [trackProgress, isPlaying, duration, totalWatchTime, playbackSpeed]);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const percentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <VideoContainer
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }}
    >
      <VideoElement
        ref={videoRef}
        src={videoUrl}
        poster={poster || thumbnailUrl}
        autoPlay={autoPlay}
        muted={muted}
        onClick={togglePlayPause}
      />
      
      {isLoading && (
        <LoadingSpinner>
          <FiLoader />
        </LoadingSpinner>
      )}
      
      {error && (
        <ErrorMessage>
          <h3>Video Error</h3>
          <p>{error}</p>
        </ErrorMessage>
      )}
      
      <VideoOverlay $visible={showControls || !isPlaying}>
        {!isPlaying && !isLoading && !error && (
          <PlayButton onClick={togglePlayPause}>
            <FiPlay />
          </PlayButton>
        )}
        
        <Controls>
          <ControlButton onClick={togglePlayPause}>
            {isPlaying ? <FiPause /> : <FiPlay />}
          </ControlButton>
          
          <ProgressContainer onClick={handleProgressClick}>
            <ProgressBar $percentage={percentage} />
          </ProgressContainer>
          
          <TimeDisplay>
            {formatTime(currentTime)} / {formatTime(duration)}
          </TimeDisplay>
          
          <ControlButton onClick={() => {
            const video = videoRef.current;
            if (video) {
              if (document.fullscreenElement) {
                document.exitFullscreen();
              } else {
                video.requestFullscreen();
              }
            }
          }}>
            <FiMaximize />
          </ControlButton>
        </Controls>
      </VideoOverlay>
    </VideoContainer>
  );
};