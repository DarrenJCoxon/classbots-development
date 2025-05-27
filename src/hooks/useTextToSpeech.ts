// useTextToSpeech hook for handling TTS functionality
import { useState, useRef, useCallback } from 'react';

interface TTSOptions {
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  speed?: number;
  userId?: string;
  directAccess?: boolean;
}

export function useTextToSpeech() {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const speak = useCallback(async (text: string, options: TTSOptions = {}) => {
    try {
      // Clean up any existing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }

      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      setIsLoading(true);
      setError(null);
      setIsPlaying(false);

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      // Make request to TTS API
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice: options.voice || 'alloy',
          speed: options.speed || 1.0,
          userId: options.userId,
          directAccess: options.directAccess,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate speech');
      }

      // Get audio blob
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Create and play audio
      audioRef.current = new Audio(audioUrl);
      
      // Set up event listeners
      audioRef.current.addEventListener('play', () => setIsPlaying(true));
      audioRef.current.addEventListener('pause', () => setIsPlaying(false));
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
        // Clean up blob URL
        URL.revokeObjectURL(audioUrl);
      });
      audioRef.current.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        setError('Failed to play audio');
        setIsPlaying(false);
      });

      // Play the audio
      await audioRef.current.play();
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.log('TTS request was cancelled');
        } else {
          console.error('TTS error:', error);
          setError(error.message);
        }
      } else {
        setError('An unexpected error occurred');
      }
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [isPlaying]);

  const resume = useCallback(() => {
    if (audioRef.current && !isPlaying) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  return {
    speak,
    stop,
    pause,
    resume,
    isLoading,
    isPlaying,
    error,
  };
}