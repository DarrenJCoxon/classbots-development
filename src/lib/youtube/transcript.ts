/**
 * YouTube transcript fetching utilities
 */

export interface TranscriptEntry {
  text: string;
  start: number;
  duration: number;
}

export interface VideoTranscript {
  videoId: string;
  title: string;
  transcript: TranscriptEntry[];
  fullText: string;
  duration: number;
}

/**
 * Fetch YouTube video transcript
 * Note: This is a placeholder implementation. 
 * You'll need to either:
 * 1. Use youtube-transcript package: npm install youtube-transcript
 * 2. Use YouTube Data API v3 with captions
 * 3. Use a third-party service
 */
export async function fetchYouTubeTranscript(videoId: string): Promise<VideoTranscript | null> {
  try {
    // Option 1: Using youtube-transcript package (recommended)
    // const { YoutubeTranscript } = await import('youtube-transcript');
    // const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    
    // Option 2: Using YouTube API (requires API key and more setup)
    // This would require OAuth and caption download permissions
    
    // For now, we'll use the youtube-transcript approach
    // First install: npm install youtube-transcript
    
    const { YoutubeTranscript } = await import('youtube-transcript');
    const transcriptEntries = await YoutubeTranscript.fetchTranscript(videoId);
    
    // Combine all transcript entries into full text
    const fullText = transcriptEntries
      .map(entry => entry.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Calculate total duration
    const lastEntry = transcriptEntries[transcriptEntries.length - 1];
    const duration = lastEntry ? lastEntry.offset + lastEntry.duration : 0;
    
    return {
      videoId,
      title: `YouTube Video ${videoId}`, // You'd fetch this from YouTube API
      transcript: transcriptEntries.map(entry => ({
        text: entry.text,
        start: entry.offset / 1000, // Convert to seconds
        duration: entry.duration / 1000
      })),
      fullText,
      duration: duration / 1000 // Convert to seconds
    };
  } catch (error) {
    console.error('Error fetching YouTube transcript:', error);
    
    // If transcript is not available, return null
    if (error instanceof Error && error.message.includes('Transcript is disabled')) {
      return null;
    }
    
    throw error;
  }
}

/**
 * Format transcript for knowledge base
 */
export function formatTranscriptForKnowledgeBase(transcript: VideoTranscript): string {
  const header = `# Video Transcript: ${transcript.title}
Video ID: ${transcript.videoId}
Duration: ${Math.floor(transcript.duration / 60)} minutes ${Math.floor(transcript.duration % 60)} seconds

---

`;
  
  // Add timestamps every 30 seconds or so for reference
  let formattedTranscript = header;
  let currentParagraph = '';
  let lastTimestamp = 0;
  
  for (const entry of transcript.transcript) {
    // Add timestamp markers every 30 seconds
    if (entry.start - lastTimestamp >= 30) {
      if (currentParagraph) {
        formattedTranscript += `[${formatTimestamp(lastTimestamp)}] ${currentParagraph.trim()}\n\n`;
        currentParagraph = '';
      }
      lastTimestamp = Math.floor(entry.start / 30) * 30;
    }
    
    currentParagraph += entry.text + ' ';
  }
  
  // Add any remaining text
  if (currentParagraph) {
    formattedTranscript += `[${formatTimestamp(lastTimestamp)}] ${currentParagraph.trim()}\n`;
  }
  
  return formattedTranscript;
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Check if a video has captions available
 */
export async function checkCaptionsAvailable(videoId: string): Promise<boolean> {
  try {
    await fetchYouTubeTranscript(videoId);
    return true;
  } catch (error) {
    return false;
  }
}