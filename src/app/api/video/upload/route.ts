import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { 
  videoConfig, 
  generateVideoId, 
  isValidVideoFormat, 
  formatFileSize 
} from '@/lib/video/config';
import { videoProcessor, getQuickVideoInfo } from '@/lib/video/processor';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('video') as File;
    const lessonId = formData.get('lessonId') as string;
    const courseId = formData.get('courseId') as string;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No video file provided' },
        { status: 400 }
      );
    }

    if (!lessonId || !courseId) {
      return NextResponse.json(
        { error: 'Lesson ID and Course ID are required' },
        { status: 400 }
      );
    }

    // Verify lesson ownership (only for existing lessons)
    if (lessonId !== 'new') {
      const { data: lesson, error: lessonError } = await supabase
        .from('premium_course_lessons')
        .select(`
          *,
          premium_courses!inner(teacher_id)
        `)
        .eq('lesson_id', lessonId)
        .eq('course_id', courseId)
        .single();

      if (lessonError || !lesson || lesson.premium_courses.teacher_id !== user.id) {
        return NextResponse.json(
          { error: 'Lesson not found or unauthorized' },
          { status: 404 }
        );
      }
    } else {
      // For new lessons, verify course ownership
      const { data: course, error: courseError } = await supabase
        .from('premium_courses')
        .select('teacher_id')
        .eq('course_id', courseId)
        .single();

      if (courseError || !course || course.teacher_id !== user.id) {
        return NextResponse.json(
          { error: 'Course not found or unauthorized' },
          { status: 404 }
        );
      }
    }

    // Validate file
    if (!isValidVideoFormat(file.name)) {
      return NextResponse.json(
        { error: 'Invalid file format. Please upload a video file.' },
        { status: 400 }
      );
    }

    if (file.size > videoConfig.maxFileSize) {
      return NextResponse.json(
        { error: `File size exceeds ${formatFileSize(videoConfig.maxFileSize)} limit` },
        { status: 400 }
      );
    }

    // Generate unique video ID
    const videoId = generateVideoId();

    try {
      // Create upload directory
      await mkdir(videoConfig.uploadsPath, { recursive: true });

      // Save uploaded file
      const fileExtension = path.extname(file.name);
      const uploadPath = path.join(videoConfig.uploadsPath, `${videoId}${fileExtension}`);
      
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(uploadPath, buffer);

      // Get quick video info for immediate response
      const quickInfo = await getQuickVideoInfo(uploadPath);

      // Start background processing (don't await)
      const processingPromise = videoProcessor.processVideo(videoId, uploadPath);
      
      // Store processing job in database for tracking
      const { error: jobError } = await supabase
        .from('video_processing_jobs')
        .insert({
          video_id: videoId,
          lesson_id: lessonId === 'new' ? null : lessonId,
          course_id: courseId,
          user_id: user.id,
          original_filename: file.name,
          file_size: file.size,
          upload_path: uploadPath,
          status: 'processing',
          created_at: new Date().toISOString()
        });

      if (jobError) {
        console.error('Failed to create processing job record:', jobError);
        // Continue anyway - the processing will still work
      }

      // Return immediate response with video ID
      return NextResponse.json({
        success: true,
        video: {
          id: videoId,
          status: 'processing',
          originalName: file.name,
          size: file.size,
          duration: quickInfo.duration,
          format: quickInfo.format,
          processingStarted: true
        }
      });

    } catch (error) {
      console.error('Video upload error:', error);
      return NextResponse.json(
        { error: 'Failed to process video upload' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in video upload:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get video processing status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    
    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    // Get processing job from memory
    const job = videoProcessor.getJob(videoId);
    
    if (!job) {
      // Check database for job record
      const { data: dbJob, error: dbError } = await supabase
        .from('video_processing_jobs')
        .select('*')
        .eq('video_id', videoId)
        .eq('user_id', user.id)
        .single();

      if (dbError || !dbJob) {
        return NextResponse.json(
          { error: 'Video processing job not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        video: {
          id: videoId,
          status: dbJob.status,
          progress: dbJob.progress || 0,
          error: dbJob.error_message,
          startedAt: dbJob.created_at,
          completedAt: dbJob.completed_at
        }
      });
    }

    // Update database with current progress
    if (job.status === 'completed' || job.status === 'failed') {
      await supabase
        .from('video_processing_jobs')
        .update({
          status: job.status,
          progress: job.progress,
          error_message: job.error,
          completed_at: job.completedAt?.toISOString(),
          metadata: job.metadata
        })
        .eq('video_id', videoId);
    }

    return NextResponse.json({
      video: {
        id: videoId,
        status: job.status,
        progress: job.progress,
        error: job.error,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        metadata: job.metadata
      }
    });

  } catch (error) {
    console.error('Error in video status check:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}