// src/app/api/teacher/chatbots/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { deleteChatbotVectors } from '@/lib/pinecone/utils';
import type { CreateChatbotPayload, Chatbot as DatabaseChatbot, BotTypeEnum } from '@/types/database.types'; // MODIFIED: Added BotTypeEnum

// GET Handler
export async function GET(request: NextRequest) { // MODIFIED: Added request parameter
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // IMPORTANT: We're using the admin client to bypass RLS issues
    const supabaseAdmin = createAdminClient();
    
    const { data: profile } = await supabase
      .from('teacher_profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // MODIFIED: Extract query parameters for filtering and sorting
    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get('searchTerm');
    const botType = searchParams.get('botType') as BotTypeEnum | null;
    const ragEnabledParam = searchParams.get('ragEnabled'); // Will be 'true' or 'false' as string
    const sortBy = searchParams.get('sortBy') || 'created_at_desc'; // Default sort

    // Use admin client instead of RLS-restricted client
    let query = supabaseAdmin
      .from('chatbots')
      .select('*')
      .eq('teacher_id', user.id);

    // Apply search term filter (searches name and description)
    if (searchTerm) {
      // Using .or() for searching in multiple columns.
      // The syntax `description.ilike.%${searchTerm}%` means description case-insensitive LIKE '%searchTerm%'
      query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
    }

    // Apply botType filter
    if (botType && (botType === 'learning' || botType === 'assessment' || botType === 'reading_room')) {
      query = query.eq('bot_type', botType);
    }

    // Apply ragEnabled filter
    if (ragEnabledParam === 'true') {
      query = query.eq('enable_rag', true);
    } else if (ragEnabledParam === 'false') {
      query = query.eq('enable_rag', false);
    }

    // Apply sorting
    // Example: sortBy = "name_asc" or "created_at_desc"
    // Need to handle fields with underscores properly
    const sortParts = sortBy.split('_');
    const sortOrder = sortParts[sortParts.length - 1]; // Last part is the order (asc/desc)
    const sortField = sortParts.slice(0, -1).join('_'); // Everything else is the field name
    
    if (sortField && sortOrder && ['name', 'created_at', 'updated_at', 'bot_type'].includes(sortField) && ['asc', 'desc'].includes(sortOrder)) {
      query = query.order(sortField as keyof DatabaseChatbot, { ascending: sortOrder === 'asc' });
    } else {
      // Default sort if sortBy parameter is invalid or not provided fully
      query = query.order('created_at', { ascending: false });
    }
    
    // Execute the query using admin client
    try {
      const { data: chatbots, error: fetchError } = await query;

      if (fetchError) {
        console.error('Error fetching chatbots:', fetchError);
        console.error('Chatbots fetch error details:', {
          message: fetchError.message,
          code: fetchError.code,
          details: fetchError.details,
          hint: fetchError.hint
        });
        throw fetchError;
      }

      return NextResponse.json(chatbots || []);
    } catch (queryError) {
      console.error('Error executing chatbot query:', queryError);
      throw queryError;
    }
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

    // Use admin client for all database operations to bypass RLS
    const supabaseAdmin = createAdminClient();

    const { data: profile } = await supabaseAdmin
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

    const chatbotDataToInsert: Omit<DatabaseChatbot, 'chatbot_id' | 'created_at' | 'updated_at'> & { teacher_id: string } = {
      name: body.name,
      description: body.description || undefined, 
      system_prompt: body.system_prompt,
      teacher_id: user.id,
      model: body.model || 'openai/gpt-4.1-nano',
      max_tokens: body.max_tokens === undefined || body.max_tokens === null ? 1000 : Number(body.max_tokens),
      temperature: body.temperature === undefined || body.temperature === null ? 0.7 : Number(body.temperature),
      enable_rag: (body.bot_type === 'learning' || body.bot_type === 'reading_room') ? (body.enable_rag || false) : false,
      bot_type: body.bot_type || 'learning',
      assessment_criteria_text: body.bot_type === 'assessment' ? body.assessment_criteria_text : null,
      welcome_message: body.welcome_message || null, 
    };
    if (chatbotDataToInsert.description === undefined) {
        delete chatbotDataToInsert.description; 
    }

    // Use admin client for insert to bypass RLS restrictions
    const { data: newChatbot, error: insertError } = await supabaseAdmin
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
    const supabaseAdmin = createAdminClient();

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // Use admin client for all DB operations to bypass RLS
        const { data: chatbot, error: fetchError } = await supabaseAdmin
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
        const { data: filesInStorage, error: listError } = await supabaseAdmin.storage
            .from('documents')
            .list(documentsFolderPath);

        if (listError) {
            console.warn(`[API DELETE /chatbots?chatbotId=${chatbotId}] Error listing files in storage for cleanup: ${listError.message}`);
        } else if (filesInStorage && filesInStorage.length > 0) {
            const filePathsToRemove = filesInStorage.map(file => `${documentsFolderPath}${file.name}`);
            if (filePathsToRemove.length > 0) {
                console.log(`[API DELETE /chatbots?chatbotId=${chatbotId}] Removing ${filePathsToRemove.length} files from storage.`);
                const { error: removeFilesError } = await supabaseAdmin.storage.from('documents').remove(filePathsToRemove);
                if (removeFilesError) console.warn(`[API DELETE /chatbots?chatbotId=${chatbotId}] Error removing files from storage: ${removeFilesError.message}`);
                else console.log(`[API DELETE /chatbots?chatbotId=${chatbotId}] Successfully removed files from storage.`);
            }
        }

        console.log(`[API DELETE /chatbots?chatbotId=${chatbotId}] Deleting chatbot record from database.`);
        const { error: deleteChatbotError } = await supabaseAdmin
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