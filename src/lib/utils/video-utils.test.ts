/**
 * Tests for video utility functions
 */

import { parseVideoUrl, isVideoUrl, validateVideoUrl } from './video-utils';

describe('Video Utils', () => {
  describe('parseVideoUrl', () => {
    // YouTube tests
    test('parses standard YouTube watch URL', () => {
      const result = parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(result.platform).toBe('youtube');
      expect(result.videoId).toBe('dQw4w9WgXcQ');
      expect(result.embedUrl).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
    });

    test('parses YouTube short URL', () => {
      const result = parseVideoUrl('https://youtu.be/dQw4w9WgXcQ');
      expect(result.platform).toBe('youtube');
      expect(result.videoId).toBe('dQw4w9WgXcQ');
    });

    test('parses YouTube embed URL', () => {
      const result = parseVideoUrl('https://www.youtube.com/embed/dQw4w9WgXcQ');
      expect(result.platform).toBe('youtube');
      expect(result.videoId).toBe('dQw4w9WgXcQ');
    });

    test('parses YouTube shorts URL', () => {
      const result = parseVideoUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ');
      expect(result.platform).toBe('youtube');
      expect(result.videoId).toBe('dQw4w9WgXcQ');
    });

    // Vimeo tests
    test('parses Vimeo URL', () => {
      const result = parseVideoUrl('https://vimeo.com/123456789');
      expect(result.platform).toBe('vimeo');
      expect(result.videoId).toBe('123456789');
      expect(result.embedUrl).toBe('https://player.vimeo.com/video/123456789');
    });

    // Invalid URL tests
    test('returns unknown for non-video URL', () => {
      const result = parseVideoUrl('https://example.com/video');
      expect(result.platform).toBe('unknown');
      expect(result.videoId).toBeNull();
    });

    test('handles invalid input', () => {
      const result = parseVideoUrl('');
      expect(result.platform).toBe('unknown');
      expect(result.videoId).toBeNull();
    });
  });

  describe('isVideoUrl', () => {
    test('returns true for valid YouTube URL', () => {
      expect(isVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    });

    test('returns true for valid Vimeo URL', () => {
      expect(isVideoUrl('https://vimeo.com/123456789')).toBe(true);
    });

    test('returns false for non-video URL', () => {
      expect(isVideoUrl('https://example.com')).toBe(false);
    });
  });

  describe('validateVideoUrl', () => {
    test('validates correct YouTube URL', () => {
      const result = validateVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('rejects non-HTTPS URL', () => {
      const result = validateVideoUrl('ftp://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('HTTP or HTTPS');
    });

    test('rejects non-supported platform', () => {
      const result = validateVideoUrl('https://example.com/video');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('YouTube or Vimeo');
    });

    test('rejects invalid URL format', () => {
      const result = validateVideoUrl('not-a-url');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid URL');
    });
  });
});