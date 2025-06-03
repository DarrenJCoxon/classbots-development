/**
 * Simple Video Hosting Configuration
 * For self-hosted video files with FFmpeg processing
 */

export interface VideoConfig {
  storagePath: string;
  uploadsPath: string;
  processedPath: string;
  thumbnailsPath: string;
  baseUrl: string;
  thumbnailBaseUrl: string;
  maxFileSize: number; // in bytes
  allowedFormats: string[];
  qualities: VideoQuality[];
  processing: {
    enabled: boolean;
    ffmpegPath: string;
    ffprobePath: string;
    tempPath: string;
  };
  cleanup: {
    deleteUploadsAfterDays: number;
    deleteFailedAfterDays: number;
  };
}

export interface VideoQuality {
  name: string;
  width: number;
  height: number;
  bitrate: string;
  suffix: string;
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  bitrate: number;
  fps: number;
  format: string;
  size: number;
}

export interface ProcessedVideo {
  id: string;
  originalName: string;
  duration: number;
  thumbnailUrl: string;
  qualities: {
    [key: string]: {
      url: string;
      size: number;
      width: number;
      height: number;
    };
  };
  hlsPlaylist?: string;
  metadata: VideoMetadata;
  createdAt: Date;
  status: 'processing' | 'completed' | 'failed';
}

// Default video qualities
export const DEFAULT_VIDEO_QUALITIES: VideoQuality[] = [
  {
    name: '360p',
    width: 640,
    height: 360,
    bitrate: '800k',
    suffix: '360p'
  },
  {
    name: '720p',
    width: 1280,
    height: 720,
    bitrate: '2500k',
    suffix: '720p'
  },
  {
    name: '1080p',
    width: 1920,
    height: 1080,
    bitrate: '5000k',
    suffix: '1080p'
  }
];

// Environment-based configuration
const getVideoConfig = (): VideoConfig => {
  const basePath = process.env.VIDEO_STORAGE_PATH || '/var/www/classbots/videos';
  
  return {
    storagePath: basePath,
    uploadsPath: `${basePath}/uploads`,
    processedPath: `${basePath}/processed`,
    thumbnailsPath: `${basePath}/thumbnails`,
    baseUrl: process.env.VIDEO_BASE_URL || 'https://your-domain.com/videos',
    thumbnailBaseUrl: process.env.THUMBNAIL_BASE_URL || 'https://your-domain.com/thumbnails',
    maxFileSize: parseInt(process.env.VIDEO_UPLOAD_MAX_SIZE || '5368709120'), // 5GB default
    allowedFormats: [
      'mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv', 'm4v'
    ],
    qualities: DEFAULT_VIDEO_QUALITIES,
    processing: {
      enabled: process.env.VIDEO_PROCESSING_ENABLED === 'true',
      ffmpegPath: process.env.FFMPEG_PATH || '/usr/bin/ffmpeg',
      ffprobePath: process.env.FFPROBE_PATH || '/usr/bin/ffprobe',
      tempPath: `${basePath}/temp`
    },
    cleanup: {
      deleteUploadsAfterDays: parseInt(process.env.DELETE_UPLOADS_AFTER_DAYS || '7'),
      deleteFailedAfterDays: parseInt(process.env.DELETE_FAILED_AFTER_DAYS || '1')
    }
  };
};

// Validation functions
export const validateVideoConfig = (config: VideoConfig): boolean => {
  const required = ['storagePath', 'baseUrl', 'thumbnailBaseUrl'];
  
  for (const field of required) {
    if (!config[field as keyof VideoConfig]) {
      console.error(`Video configuration missing required field: ${field}`);
      return false;
    }
  }
  
  return true;
};

export const isValidVideoFormat = (filename: string): boolean => {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? videoConfig.allowedFormats.includes(extension) : false;
};

export const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export const generateVideoId = (): string => {
  return `vid_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

export const getVideoUrls = (videoId: string): { [quality: string]: string } => {
  const urls: { [quality: string]: string } = {};
  
  for (const quality of videoConfig.qualities) {
    urls[quality.name] = `${videoConfig.baseUrl}/${videoId}/${quality.suffix}.mp4`;
  }
  
  return urls;
};

export const getThumbnailUrl = (videoId: string): string => {
  return `${videoConfig.thumbnailBaseUrl}/${videoId}/thumbnail.jpg`;
};

export const getHLSPlaylistUrl = (videoId: string): string => {
  return `${videoConfig.baseUrl}/${videoId}/playlist.m3u8`;
};

// FFmpeg command generators
export const generateThumbnailCommand = (
  inputPath: string,
  outputPath: string,
  timeOffset: string = '00:00:01'
): string[] => {
  return [
    videoConfig.processing.ffmpegPath,
    '-i', inputPath,
    '-ss', timeOffset,
    '-vframes', '1',
    '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease:eval=frame',
    '-q:v', '2',
    outputPath,
    '-y'
  ];
};

export const generateVideoCommand = (
  inputPath: string,
  outputPath: string,
  quality: VideoQuality
): string[] => {
  return [
    videoConfig.processing.ffmpegPath,
    '-i', inputPath,
    '-c:v', 'libx264',
    '-crf', '23',
    '-preset', 'medium',
    '-vf', `scale=${quality.width}:${quality.height}:force_original_aspect_ratio=decrease:eval=frame`,
    '-c:a', 'aac',
    '-b:a', quality.name === '360p' ? '128k' : '192k',
    '-movflags', '+faststart',
    outputPath,
    '-y'
  ];
};

export const generateHLSCommand = (
  inputPath: string,
  outputDir: string
): string[] => {
  return [
    videoConfig.processing.ffmpegPath,
    '-i', inputPath,
    '-c', 'copy',
    '-f', 'hls',
    '-hls_time', '10',
    '-hls_list_size', '0',
    '-hls_segment_filename', `${outputDir}/segment_%03d.ts`,
    `${outputDir}/playlist.m3u8`,
    '-y'
  ];
};

export const getVideoMetadataCommand = (inputPath: string): string[] => {
  return [
    videoConfig.processing.ffprobePath,
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    inputPath
  ];
};

// Export singleton
export const videoConfig = getVideoConfig();

// Health check - Server-side only
export const checkVideoSystemHealth = async (): Promise<{
  ffmpeg: boolean;
  ffprobe: boolean;
  storage: boolean;
  processing: boolean;
}> => {
  // Only run on server side
  if (typeof window !== 'undefined') {
    throw new Error('checkVideoSystemHealth can only be called on the server side');
  }

  const health = {
    ffmpeg: false,
    ffprobe: false,
    storage: false,
    processing: false
  };

  // Check FFmpeg
  try {
    const { execSync } = eval('require')('child_process');
    execSync(`${videoConfig.processing.ffmpegPath} -version`, { timeout: 5000 });
    health.ffmpeg = true;
  } catch (error) {
    console.warn('FFmpeg not available:', error);
  }

  // Check FFprobe
  try {
    const { execSync } = eval('require')('child_process');
    execSync(`${videoConfig.processing.ffprobePath} -version`, { timeout: 5000 });
    health.ffprobe = true;
  } catch (error) {
    console.warn('FFprobe not available:', error);
  }

  // Check storage paths
  try {
    const fs = eval('require')('fs');
    health.storage = fs.existsSync(videoConfig.storagePath);
  } catch (error) {
    console.warn('Storage path not accessible:', error);
  }

  health.processing = health.ffmpeg && health.ffprobe && health.storage;

  return health;
};

export default videoConfig;