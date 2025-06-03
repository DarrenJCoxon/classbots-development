import React, { useState, useRef, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiUpload, 
  FiVideo, 
  FiX, 
  FiCheck, 
  FiAlertCircle, 
  FiPlay,
  FiPause,
  FiRefreshCw,
  FiTrash2
} from 'react-icons/fi';
import { ModernButton } from '@/components/shared/ModernButton';
import { formatFileSize, isValidVideoFormat } from '@/lib/video/config';

interface VideoUploaderProps {
  courseId: string;
  lessonId: string;
  onUploadComplete: (videoData: any) => void;
  onUploadError: (error: string) => void;
  maxFileSize?: number; // in bytes, default 2GB
  disabled?: boolean;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  remainingTime?: number;
  speed?: number;
}

interface UploadState {
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
  file?: File;
  progress?: UploadProgress;
  error?: string;
  videoData?: any;
}

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const UploadContainer = styled.div`
  background: white;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid rgba(152, 93, 215, 0.1);
`;

const DropZone = styled.div<{ $isDragOver: boolean; $disabled: boolean }>`
  border: 2px dashed ${({ $isDragOver, theme }) => 
    $isDragOver ? theme.colors.primary : 'rgba(152, 93, 215, 0.3)'
  };
  border-radius: 12px;
  padding: 48px 24px;
  text-align: center;
  background: ${({ $isDragOver }) => 
    $isDragOver ? 'rgba(152, 93, 215, 0.05)' : 'rgba(250, 248, 254, 0.5)'
  };
  transition: all 0.3s ease;
  cursor: ${({ $disabled }) => $disabled ? 'not-allowed' : 'pointer'};
  opacity: ${({ $disabled }) => $disabled ? 0.6 : 1};
  
  &:hover {
    border-color: ${({ theme, $disabled }) => $disabled ? 'rgba(152, 93, 215, 0.3)' : theme.colors.primary};
    background: ${({ $disabled }) => $disabled ? 'rgba(250, 248, 254, 0.5)' : 'rgba(250, 248, 254, 0.8)'};
  }
`;

const UploadIcon = styled.div<{ $uploading: boolean }>`
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(152, 93, 215, 0.1);
  animation: ${({ $uploading }) => $uploading ? pulse : 'none'} 2s ease-in-out infinite;
  
  svg {
    width: 32px;
    height: 32px;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const UploadText = styled.h3`
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const UploadSubtext = styled.p`
  margin: 0 0 24px 0;
  color: ${({ theme }) => theme.colors.textLight};
  font-size: 14px;
  line-height: 1.5;
`;

const FileInput = styled.input`
  display: none;
`;

const ProgressContainer = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid rgba(152, 93, 215, 0.1);
`;

const FileInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  padding: 16px;
  background: rgba(250, 248, 254, 0.5);
  border-radius: 8px;
`;

const FileIcon = styled.div`
  width: 48px;
  height: 48px;
  background: rgba(152, 93, 215, 0.1);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  svg {
    width: 24px;
    height: 24px;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const FileDetails = styled.div`
  flex: 1;
  
  .file-name {
    font-size: 16px;
    font-weight: 500;
    color: ${({ theme }) => theme.colors.text};
    margin-bottom: 4px;
  }
  
  .file-size {
    font-size: 14px;
    color: ${({ theme }) => theme.colors.textLight};
  }
`;

const FileActions = styled.div`
  display: flex;
  gap: 8px;
`;

const ProgressBar = styled.div`
  background: rgba(152, 93, 215, 0.1);
  border-radius: 8px;
  height: 8px;
  overflow: hidden;
  margin-bottom: 16px;
`;

const ProgressFill = styled(motion.div)<{ $percentage: number }>`
  height: 100%;
  background: linear-gradient(90deg, 
    ${({ theme }) => theme.colors.primary}, 
    ${({ theme }) => theme.colors.magenta}
  );
  border-radius: 8px;
  width: ${({ $percentage }) => $percentage}%;
`;

const ProgressInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textLight};
`;

const StatusContainer = styled.div`
  text-align: center;
  padding: 24px;
`;

const StatusIcon = styled.div<{ $type: 'success' | 'error' | 'processing' }>`
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $type, theme }) => {
    switch ($type) {
      case 'success': return theme.colors.success + '20';
      case 'error': return theme.colors.red + '20';
      case 'processing': return theme.colors.warning + '20';
      default: return theme.colors.primary + '20';
    }
  }};
  
  svg {
    width: 32px;
    height: 32px;
    color: ${({ $type, theme }) => {
      switch ($type) {
        case 'success': return theme.colors.success;
        case 'error': return theme.colors.red;
        case 'processing': return theme.colors.warning;
        default: return theme.colors.primary;
      }
    }};
  }
`;

const StatusText = styled.h3`
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const StatusSubtext = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textLight};
  font-size: 14px;
`;

