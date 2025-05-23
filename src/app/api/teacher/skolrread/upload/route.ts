// src/app/api/teacher/skolrread/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log("[API /skolrread/upload POST] Request received");

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 50MB' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create file path with timestamp to ensure uniqueness
    const timestamp = Date.now();
    const fileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `skolrread/${user.id}/${timestamp}_${fileName}`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await adminSupabase.storage
      .from('documents')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Generate signed URL for immediate access
    const { data: urlData, error: urlError } = await adminSupabase.storage
      .from('documents')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    const documentUrl = urlError ? '' : urlData?.signedUrl || '';

    // Return document info (without creating a DB record yet)
    return NextResponse.json({
      document: {
        id: `temp_${timestamp}`, // Temporary ID
        name: file.name,
        type: file.type,
        size: file.size,
        path: filePath,
        url: documentUrl
      }
    });

  } catch (error) {
    console.error('[API /skolrread/upload POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}