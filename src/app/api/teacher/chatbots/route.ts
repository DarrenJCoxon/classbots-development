// src/app/api/teacher/chatbots/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { deleteChatbotVectors } from '@/lib/pinecone/utils';
import type { CreateChatbotPayload, Chatbot as DatabaseChatbot } from '@/types/database.types'; // Added DatabaseChatbot type

// GET Handler
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
      .select('*') // This will now include welcome_message if the DB column exists
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

// POST Handler
export async function POST(request: NextRequest) {
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
    console.log("[API POST /teacher/chatbots] Received payload for creation:", body);

    if (!body.name || !body.system_prompt) {
        return NextResponse.json({ error: 'Name and system prompt are required' }, { status: 400 });
    }
    if (body.bot_type === 'assessment' && (!body.assessment_criteria_text || body.assessment_criteria_text.trim() === '')) {
        return NextResponse.json({ error: 'Assessment criteria are required for assessment bots.' }, { status: 400 });
    }

    // Explicitly type the object being inserted to match a subset of DatabaseChatbot
    const chatbotDataToInsert: Omit<DatabaseChatbot, 'chatbot_id' | 'created_at' | 'updated_at'> & { teacher_id: string } = {
      name: body.name,
      description: body.description || undefined, // Keep undefined if not provided
      system_prompt: body.system_prompt,
      teacher_id: user.id,
      model: body.model || 'x-ai/grok-3-mini-beta',
      max_tokens: body.max_tokens === undefined || body.max_tokens === null ? 1000 : Number(body.max_tokens),
      temperature: body.temperature === undefined || body.temperature === null ? 0.7 : Number(body.temperature),
      enable_rag: body.bot_type === 'learning' ? (body.enable_rag || false) : false,
      bot_type: body.bot_type || 'learning',
      assessment_criteria_text: body.bot_type === 'assessment' ? body.assessment_criteria_text : null,
      welcome_message: body.welcome_message || null, // <-- ADDED: ensure null if empty/undefined
    };
    if (chatbotDataToInsert.description === undefined) {
        delete chatbotDataToInsert.description; // Remove if undefined to avoid inserting 'undefined'
    }


    const { data: newChatbot, error: insertError } = await supabase
      .from('chatbots')
      .insert(chatbotDataToInsert)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating chatbot:', insertError);
      if (insertError.code === '23505') {
         return NextResponse.json({ error: 'A chatbot with this name might already exist or another unique constraint was violated.' }, { status: 409 });
      }
      throw insertError;
    }

    return NextResponse.json(newChatbot, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/teacher/chatbots:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create chatbot' },
      { status: 500 }
    );
  }
}


// DELETE Handler
export async function DELETE(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const chatbotId = searchParams.get('chatbotId');

    if (!chatbotId) {
        return NextResponse.json({ error: 'Chatbot ID is required as a query parameter for deletion' }, { status: 400 });
    }
    console.log(`[API DELETE /chatbots?chatbotId=${chatbotId}] Request received.`);

    const supabase = await createServerSupabaseClient();
    const adminSupabase = createAdminClient();

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { data: chatbot, error: fetchError } = await supabase
            .from('chatbots')
            .select('teacher_id, name')
            .eq('chatbot_id', chatbotId)
            .single();

        if (fetchError) {
            console.error(`[API DELETE /chatbots?chatbotId=${chatbotId}] Error fetching chatbot: ${fetchError.message}`);
            if (fetchError.code === 'PGRST116') return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
            return NextResponse.json({ error: 'Failed to fetch chatbot details' }, { status: 500 });
        }
        if (!chatbot) {
            return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
        }
        if (chatbot.teacher_id !== user.id) {
            return NextResponse.json({ error: 'Not authorized to delete this chatbot' }, { status: 403 });
        }
        console.log(`[API DELETE /chatbots?chatbotId=${chatbotId}] User ${user.id} authorized to delete chatbot "${chatbot.name}".`);

        const documentsFolderPath = `${user.id}/${chatbotId}/`;
        console.log(`[API DELETE /chatbots?chatbotId=${chatbotId}] Listing files in storage path: ${documentsFolderPath}`);
        const { data: filesInStorage, error: listError } = await adminSupabase.storage
            .from('documents')
            .list(documentsFolderPath);

        if (listError) {
            console.warn(`[API DELETE /chatbots?chatbotId=${chatbotId}] Error listing files in storage for cleanup: ${listError.message}`);
        } else if (filesInStorage && filesInStorage.length > 0) {
            const filePathsToRemove = filesInStorage.map(file => `${documentsFolderPath}${file.name}`);
            if (filePathsToRemove.length > 0) {
                console.log(`[API DELETE /chatbots?chatbotId=${chatbotId}] Removing ${filePathsToRemove.length} files from storage.`);
                const { error: removeFilesError } = await adminSupabase.storage.from('documents').remove(filePathsToRemove);
                if (removeFilesError) console.warn(`[API DELETE /chatbots?chatbotId=${chatbotId}] Error removing files from storage: ${removeFilesError.message}`);
                else console.log(`[API DELETE /chatbots?chatbotId=${chatbotId}] Successfully removed files from storage.`);
            }
        }

        console.log(`[API DELETE /chatbots?chatbotId=${chatbotId}] Deleting chatbot record from database.`);
        const { error: deleteChatbotError } = await adminSupabase
            .from('chatbots')
            .delete()
            .eq('chatbot_id', chatbotId);

        if (deleteChatbotError) {
            console.error(`[API DELETE /chatbots?chatbotId=${chatbotId}] Error deleting chatbot from database: ${deleteChatbotError.message}`);
            throw deleteChatbotError;
        }
        console.log(`[API DELETE /chatbots?chatbotId=${chatbotId}] Chatbot record deleted from database.`);

        try {
            console.log(`[API DELETE /chatbots?chatbotId=${chatbotId}] Deleting vectors from Pinecone.`);
            await deleteChatbotVectors(chatbotId);
            console.log(`[API DELETE /chatbots?chatbotId=${chatbotId}] Pinecone vectors deletion initiated/completed.`);
        } catch (pineconeError) {
            console.error(`[API DELETE /chatbots?chatbotId=${chatbotId}] Error deleting vectors from Pinecone:`, pineconeError);
        }

        return NextResponse.json({ success: true, message: `Chatbot "${chatbot.name}" and associated data deleted.` });

    } catch (error) {
        console.error(`[API DELETE /chatbots?chatbotId=${chatbotId}] General error:`, error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete chatbot' }, { status: 500 });
    }
}