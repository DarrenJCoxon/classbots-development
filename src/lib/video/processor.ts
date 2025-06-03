/**
 * Video Processing Utilities
 * Handles FFmpeg video processing, thumbnail generation, and metadata extraction
 */

import { spawn, exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { 
  videoConfig, 
  VideoMetadata, 
  VideoQuality,
  generateThumbnailCommand,
  generateVideoCommand,
  generateHLSCommand,
  getVideoMetadataCommand,
  formatDuration
} from './config';

export interface ProcessingJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  inputFile: string;
  outputDir: string;
  metadata?: VideoMetadata;
}

export class VideoProcessor {
  private jobs: Map<string, ProcessingJob> = new Map();

  /**
   * Extract video metadata using FFprobe
   */
  async extractMetadata(inputPath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      const args = getVideoMetadataCommand(inputPath);
      const process = spawn(args[0], args.slice(1));
      
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`FFprobe failed: ${stderr}`));
          return;
        }

        try {
          const data = JSON.parse(stdout);
          const videoStream = data.streams.find((s: any) => s.codec_type === 'video');
          const audioStream = data.streams.find((s: any) => s.codec_type === 'audio');

          if (!videoStream) {
            reject(new Error('No video stream found'));
            return;
          }

          const metadata: VideoMetadata = {
            duration: parseFloat(data.format.duration) || 0,
            width: videoStream.width || 0,
            height: videoStream.height || 0,
            bitrate: parseInt(data.format.bit_rate) || 0,
            fps: this.parseFPS(videoStream.r_frame_rate) || 0,
            format: data.format.format_name || '',
            size: parseInt(data.format.size) || 0
          };

          resolve(metadata);
        } catch (error) {
          reject(new Error(`Failed to parse metadata: ${error}`));
        }
      });
    });
  }

  /**
   * Generate thumbnail from video
   */
  async generateThumbnail(
    inputPath: string, 
    outputPath: string, 
    timeOffset: string = '00:00:01'
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = generateThumbnailCommand(inputPath, outputPath, timeOffset);
      const process = spawn(args[0], args.slice(1));
      
      let stderr = '';

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Thumbnail generation failed: ${stderr}`));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Convert video to specific quality
   */
  async convertVideo(
    inputPath: string,
    outputPath: string,
    quality: VideoQuality,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = generateVideoCommand(inputPath, outputPath, quality);
      const process = spawn(args[0], args.slice(1));
      
      let stderr = '';

      process.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        
        // Parse FFmpeg progress
        if (onProgress) {
          const progressMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
          if (progressMatch) {
            const [, hours, minutes, seconds] = progressMatch;
            const currentTime = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);
            // We'd need the total duration to calculate exact percentage
            // For now, just indicate progress is happening
            onProgress(Math.min(currentTime / 60, 99)); // Rough estimate
          }
        }
      });

      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Video conversion failed: ${stderr}`));
        } else {
          if (onProgress) onProgress(100);
          resolve();
        }
      });
    });
  }

  /**
   * Generate HLS playlist for adaptive streaming
   */
  async generateHLS(inputPath: string, outputDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = generateHLSCommand(inputPath, outputDir);
      const process = spawn(args[0], args.slice(1));
      
      let stderr = '';

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`HLS generation failed: ${stderr}`));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Process a video file completely
   */
  async processVideo(
    videoId: string,
    inputPath: string,
    onProgress?: (job: ProcessingJob) => void
  ): Promise<ProcessingJob> {
    const outputDir = path.join(videoConfig.processedPath, videoId);
    const thumbnailDir = path.join(videoConfig.thumbnailsPath, videoId);

    // Create output directories
    await fs.mkdir(outputDir, { recursive: true });
    await fs.mkdir(thumbnailDir, { recursive: true });

    const job: ProcessingJob = {
      id: videoId,
      status: 'processing',
      progress: 0,
      startedAt: new Date(),
      inputFile: inputPath,
      outputDir
    };

    this.jobs.set(videoId, job);

    try {
      // Step 1: Extract metadata (10%)
      job.progress = 5;
      if (onProgress) onProgress(job);

      const metadata = await this.extractMetadata(inputPath);
      job.metadata = metadata;
      job.progress = 10;
      if (onProgress) onProgress(job);

      // Step 2: Generate thumbnail (20%)
      const thumbnailPath = path.join(thumbnailDir, 'thumbnail.jpg');
      await this.generateThumbnail(inputPath, thumbnailPath);
      job.progress = 20;
      if (onProgress) onProgress(job);

      // Step 3: Convert to different qualities (20% - 90%)
      const totalQualities = videoConfig.qualities.length;
      let completedQualities = 0;

      for (const quality of videoConfig.qualities) {
        // Skip quality if input is smaller
        if (metadata.height < quality.height) {
          completedQualities++;
          continue;
        }

        const outputPath = path.join(outputDir, `${quality.suffix}.mp4`);
        
        await this.convertVideo(
          inputPath,
          outputPath,
          quality,
          (conversionProgress) => {
            const baseProgress = 20 + (completedQualities / totalQualities) * 60;
            const currentProgress = baseProgress + (conversionProgress / totalQualities) * 0.6;
            job.progress = Math.round(currentProgress);
            if (onProgress) onProgress(job);
          }
        );

        completedQualities++;
      }

      job.progress = 85;
      if (onProgress) onProgress(job);

      // Step 4: Generate HLS playlist (90% - 95%)
      const bestQualityFile = this.getBestQualityFile(outputDir, metadata.height);
      if (bestQualityFile) {
        await this.generateHLS(bestQualityFile, outputDir);
      }
      job.progress = 95;
      if (onProgress) onProgress(job);

      // Step 5: Cleanup and finalize (95% - 100%)
      if (videoConfig.cleanup.deleteUploadsAfterDays > 0) {
        // Don't delete immediately, let cleanup job handle it
      }

      job.progress = 100;
      job.status = 'completed';
      job.completedAt = new Date();
      
      if (onProgress) onProgress(job);

      this.jobs.set(videoId, job);
      return job;

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : String(error);
      job.completedAt = new Date();
      
      // Cleanup failed processing files
      try {
        await fs.rmdir(outputDir, { recursive: true });
        await fs.rmdir(thumbnailDir, { recursive: true });
      } catch (cleanupError) {
        console.error('Failed to cleanup after processing error:', cleanupError);
      }

      this.jobs.set(videoId, job);
      throw error;
    }
  }

  /**
   * Get processing job status
   */
  getJob(videoId: string): ProcessingJob | undefined {
    return this.jobs.get(videoId);
  }

  /**
   * Get all jobs
   */
  getAllJobs(): ProcessingJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Clear completed jobs older than specified days
   */
  clearOldJobs(days: number = 7): void {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    for (const [id, job] of this.jobs.entries()) {
      if (job.completedAt && job.completedAt < cutoff) {
        this.jobs.delete(id);
      }
    }
  }

  /**
   * Helper method to parse FPS from FFmpeg output
   */
  private parseFPS(frameRate: string): number {
    if (!frameRate) return 0;
    
    if (frameRate.includes('/')) {
      const [num, den] = frameRate.split('/').map(Number);
      return den > 0 ? num / den : 0;
    }
    
    return parseFloat(frameRate) || 0;
  }

  /**
   * Get the best quality file available for HLS generation
   */
  private getBestQualityFile(outputDir: string, inputHeight: number): string | null {
    // Find the highest quality that was actually generated
    const availableQualities = videoConfig.qualities
      .filter(q => q.height <= inputHeight)
      .sort((a, b) => b.height - a.height);

    for (const quality of availableQualities) {
      const filePath = path.join(outputDir, `${quality.suffix}.mp4`);
      try {
        require('fs').accessSync(filePath);
        return filePath;
      } catch {
        continue;
      }
    }

    return null;
  }
}

// Export singleton instance
export const videoProcessor = new VideoProcessor();

/**
 * Utility function to check if FFmpeg is available
 */
export async function checkFFmpegAvailability(): Promise<boolean> {
  return new Promise((resolve) => {
    exec(`${videoConfig.processing.ffmpegPath} -version`, (error) => {
      resolve(!error);
    });
  });
}

/**
 * Utility function to get video file info quickly
 */
export async function getQuickVideoInfo(filePath: string): Promise<{
  duration: number;
  size: number;
  format: string;
}> {
  const stats = await fs.stat(filePath);
  
  return new Promise((resolve, reject) => {
    const args = [
      videoConfig.processing.ffprobePath,
      '-v', 'quiet',
      '-show_entries', 'format=duration,format_name,size',
      '-of', 'csv=p=0',
      filePath
    ];

    exec(args.join(' '), (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }

      const parts = stdout.trim().split(',');
      resolve({
        duration: parseFloat(parts[0]) || 0,
        format: parts[1] || 'unknown',
        size: stats.size
      });
    });
  });
}

export default VideoProcessor;