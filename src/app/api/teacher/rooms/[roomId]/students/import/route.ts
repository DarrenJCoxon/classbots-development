// src/app/api/teacher/rooms/[roomId]/students/import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { parse } from 'csv-parse/sync';
import { v4 as uuidv4 } from 'uuid'; // Used for generating unique IDs in magic links
import crypto from 'crypto';

const MAX_FILE_SIZE = 1024 * 1024 * 2; // 2MB limit

// For Next.js 15.3.1, we need to use any for dynamic route params
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function POST(request: NextRequest, { params }: any) {
  try {
    console.log('[CSV Import API] Starting import process');
    
    // Need to await params in Next.js 15.3+
    const awaitedParams = await params;
    const roomId = awaitedParams.roomId;
    console.log('[CSV Import API] Room ID from params:', roomId);
    
    // Authentication
    const supabase = await createServerSupabaseClient();
    const supabaseAdmin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.log('[CSV Import API] User not authenticated');
      return new NextResponse(
        JSON.stringify({ error: 'Not authenticated' }), 
        { status: 401, headers: { 'Content-Type': 'application/json' }}
      );
    }
    
    // Verify user owns this room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('room_id', roomId)
      .eq('teacher_id', user.id)
      .single();

    if (roomError || !room) {
      console.log('[CSV Import API] Room access denied:', roomError?.message);
      return new NextResponse(
        JSON.stringify({ error: 'Room not found or you do not have permission to access it' }), 
        { status: 404, headers: { 'Content-Type': 'application/json' }}
      );
    }
    
    // Parse form data
    let formData;
    try {
      formData = await request.formData();
      console.log('[CSV Import API] Form data keys:', [...formData.keys()]);
    } catch (formError) {
      console.error('[CSV Import API] Error parsing form data:', formError);
      return new NextResponse(
        JSON.stringify({ error: 'Failed to parse form data' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' }}
      );
    }
    
    // Get file from form data
    const file = formData.get('file') as File;
    if (!file) {
      console.log('[CSV Import API] No file provided');
      return new NextResponse(
        JSON.stringify({ error: 'No file provided' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' }}
      );
    }
    
    console.log('[CSV Import API] File received:', file.name, file.size, file.type);
    
    // File validations
    if (file.size > MAX_FILE_SIZE) {
      return new NextResponse(
        JSON.stringify({ error: 'File size exceeds the 2MB limit' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' }}
      );
    }

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      return new NextResponse(
        JSON.stringify({ error: 'File must be a CSV' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' }}
      );
    }

    // Process CSV
    let content = '';
    try {
      const fileBuffer = await file.arrayBuffer();
      content = new TextDecoder().decode(fileBuffer);
      console.log('[CSV Import API] File content length:', content.length);
    } catch (readError) {
      console.error('[CSV Import API] Error reading file:', readError);
      return new NextResponse(
        JSON.stringify({ error: 'Failed to read CSV file' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' }}
      );
    }
    
    // Parse CSV
    let records;
    try {
      records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      });
      console.log('[CSV Import API] Parsed records count:', records.length);
    } catch (parseError) {
      console.error('[CSV Import API] Error parsing CSV:', parseError);
      return new NextResponse(
        JSON.stringify({ error: 'Failed to parse CSV' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' }}
      );
    }
    
    if (records.length === 0) {
      return new NextResponse(
        JSON.stringify({ error: 'CSV file is empty' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' }}
      );
    }
    
    // Process students with real database operations
    const successfulImports = [];
    const failedImports = [];
    const schoolId = room.school_id;
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      // Extract student data using flexible header matching
      const fullNameKeys = Object.keys(record).filter(
        k => k.toLowerCase().includes('full name') || 
             k.toLowerCase().includes('fullname') || 
             k.toLowerCase().includes('student name') ||
             k.toLowerCase() === 'name'
      );
      
      const emailKeys = Object.keys(record).filter(
        k => k.toLowerCase().includes('email') ||
             k.toLowerCase().includes('e-mail')
      );
      
      const fullName = fullNameKeys.length > 0 ? record[fullNameKeys[0]]?.trim() || '' : '';
      const email = emailKeys.length > 0 ? record[emailKeys[0]]?.trim() || null : null;
      
      if (!fullName.trim()) {
        console.log(`[CSV Import API] Skipping row ${i+1}: Missing name`);
        failedImports.push({
          index: i,
          student: { fullName: '', email },
          error: 'Missing required full name'
        });
        continue;
      }
      
      try {
        console.log(`[CSV Import API] Processing student: ${fullName}`);
        
        // Define a student object to keep track of data
        let userId: string | undefined;
        const username = generateUsername(fullName);
        const pinCode = Math.floor(1000 + Math.random() * 9000).toString();
        
        // Step 1: Check if student with this email already exists
        if (email) {
          const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('user_id')
            .eq('email', email)
            .maybeSingle();
            
          if (existingProfile) {
            userId = existingProfile.user_id;
            console.log(`[CSV Import API] Found existing user with email ${email}, user_id: ${userId}`);
          }
        }
        
        // Step 2: If no user found, create a new user
        if (!userId) {
          // Generate temp email if none provided
          const userEmail = email || `temp-${crypto.randomBytes(8).toString('hex')}@example.com`;
          
          try {
            console.log(`[CSV Import API] Creating new user for ${fullName}`);
            const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
              email: userEmail,
              email_confirm: true,
              user_metadata: { full_name: fullName, role: 'student' },
              password: crypto.randomBytes(16).toString('hex') // Random password
            });
            
            if (createError) {
              throw new Error(`Failed to create user: ${createError.message}`);
            }
            
            userId = newUser.user.id;
            console.log(`[CSV Import API] Created user with ID: ${userId}`);
            
            // Wait for triggers to process
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (createError) {
            console.error(`[CSV Import API] Error creating user:`, createError);
            throw createError;
          }
        }
        
        // Step 3: Ensure profile exists with PIN and username
        try {
          console.log(`[CSV Import API] Updating profile for ${fullName}`);
          await supabaseAdmin.from('profiles').upsert({
            user_id: userId,
            full_name: fullName,
            email: email || '',
            role: 'student',
            school_id: schoolId,
            username: username,
            pin_code: pinCode,
            last_pin_change: new Date().toISOString(),
            pin_change_by: user.id,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });
        } catch (profileError) {
          console.error(`[CSV Import API] Error updating profile:`, profileError);
          // Continue anyway - this is not critical
        }
        
        // Step 4: Add student to room (if not already a member)
        try {
          // Check if already in room
          const { data: existingMembership } = await supabaseAdmin
            .from('room_memberships')
            .select('*')
            .eq('room_id', roomId)
            .eq('student_id', userId)
            .maybeSingle();
            
          if (!existingMembership) {
            console.log(`[CSV Import API] Adding ${fullName} to room ${roomId}`);
            await supabaseAdmin.from('room_memberships').insert({
              room_id: roomId,
              student_id: userId,
              joined_at: new Date().toISOString()
            });
          } else {
            console.log(`[CSV Import API] ${fullName} already in room ${roomId}`);
          }
        } catch (membershipError) {
          console.error(`[CSV Import API] Error adding to room:`, membershipError);
          throw membershipError;
        }
        
        // Step 5: Generate magic link
        // Add uuidv4 to ensure uniqueness even if same student is added multiple times
        const uniqueToken = uuidv4();
        const simpleLinkCode = `${room.room_code}_${userId}_${encodeURIComponent(fullName)}_${uniqueToken.substring(0, 8)}`;
        const magicLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/m/${simpleLinkCode}`;
        
        // Add to successful imports
        successfulImports.push({
          fullName,
          email,
          username,
          pin_code: pinCode,
          magicLink
        });
        
      } catch (studentError) {
        console.error(`[CSV Import API] Failed to process student ${fullName}:`, studentError);
        failedImports.push({
          index: i,
          student: { fullName, email },
          error: studentError instanceof Error ? studentError.message : 'Unknown error'
        });
      }
    }
    
    // Return response with both successful and failed imports
    return new NextResponse(
      JSON.stringify({
        success: true,
        students: successfulImports,
        count: successfulImports.length,
        totalAttempted: records.length,
        failedImports: failedImports
      }), 
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );
    
  } catch (error) {
    console.error('[CSV Import API] Error:', error);
    
    return new NextResponse(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to import students',
        errorType: error instanceof Error ? error.name : 'Unknown'
      }), 
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

function generateUsername(fullName: string): string {
  // Remove special characters and convert to lowercase
  const cleanName = fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Add a random suffix to ensure uniqueness (3 digits)
  const randomSuffix = Math.floor(100 + Math.random() * 900).toString();
  
  return cleanName + randomSuffix;
}