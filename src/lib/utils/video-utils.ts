/**
 * Utility functions for video URL validation and processing
 */

export interface VideoInfo {
  platform: 'youtube' | 'vimeo' | 'unknown';
  videoId: string | null;
  embedUrl: string | null;
  originalUrl: string;
}

/**
 * Extract YouTube video ID from various URL formats
 */
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Extract Vimeo video ID from URL
 */
function extractVimeoId(url: string): string | null {
  const pattern = /vimeo\.com\/(\d+)/;
  const match = url.match(pattern);
  return match ? match[1] : null;
}

/**
 * Validate and extract video information from a URL
 */
export function parseVideoUrl(url: string): VideoInfo {
  if (!url || typeof url !== 'string') {
    return {
      platform: 'unknown',
      videoId: null,
      embedUrl: null,
      originalUrl: url
    };
  }

  // Clean the URL
  const cleanUrl = url.trim();

  // Check for YouTube
  if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
    const videoId = extractYouTubeId(cleanUrl);
    if (videoId) {
      return {
        platform: 'youtube',
        videoId,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        originalUrl: cleanUrl
      };
    }
  }

  // Check for Vimeo
  if (cleanUrl.includes('vimeo.com')) {
    const videoId = extractVimeoId(cleanUrl);
    if (videoId) {
      return {
        platform: 'vimeo',
        videoId,
        embedUrl: `https://player.vimeo.com/video/${videoId}`,
        originalUrl: cleanUrl
      };
    }
  }

  // Unknown platform or invalid URL
  return {
    platform: 'unknown',
    videoId: null,
    embedUrl: null,
    originalUrl: cleanUrl
  };
}

/**
 * Check if a URL is a supported video URL
 */
export function isVideoUrl(url: string): boolean {
  const videoInfo = parseVideoUrl(url);
  return videoInfo.platform !== 'unknown' && videoInfo.videoId !== null;
}

/**
 * Get video thumbnail URL
 */
export function getVideoThumbnail(videoInfo: VideoInfo): string | null {
  if (videoInfo.platform === 'youtube' && videoInfo.videoId) {
    // YouTube provides multiple thumbnail qualities
    return `https://img.youtube.com/vi/${videoInfo.videoId}/maxresdefault.jpg`;
  }
  
  // Vimeo thumbnails require API call, return null for now
  return null;
}

/**
 * Validate video URL format (basic validation without API calls)
 */
export function validateVideoUrl(url: string): { valid: boolean; error?: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  try {
    const urlObj = new URL(url);
    
    // Check protocol
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, error: 'URL must use HTTP or HTTPS protocol' };
    }

    // Check if it's a supported video platform
    const videoInfo = parseVideoUrl(url);
    if (videoInfo.platform === 'unknown') {
      return { valid: false, error: 'URL must be from YouTube or Vimeo' };
    }

    if (!videoInfo.videoId) {
      return { valid: false, error: 'Could not extract video ID from URL' };
    }

    return { valid: true };
  } catch (e) {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Format video metadata for storage
 */
export function formatVideoMetadata(videoInfo: VideoInfo, additionalData?: any) {
  return {
    platform: videoInfo.platform,
    videoId: videoInfo.videoId,
    embedUrl: videoInfo.embedUrl,
    originalUrl: videoInfo.originalUrl,
    thumbnailUrl: getVideoThumbnail(videoInfo),
    capturedAt: new Date().toISOString(),
    ...additionalData
  };
}