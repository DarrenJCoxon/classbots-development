import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Authenticate user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // Fetch the session with basic data first
    const { data: session, error: sessionError } = await adminSupabase
      .from('skolrread_sessions')
      .select(`
        session_id,
        room_id,
        chatbot_id,
        teacher_id,
        title,
        description,
        status,
        created_at,
        updated_at,
        main_document_id
      `)
      .eq('session_id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Verify user is the teacher who created the session
    if (session.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to access this session' }, { status: 403 });
    }

    // Get the main document if it exists
    let mainDocument = null;
    if (session.main_document_id) {
      const { data: documentData } = await adminSupabase
        .from('documents')
        .select('document_id, file_name, file_type, file_size, file_path')
        .eq('document_id', session.main_document_id)
        .single();

      if (documentData) {
        console.log('📄 Found document:', documentData.file_name, 'at path:', documentData.file_path);
        
        // Generate document URL
        let documentUrl = '';
        if (documentData.file_path) {
          console.log('📂 Storage bucket: documents');
          console.log('📁 File path:', documentData.file_path);
          
          const { data: urlData, error: urlError } = await adminSupabase.storage
            .from('documents')
            .createSignedUrl(documentData.file_path, 3600);
          
          if (urlError) {
            console.error('❌ Error creating signed URL:', urlError);
            console.error('Error details:', JSON.stringify(urlError, null, 2));
            
            // Try public URL as fallback
            const { data: publicUrlData } = adminSupabase.storage
              .from('documents')
              .getPublicUrl(documentData.file_path);
            
            if (publicUrlData?.publicUrl) {
              console.log('📎 Using public URL as fallback');
              documentUrl = publicUrlData.publicUrl;
            }
          } else {
            console.log('✅ Generated signed URL:', urlData?.signedUrl?.substring(0, 100) + '...');
            documentUrl = urlData.signedUrl;
          }
        } else {
          console.warn('⚠️ No file_path found for document');
        }

        mainDocument = {
          id: documentData.document_id,
          name: documentData.file_name,
          type: documentData.file_type,
          size: documentData.file_size,
          url: documentUrl
        };
      }
    }

    // Get chatbot info
    let chatbot = null;
    if (session.chatbot_id) {
      const { data: chatbotData } = await adminSupabase
        .from('chatbots')
        .select('chatbot_id, name')
        .eq('chatbot_id', session.chatbot_id)
        .single();

      if (chatbotData) {
        chatbot = {
          id: chatbotData.chatbot_id,
          name: chatbotData.name
        };
      }
    }

    // Get room info
    let room = null;
    if (session.room_id) {
      const { data: roomData } = await adminSupabase
        .from('rooms')
        .select('room_id, room_name')
        .eq('room_id', session.room_id)
        .single();

      if (roomData) {
        room = {
          id: roomData.room_id,
          name: roomData.room_name
        };
      }
    }

    // Get knowledge base documents for the chatbot
    const { data: knowledgeBase } = await adminSupabase
      .from('documents')
      .select('document_id, file_name, file_type, status')
      .eq('chatbot_id', session.chatbot_id)
      .neq('document_id', session.main_document_id) // Exclude the main document
      .order('created_at', { ascending: false });

    // Get recent chat messages
    const { data: recentChats } = await adminSupabase
      .from('reading_chat_messages')
      .select(`
        message_id,
        message_text,
        created_at,
        profiles!student_id (
          full_name
        )
      `)
      .eq('skolrread_session_id', sessionId)
      .eq('is_ai_response', false)
      .order('created_at', { ascending: false })
      .limit(10);

    const formattedSession = {
      id: session.session_id,
      title: session.title,
      description: session.description,
      status: session.status,
      room,
      chatbot,
      mainDocument,
      knowledgeBase: knowledgeBase || [],
      recentChats: (recentChats || []).map(chat => ({
        id: chat.message_id,
        studentName: (chat.profiles as any)?.full_name || 'Anonymous',
        message: chat.message_text,
        timestamp: chat.created_at
      })),
      createdAt: session.created_at,
      updatedAt: session.updated_at
    };

    return NextResponse.json(formattedSession);

  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}