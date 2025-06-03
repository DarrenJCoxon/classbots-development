import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// PUT - Update a note
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; lessonId: string; noteId: string }> }
) {
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

    const { courseId, lessonId, noteId } = await params;
    const body = await request.json();
    
    // Verify note ownership
    const { data: note, error: noteError } = await supabase
      .from('premium_lesson_notes')
      .select('student_id')
      .eq('note_id', noteId)
      .eq('lesson_id', lessonId)
      .single();

    if (noteError || !note || note.student_id !== user.id) {
      return NextResponse.json({ error: 'Note not found or access denied' }, { status: 404 });
    }

    // Update note
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (body.content !== undefined) updateData.content = body.content.trim();
    if (body.note_type !== undefined) updateData.note_type = body.note_type;
    if (body.video_timestamp !== undefined) updateData.video_timestamp = body.video_timestamp;
    if (body.content_selection !== undefined) updateData.content_selection = body.content_selection;
    if (body.is_private !== undefined) updateData.is_private = body.is_private;
    if (body.is_pinned !== undefined) updateData.is_pinned = body.is_pinned;

    const { data: updatedNote, error } = await supabase
      .from('premium_lesson_notes')
      .update(updateData)
      .eq('note_id', noteId)
      .select()
      .single();

    if (error) {
      console.error('Error updating note:', error);
      return NextResponse.json(
        { error: 'Failed to update note' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      note: updatedNote
    });

  } catch (error) {
    console.error('Error in note PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a note
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; lessonId: string; noteId: string }> }
) {
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

    const { courseId, lessonId, noteId } = await params;
    
    // Verify note ownership
    const { data: note, error: noteError } = await supabase
      .from('premium_lesson_notes')
      .select('student_id')
      .eq('note_id', noteId)
      .eq('lesson_id', lessonId)
      .single();

    if (noteError || !note || note.student_id !== user.id) {
      return NextResponse.json({ error: 'Note not found or access denied' }, { status: 404 });
    }

    // Delete note
    const { error } = await supabase
      .from('premium_lesson_notes')
      .delete()
      .eq('note_id', noteId);

    if (error) {
      console.error('Error deleting note:', error);
      return NextResponse.json(
        { error: 'Failed to delete note' },
        { status: 500 }
      );
    }

    // Update notes count in progress
    await supabase.rpc('decrement_notes_count', {
      p_lesson_id: lessonId,
      p_student_id: user.id
    });

    return NextResponse.json({
      success: true
    });

  } catch (error) {
    console.error('Error in note DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}