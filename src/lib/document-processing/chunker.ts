// src/lib/document-processing/chunker.ts

/**
 * Split text into chunks of approximately the specified size with overlap
 * @param text The full text to split
 * @param maxChunkSize Maximum size of each chunk in characters
 * @param overlap Number of characters to overlap between chunks
 * @returns Array of text chunks
 */
export function splitTextIntoChunks(
  text: string,
  maxChunkSize: number = 1000,
  overlap: number = 200
): string[] {
  // Validate parameters
  if (maxChunkSize <= 0) {
    console.error("[CHUNKER] maxChunkSize must be positive. Using default 1000.");
    maxChunkSize = 1000;
  }
  if (overlap < 0) {
    console.error("[CHUNKER] overlap cannot be negative. Using default 0.");
    overlap = 0;
  }
  // Ensure overlap is less than maxChunkSize to guarantee progress
  if (overlap >= maxChunkSize) {
    console.warn(`[CHUNKER] Overlap (${overlap}) is greater than or equal to maxChunkSize (${maxChunkSize}). Adjusting overlap to ensure progress.`);
    overlap = Math.max(0, Math.floor(maxChunkSize / 2) -1); // Ensure it's strictly less
  }

  const cleanedText = text
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/\n{2,}/g, "\n") // Reduce multiple newlines to single (or adjust if double is preferred)
    .trim();

  if (cleanedText.length === 0) {
    return [];
  }

  if (cleanedText.length <= maxChunkSize) {
    return [cleanedText];
  }

  const chunks: string[] = [];
  let startIndex = 0;
  let safetyBreak = 0; // To prevent accidental infinite loops during development
  const maxIterations = Math.ceil(cleanedText.length / (maxChunkSize - overlap)) + 10; // Generous estimate

  while (startIndex < cleanedText.length && safetyBreak < maxIterations) {
    safetyBreak++;
    let endIndex = Math.min(startIndex + maxChunkSize, cleanedText.length);

    // If not at the end, try to find a better breakpoint
    if (endIndex < cleanedText.length) {
      let idealEnd = endIndex;
      // Try to break at a paragraph end (double newline, now single due to cleaning)
      // Search backwards from idealEnd, but not too far back (e.g., within last 30% of chunk)
      const searchStartPara = Math.max(startIndex, idealEnd - Math.floor(maxChunkSize * 0.3));
      const paragraphBreak = cleanedText.lastIndexOf("\n", idealEnd);
      if (paragraphBreak > searchStartPara && paragraphBreak > startIndex) {
        idealEnd = paragraphBreak + 1; // Include the newline
      } else {
        // Try to break at a sentence end (period followed by space)
        // Search backwards from idealEnd
        const searchStartSentence = Math.max(startIndex, idealEnd - Math.floor(maxChunkSize * 0.2));
        const sentenceBreak = cleanedText.lastIndexOf(". ", idealEnd);
        if (sentenceBreak > searchStartSentence && sentenceBreak > startIndex) {
          idealEnd = sentenceBreak + 1; // Include the period
        } else {
          // Try to break at a space
          const searchStartSpace = Math.max(startIndex, idealEnd - Math.floor(maxChunkSize * 0.1));
          const spaceBreak = cleanedText.lastIndexOf(" ", idealEnd);
          if (spaceBreak > searchStartSpace && spaceBreak > startIndex) {
            idealEnd = spaceBreak + 1; // Include the space
          }
          // If no good break found, stick with Math.min(startIndex + maxChunkSize, cleanedText.length)
        }
      }
      endIndex = idealEnd;
    }

    const chunk = cleanedText.substring(startIndex, endIndex).trim();
    if (chunk.length > 0) { // Only push non-empty chunks
      chunks.push(chunk);
    }

    // Calculate the next starting point
    // Ensure startIndex always moves forward by at least (maxChunkSize - overlap)
    // unless it's the last chunk
    const nextStart = endIndex - overlap;

    // If nextStart isn't advancing past the current startIndex, it means chunks are too small or overlap is too big
    // This check ensures progress. If endIndex is already at the end, this loop will terminate.
    if (nextStart <= startIndex && endIndex < cleanedText.length) {
        // Force advancement if stuck, this could happen if maxChunkSize is very small or overlap is almost maxChunkSize
        // Or if the breakpoint logic consistently brings endIndex back too far.
        // A simple forced advancement might be to just move past the current chunk with minimal overlap.
        console.warn(`[CHUNKER] Potential stall detected. Forcing startIndex advancement. startIndex: ${startIndex}, endIndex: ${endIndex}, overlap: ${overlap}, nextStart: ${nextStart}`);
        startIndex = endIndex; // Effectively makes next chunk start where this one ended (no overlap if stalled)
                              // Or, for a more robust solution with overlap:
                              // startIndex = Math.max(startIndex + 1, endIndex - overlap);
    } else {
        startIndex = nextStart;
    }

    if (startIndex < 0) startIndex = 0; // Should not happen with validated overlap
  }

  if (safetyBreak >= maxIterations) {
    console.error("[CHUNKER] Safety break triggered, possible infinite loop. Returning collected chunks.", chunks.length);
  }

  // Filter out any potential empty strings again, just in case
  return chunks.filter(c => c.length > 0);
}

/**
 * Simple estimate of token count based on character count
 * @param text The text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokenCount(text: string): number {
  // Rough estimate: ~4 characters per token for English text
  return Math.ceil(text.length / 4);
}