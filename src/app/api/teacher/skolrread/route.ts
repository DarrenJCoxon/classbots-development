import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// GET - Fetch SkolrRead sessions for a room
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId');

  if (!roomId) {
    return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // Verify user is teacher and owns the room
    const { data: room, error: roomError } = await adminSupabase
      .from('rooms')
      .select('teacher_id')
      .eq('room_id', roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to access this room' }, { status: 403 });
    }

    // Fetch SkolrRead sessions for this room
    const { data: sessions, error: sessionsError } = await adminSupabase
      .from('skolrread_sessions')
      .select(`
        session_id,
        room_id,
        chatbot_id,
        title,
        description,
        status,
        created_at,
        updated_at,
        main_document_id
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: false });

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
      return NextResponse.json({ 
        error: 'Failed to fetch sessions' 
      }, { status: 500 });
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json([]);
    }

    // Get additional data for each session
    const sessionsWithDetails = await Promise.all(
      sessions.map(async (session) => {
        // Get main document info
        let mainDocument = null;
        if (session.main_document_id) {
          const { data: documentData } = await adminSupabase
            .from('documents')
            .select('file_name, file_type, file_size')
            .eq('document_id', session.main_document_id)
            .single();

          if (documentData) {
            mainDocument = {
              name: documentData.file_name,
              type: documentData.file_type,
              size: documentData.file_size
            };
          }
        }

        // Get student count for the room
        const { data: memberships } = await adminSupabase
          .from('room_memberships')
          .select('student_id')
          .eq('room_id', roomId);

        // Get chat message count
        const { data: messages } = await adminSupabase
          .from('reading_chat_messages')
          .select('message_id')
          .eq('skolrread_session_id', session.session_id);

        // Get knowledge base count
        const { data: knowledgeBase } = await adminSupabase
          .from('documents')
          .select('document_id')
          .eq('chatbot_id', session.chatbot_id)
          .neq('document_id', session.main_document_id);

        return {
          id: session.session_id,
          title: session.title,
          description: session.description,
          status: session.status,
          mainDocument: mainDocument || { name: 'No document', type: 'pdf' },
          knowledgeBaseCount: knowledgeBase?.length || 0,
          studentCount: memberships?.length || 0,
          readingProgress: 0,
          chatMessages: messages?.length || 0,
          createdAt: session.created_at,
          updatedAt: session.updated_at
        };
      })
    );

    return NextResponse.json(sessionsWithDetails);

  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new SkolrRead session
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { roomId, chatbotId, title, description, documentInfo, mainDocumentId } = body;

    // Validate required fields
    if (!roomId || !chatbotId || !title?.trim()) {
      return NextResponse.json({ 
        error: 'Missing required fields: roomId, chatbotId, title' 
      }, { status: 400 });
    }

    // Either mainDocumentId or documentInfo must be provided
    if (!mainDocumentId && !documentInfo) {
      return NextResponse.json({ 
        error: 'Either mainDocumentId or documentInfo must be provided' 
      }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Verify user is teacher and owns the room
    const { data: room, error: roomError } = await adminSupabase
      .from('rooms')
      .select('teacher_id')
      .eq('room_id', roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to create sessions in this room' }, { status: 403 });
    }

    // Verify chatbot exists and belongs to teacher
    const { data: chatbot, error: chatbotError } = await adminSupabase
      .from('chatbots')
      .select('teacher_id')
      .eq('chatbot_id', chatbotId)
      .single();

    if (chatbotError || !chatbot) {
      return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
    }

    if (chatbot.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to use this chatbot' }, { status: 403 });
    }

    let finalDocumentId = mainDocumentId;

    // If documentInfo is provided, create a document record
    if (documentInfo && !mainDocumentId) {
      const { name, path, type, size, url } = documentInfo;
      
      console.log('Creating document record for Skolr Reader');
      const { data: newDocument, error: documentCreateError } = await adminSupabase
        .from('documents')
        .insert({
          chatbot_id: chatbotId,
          file_name: name,
          file_path: path,
          file_type: type,
          file_size: size,
          status: 'completed'
        })
        .select()
        .single();

      if (documentCreateError) {
        console.error('Error creating document:', documentCreateError);
        return NextResponse.json({ 
          error: 'Failed to create document record' 
        }, { status: 500 });
      }

      finalDocumentId = newDocument.document_id;
      console.log('Document created with ID:', finalDocumentId);
    }

    // Verify document belongs to the chatbot if mainDocumentId was provided
    if (mainDocumentId) {
      const { data: documentCheck, error: docCheckError } = await adminSupabase
        .from('documents')
        .select('chatbot_id')
        .eq('document_id', mainDocumentId)
        .single();

      if (docCheckError || !documentCheck) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }

      if (documentCheck.chatbot_id !== chatbotId) {
        return NextResponse.json({ error: 'Document does not belong to the specified chatbot' }, { status: 400 });
      }
    }

    // Create the SkolrRead session
    const { data: session, error: sessionError } = await adminSupabase
      .from('skolrread_sessions')
      .insert({
        room_id: roomId,
        chatbot_id: chatbotId,
        teacher_id: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        main_document_id: finalDocumentId,
        status: 'draft'
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating session:', sessionError);
      return NextResponse.json({ 
        error: 'Failed to create session' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'SkolrRead session created successfully',
      session: {
        id: session.session_id,
        title: session.title,
        description: session.description,
        status: session.status,
        createdAt: session.created_at
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}