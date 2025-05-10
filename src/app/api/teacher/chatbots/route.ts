// src/app/api/teacher/chatbots/route.ts
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { CreateChatbotPayload } from '@/types/database.types'; // Ensure this type is correct

// GET Handler to fetch chatbots
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { data: chatbots, error: fetchError } = await supabase
      .from('chatbots')
      .select('*')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching chatbots:', fetchError);
      throw fetchError;
    }

    return NextResponse.json(chatbots || []);
  } catch (error) {
    console.error('Error in GET /api/teacher/chatbots:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch chatbots' },
      { status: 500 }
    );
  }
}

// POST Handler to create a new chatbot
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const body: CreateChatbotPayload = await request.json();

    if (!body.name || !body.system_prompt) {
        return NextResponse.json({ error: 'Name and system prompt are required' }, { status: 400 });
    }

    const { data: newChatbot, error: insertError } = await supabase
      .from('chatbots')
      .insert({
        name: body.name,
        description: body.description,
        system_prompt: body.system_prompt,
        teacher_id: user.id,
        model: body.model || 'x-ai/grok-3-mini-beta',
        max_tokens: body.max_tokens || 1000,
        temperature: body.temperature || 0.7,
        enable_rag: body.enable_rag || false,
        // created_at and updated_at have defaults
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating chatbot:', insertError);
      throw insertError;
    }

    return NextResponse.json(newChatbot, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/teacher/chatbots:', error);
    // Check for specific Supabase error codes if needed
    if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === '23505') { // Unique violation
             return NextResponse.json({ error: 'A chatbot with this name might already exist or another unique constraint was violated.' }, { status: 409 });
        }
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create chatbot' },
      { status: 500 }
    );
  }
}