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
    
    console.log('[CSV Import API] Processing records:', records);
    console.log('[CSV Import API] First record keys:', records[0] ? Object.keys(records[0]) : 'No records');
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      console.log(`[CSV Import API] Processing record ${i}:`, record);
      
      // Extract student data using flexible header matching
      const firstNameKeys = Object.keys(record).filter(
        k => k.toLowerCase().includes('first name') || 
             k.toLowerCase().includes('firstname') || 
             k.toLowerCase() === 'first'
      );
      
      const surnameKeys = Object.keys(record).filter(
        k => k.toLowerCase().includes('surname') ||
             k.toLowerCase().includes('last name') ||
             k.toLowerCase().includes('lastname') ||
             k.toLowerCase() === 'last'
      );
      
      const firstName = firstNameKeys.length > 0 ? record[firstNameKeys[0]]?.trim() || '' : '';
      const surname = surnameKeys.length > 0 ? record[surnameKeys[0]]?.trim() || '' : '';
      
      console.log(`[CSV Import API] Row ${i} - First Name: "${firstName}", Surname: "${surname}"`);
      
      if (!firstName.trim() || !surname.trim()) {
        console.log(`[CSV Import API] Skipping row ${i+1}: Missing first name or surname`);
        failedImports.push({
          index: i,
          student: { fullName: `${firstName} ${surname}`.trim(), email: null },
          error: 'Missing required first name or surname'
        });
        continue;
      }
      
      const fullName = `${firstName} ${surname}`;
      const email = null; // No longer collecting emails from CSV
      
      try {
        console.log(`[CSV Import API] Processing student: ${fullName}`);
        
        // Define a student object to keep track of data
        let userId: string | undefined;
        const baseUsername = `${firstName.toLowerCase()}.${surname.toLowerCase()}`.replace(/[^a-z.]/g, '');
        
        // Check if username already exists and add random numbers if needed
        let username = baseUsername;
        const { data: existingUsernames } = await supabaseAdmin
          .from('student_profiles')
          .select('username')
          .ilike('username', `${baseUsername}%`);
        
        if (existingUsernames && existingUsernames.length > 0) {
          // Username exists, add 3 random numbers
          const randomSuffix = Math.floor(100 + Math.random() * 900).toString();
          username = `${baseUsername}${randomSuffix}`;
          console.log(`[CSV Import API] Username ${baseUsername} already exists, using ${username}`);
        }
        
        const pinCode = Math.floor(1000 + Math.random() * 9000).toString();
        
        // Step 1: Create a new user (no email check since we're not collecting emails)
        if (!userId) {
          // Generate temp email (no longer collecting emails from CSV)
          const userEmail = `temp-${crypto.randomBytes(8).toString('hex')}@example.com`;
          
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
        
        // Step 3: Insert directly into student_profiles with first_name and surname
        try {
          console.log(`[CSV Import API] Creating student profile for ${fullName} with userId: ${userId}`);
          if (!userId) {
            throw new Error('User ID is missing after user creation');
          }
          await supabaseAdmin.from('student_profiles').upsert({
            user_id: userId,
            full_name: fullName,
            first_name: firstName,
            surname: surname,
            school_id: schoolId,
            username: username,
            pin_code: pinCode,
            last_pin_change: new Date().toISOString(),
            pin_change_by: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });
        } catch (profileError) {
          console.error(`[CSV Import API] Error creating student profile:`, profileError);
          throw profileError;
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
            console.log(`[CSV Import API] Adding ${fullName} (${userId}) to room ${roomId}`);
            const { error: insertError } = await supabaseAdmin.from('room_memberships').insert({
              room_id: roomId,
              student_id: userId,
              joined_at: new Date().toISOString()
            });
            
            if (insertError) {
              console.error(`[CSV Import API] Failed to insert room membership:`, insertError);
              throw insertError;
            }
            console.log(`[CSV Import API] Successfully added ${fullName} to room ${roomId}`);
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
        // Put the unique token in a separate parameter instead of appending to the name
        const simpleLinkCode = `${room.room_code}_${userId}_${encodeURIComponent(fullName)}_token-${uniqueToken.substring(0, 8)}`;
        
        // For production, ensure we're using skolr.app domain
        let baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        
        // If we're in production, but the URL isn't skolr.app, force it to be
        if (process.env.NODE_ENV === 'production' && !baseUrl.includes('skolr.app')) {
          console.log('[CSV Import API] Enforcing production domain for magic link');
          baseUrl = 'https://skolr.app';
        }
        
        const magicLink = `${baseUrl}/m/${simpleLinkCode}`;
        
        // Add to successful imports
        successfulImports.push({
          fullName,
          email: null,
          username,
          pin_code: pinCode,
          magicLink
        });
        
      } catch (studentError) {
        console.error(`[CSV Import API] Failed to process student ${fullName}:`, studentError);
        const errorMessage = studentError instanceof Error 
          ? studentError.message 
          : typeof studentError === 'string' 
          ? studentError 
          : JSON.stringify(studentError);
          
        failedImports.push({
          index: i,
          student: { fullName, email: null },
          error: errorMessage,
          details: studentError instanceof Error ? studentError.stack : String(studentError)
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