const ErrorAlert = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 16px;
  margin-top: 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  
  svg {
    width: 20px;
    height: 20px;
    color: ${({ theme }) => theme.colors.red};
    flex-shrink: 0;
    margin-top: 2px;
  }
  
  .error-text {
    color: ${({ theme }) => theme.colors.red};
    font-size: 14px;
    line-height: 1.5;
    margin: 0;
  }
`;

export const VideoUploader: React.FC<VideoUploaderProps> = ({
  courseId,
  lessonId,
  onUploadComplete,
  onUploadError,
  maxFileSize = 2 * 1024 * 1024 * 1024, // 2GB
  disabled = false
}) => {
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle' });
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAbortController = useRef<AbortController | null>(null);

  const validateFile = (file: File): string | null => {
    if (!isValidVideoFormat(file.name)) {
      return 'Invalid file format. Please upload a video file (MP4, AVI, MOV, MKV, WebM, etc.)';
    }
    
    if (file.size > maxFileSize) {
      return `File size exceeds ${formatFileSize(maxFileSize)} limit`;
    }
    
    return null;
  };

  const uploadVideo = async (file: File) => {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('lessonId', lessonId);
    formData.append('courseId', courseId);

    uploadAbortController.current = new AbortController();

    try {
      const xhr = new XMLHttpRequest();
      
      return new Promise<any>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentage = (event.loaded / event.total) * 100;
            const speed = event.loaded / ((Date.now() - startTime) / 1000);
            const remainingBytes = event.total - event.loaded;
            const remainingTime = remainingBytes / speed;

            setUploadState(prev => ({
              ...prev,
              progress: {
                loaded: event.loaded,
                total: event.total,
                percentage: Math.min(percentage, 95), // Cap at 95% until processing starts
                remainingTime,
                speed
              }
            }));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (error) {
              reject(new Error('Invalid response format'));
            }
          } else {
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              reject(new Error(errorResponse.error || `Upload failed with status ${xhr.status}`));
            } catch {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelled'));
        });

        uploadAbortController.current?.signal.addEventListener('abort', () => {
          xhr.abort();
        });

        const startTime = Date.now();
        const videoServerUrl = process.env.NEXT_PUBLIC_VIDEO_SERVER_URL || 'http://localhost:3000';
        xhr.open('POST', `${videoServerUrl}/api/video/upload`);
        xhr.send(formData);
      });

    } catch (error) {
      throw error;
    }
  };

  const handleFileSelect = useCallback(async (file: File) => {
    if (disabled) return;

    const validationError = validateFile(file);
    if (validationError) {
      setUploadState({
        status: 'error',
        error: validationError
      });
      onUploadError(validationError);
      return;
    }

    setUploadState({
      status: 'uploading',
      file,
      progress: { loaded: 0, total: file.size, percentage: 0 }
    });

    try {
      const response = await uploadVideo(file);
      
      setUploadState({
        status: 'processing',
        file,
        videoData: response.video
      });

      // Poll for processing completion
      const checkProcessing = async () => {
        try {
          const videoServerUrl = process.env.NEXT_PUBLIC_VIDEO_SERVER_URL || 'http://localhost:3000';
          const statusResponse = await fetch(`${videoServerUrl}/api/video/upload?videoId=${response.video.id}`);
          const statusData = await statusResponse.json();
          
          if (statusData.video.status === 'completed') {
            setUploadState({
              status: 'completed',
              file,
              videoData: {
                id: statusData.video.id,
                duration: statusData.video.metadata?.duration || 0,
                thumbnailUrl: `${videoServerUrl}/thumbnails/${statusData.video.id}/thumbnail.jpg`,
                qualities: statusData.video.metadata ? {
                  '360p': `${videoServerUrl}/videos/${statusData.video.id}/360p.mp4`,
                  '720p': `${videoServerUrl}/videos/${statusData.video.id}/720p.mp4`,
                  '1080p': `${videoServerUrl}/videos/${statusData.video.id}/1080p.mp4`
                } : {},
                hlsUrl: `${videoServerUrl}/videos/${statusData.video.id}/playlist.m3u8`
              }
            });
            onUploadComplete({
              id: statusData.video.id,
              duration: statusData.video.metadata?.duration || 0,
              thumbnailUrl: `${videoServerUrl}/thumbnails/${statusData.video.id}/thumbnail.jpg`,
              qualities: statusData.video.metadata ? {
                '360p': `${videoServerUrl}/videos/${statusData.video.id}/360p.mp4`,
                '720p': `${videoServerUrl}/videos/${statusData.video.id}/720p.mp4`,
                '1080p': `${videoServerUrl}/videos/${statusData.video.id}/1080p.mp4`
              } : {},
              hlsUrl: `${videoServerUrl}/videos/${statusData.video.id}/playlist.m3u8`
            });
          } else if (statusData.video.status === 'failed') {
            throw new Error(statusData.video.error || 'Video processing failed');
          } else {
            // Update progress if available
            setUploadState(prev => ({
              ...prev,
              progress: {
                ...prev.progress!,
                percentage: Math.max(prev.progress?.percentage || 95, statusData.video.progress || 95)
              }
            }));
            
            // Still processing, check again in 3 seconds
            setTimeout(checkProcessing, 3000);
          }
        } catch (error) {
          setUploadState({
            status: 'error',
            file,
            error: error instanceof Error ? error.message : 'Video processing failed'
          });
          onUploadError(error instanceof Error ? error.message : 'Video processing failed');
        }
      };

      // Start checking processing status
      setTimeout(checkProcessing, 2000);

    } catch (error) {
      setUploadState({
        status: 'error',
        file,
        error: error instanceof Error ? error.message : 'Upload failed'
      });
      onUploadError(error instanceof Error ? error.message : 'Upload failed');
    }
  }, [courseId, lessonId, disabled, maxFileSize, onUploadComplete, onUploadError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect, disabled]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleBrowseClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const cancelUpload = () => {
    uploadAbortController.current?.abort();
    setUploadState({ status: 'idle' });
  };

  const resetUpload = () => {
    setUploadState({ status: 'idle' });
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.ceil(seconds)} seconds`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.ceil(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    const mbps = (bytesPerSecond * 8) / (1024 * 1024);
    return `${mbps.toFixed(1)} Mbps`;
  };

  return (
    <UploadContainer>
      <AnimatePresence mode="wait">
        {uploadState.status === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <DropZone
              $isDragOver={isDragOver}
              $disabled={disabled}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={handleBrowseClick}
            >
              <UploadIcon $uploading={false}>
                <FiUpload />
              </UploadIcon>
              <UploadText>Drop your video here</UploadText>
              <UploadSubtext>
                Or click to browse files<br />
                Supports MP4, AVI, MOV, MKV, WebM and more<br />
                Maximum size: {formatFileSize(maxFileSize)}
              </UploadSubtext>
              <ModernButton variant="secondary" disabled={disabled}>
                Choose Video File
              </ModernButton>
            </DropZone>
            <FileInput
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileInputChange}
            />
          </motion.div>
        )}

        {(uploadState.status === 'uploading' || uploadState.status === 'processing') && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <ProgressContainer>
              {uploadState.file && (
                <FileInfo>
                  <FileIcon>
                    <FiVideo />
                  </FileIcon>
                  <FileDetails>
                    <div className="file-name">{uploadState.file.name}</div>
                    <div className="file-size">{formatFileSize(uploadState.file.size)}</div>
                  </FileDetails>
                  <FileActions>
                    {uploadState.status === 'uploading' && (
                      <ModernButton variant="ghost" size="small" onClick={cancelUpload}>
                        <FiX /> Cancel
                      </ModernButton>
                    )}
                  </FileActions>
                </FileInfo>
              )}

              {uploadState.status === 'uploading' && uploadState.progress && (
                <>
                  <ProgressBar>
                    <ProgressFill
                      $percentage={uploadState.progress.percentage}
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadState.progress.percentage}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </ProgressBar>
                  <ProgressInfo>
                    <span>{Math.round(uploadState.progress.percentage)}% uploaded</span>
                    <span>
                      {uploadState.progress.speed && formatSpeed(uploadState.progress.speed)} • 
                      {uploadState.progress.remainingTime && formatTime(uploadState.progress.remainingTime)} remaining
                    </span>
                  </ProgressInfo>
                </>
              )}

              {uploadState.status === 'processing' && (
                <StatusContainer>
                  <StatusIcon $type="processing">
                    <FiRefreshCw />
                  </StatusIcon>
                  <StatusText>Processing Video</StatusText>
                  <StatusSubtext>
                    Your video is being transcoded and optimized. This may take a few minutes.
                  </StatusSubtext>
                </StatusContainer>
              )}
            </ProgressContainer>
          </motion.div>
        )}

        {uploadState.status === 'completed' && (
          <motion.div
            key="completed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <StatusContainer>
              <StatusIcon $type="success">
                <FiCheck />
              </StatusIcon>
              <StatusText>Upload Complete!</StatusText>
              <StatusSubtext>
                Your video has been successfully uploaded and processed.
              </StatusSubtext>
              <div style={{ marginTop: '16px' }}>
                <ModernButton variant="ghost" onClick={resetUpload}>
                  Upload Another Video
                </ModernButton>
              </div>
            </StatusContainer>
          </motion.div>
        )}

        {uploadState.status === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <StatusContainer>
              <StatusIcon $type="error">
                <FiAlertCircle />
              </StatusIcon>
              <StatusText>Upload Failed</StatusText>
              <StatusSubtext>
                There was an error uploading your video. Please try again.
              </StatusSubtext>
              {uploadState.error && (
                <ErrorAlert>
                  <FiAlertCircle />
                  <p className="error-text">{uploadState.error}</p>
                </ErrorAlert>
              )}
              <div style={{ marginTop: '16px' }}>
                <ModernButton variant="primary" onClick={resetUpload}>
                  Try Again
                </ModernButton>
              </div>
            </StatusContainer>
          </motion.div>
        )}
      </AnimatePresence>
    </UploadContainer>
  );
};