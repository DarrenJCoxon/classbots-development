// Text-to-Speech API endpoint
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import openai from '@/lib/openai/client';

export async function POST(request: NextRequest) {
  try {
    // Get request body first to check for direct access
    const body = await request.json();
    const { text, voice = 'alloy', speed = 1.0, userId, directAccess } = body;

    // Check authentication - allow both normal auth and direct access
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // If no authenticated user but direct access is requested with userId
    if ((!user || authError) && (!directAccess || !userId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For direct access, verify the user exists in auth.users
    if (directAccess && userId && !user) {
      const { createAdminClient } = await import('@/lib/supabase/admin');
      const adminClient = createAdminClient();
      
      const { data: userCheck } = await adminClient
        .from('student_profiles')
        .select('user_id')
        .eq('user_id', userId)
        .single();
        
      if (!userCheck) {
        return NextResponse.json({ error: 'Invalid user' }, { status: 401 });
      }
    }

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Limit text length to prevent abuse
    const maxLength = 4096; // OpenAI's limit
    const trimmedText = text.slice(0, maxLength);

    // Validate voice option
    const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    const selectedVoice = validVoices.includes(voice) ? voice : 'alloy';

    // Validate speed (0.25 to 4.0)
    const validSpeed = Math.max(0.25, Math.min(4.0, speed));

    // Generate speech using OpenAI
    const mp3Response = await openai.audio.speech.create({
      model: 'tts-1', // Using standard model, can upgrade to 'tts-1-hd' for higher quality
      voice: selectedVoice as any,
      input: trimmedText,
      speed: validSpeed,
    });

    // Get the audio data as ArrayBuffer
    const audioBuffer = await mp3Response.arrayBuffer();

    // Return audio file
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error('TTS API error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Failed to generate speech', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    );
  }
}