// src/app/api/teacher/students/pin-code/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Get student's PIN code
export async function GET(request: NextRequest) {
  try {
    // Create Supabase server client
    const supabase = await createServerSupabaseClient();
    const supabaseAdmin = createAdminClient();
    
    // Get student ID from query params
    const url = new URL(request.url);
    const studentId = url.searchParams.get('studentId');
    
    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      );
    }
    
    // Get current user (teacher) to verify permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if user is a teacher
    const { data: profile, error: profileError } = await supabase
      .from('teacher_profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .single();
    
    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Unauthorized - Teacher role required' },
        { status: 403 }
      );
    }
    
    // Use admin client to fetch student info to ensure we can find them
    const { data: student, error: studentError } = await supabaseAdmin
      .from('student_profiles')
      .select('full_name, pin_code, username')
      .eq('user_id', studentId)
      .maybeSingle(); // Use maybeSingle instead of single to avoid the error
    
    // Check if student exists
    if (!student) {
      console.error('Student not found error:', studentError);
      
      // If student doesn't exist in profiles, check if they exist in auth.users
      const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(studentId);
      
      if (authUserError || !authUser?.user) {
        return NextResponse.json(
          { error: 'Student not found in auth system' },
          { status: 404 }
        );
      }
      
      // Student exists in auth but not in student_profiles, create profile
      const newUsername = authUser.user.email?.split('@')[0] || `student${Math.floor(Math.random() * 10000)}`;
      const newPin = Math.floor(1000 + Math.random() * 9000).toString();
      
      const { data: newProfile, error: insertError } = await supabaseAdmin
        .from('student_profiles')
        .insert({
          user_id: studentId,
          full_name: authUser.user.user_metadata?.full_name || 'Student',
          pin_code: newPin,
          username: newUsername.toLowerCase().replace(/[^a-z0-9]/g, ''),
          last_pin_change: new Date().toISOString(),
          pin_change_by: user.id
        })
        .select('full_name, pin_code, username')
        .single();
      
      if (insertError || !newProfile) {
        console.error('Error creating student profile:', insertError);
        return NextResponse.json(
          { error: 'Failed to create student profile' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        pin_code: newProfile.pin_code || '',
        username: newProfile.username || '',
        studentName: newProfile.full_name,
        newlyCreated: true
      });
    }
    
    return NextResponse.json({
      pin_code: student.pin_code || '',
      username: student.username || '',
      studentName: student.full_name
    });
    
  } catch (error) {
    console.error('Error retrieving student PIN:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Regenerate PIN code
export async function POST(request: NextRequest) {
  try {
    // Create Supabase clients
    const supabase = await createServerSupabaseClient();
    const supabaseAdmin = createAdminClient();
    
    // Get request body
    const body = await request.json();
    const { studentId } = body;
    
    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      );
    }
    
    // Get current user (teacher) to verify permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if user is a teacher
    const { data: profile, error: profileError } = await supabase
      .from('teacher_profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .single();
    
    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Unauthorized - Teacher role required' },
        { status: 403 }
      );
    }
    
    // Generate new PIN (4-digit number)
    const newPin = Math.floor(1000 + Math.random() * 9000).toString();
    
    // Get student's current info - use admin client to ensure we find them
    const { data: student } = await supabaseAdmin
      .from('student_profiles')
      .select('full_name, username')
      .eq('user_id', studentId)
      .maybeSingle(); // Use maybeSingle to avoid errors
    // studentError is removed as it was unused
    
    // If student doesn't exist, create a profile
    if (!student) {
      // Check if user exists in auth
      const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(studentId);
      
      if (authUserError || !authUser?.user) {
        return NextResponse.json(
          { error: 'Student not found in auth system' },
          { status: 404 }
        );
      }
      
      // Generate username from email or random
      const username = authUser.user.email 
        ? authUser.user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')
        : `student${Math.floor(100 + Math.random() * 900)}`;
      
      // Create profile
      const { data: newProfile, error: insertError } = await supabaseAdmin
        .from('student_profiles')
        .insert({
          user_id: studentId,
          full_name: authUser.user.user_metadata?.full_name || 'Student',
          pin_code: newPin,
          username: username,
          last_pin_change: new Date().toISOString(),
          pin_change_by: user.id
        })
        .select('full_name, username')
        .single();
      
      if (insertError || !newProfile) {
        console.error('Error creating student profile:', insertError);
        return NextResponse.json(
          { error: 'Failed to create student profile' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        pin_code: newPin,
        username: newProfile.username,
        studentName: newProfile.full_name,
        regenerated: true,
        newlyCreated: true
      });
    }
    
    // Generate username if it doesn't exist
    let username = student.username;
    if (!username) {
      // Generate username from name
      username = student.full_name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '') // Remove special chars
        .substring(0, 20); // Limit length
      
      // Add random suffix to ensure uniqueness
      const randomSuffix = Math.floor(100 + Math.random() * 900).toString();
      username = `${username}${randomSuffix}`;
    }
    
    // Update PIN in student_profiles table
    const { error: updateError } = await supabaseAdmin
      .from('student_profiles')
      .update({
        pin_code: newPin,
        username: username,
        last_pin_change: new Date().toISOString(),
        pin_change_by: user.id
      })
      .eq('user_id', studentId);
    
    if (updateError) {
      console.error('Error updating PIN:', updateError);
      return NextResponse.json(
        { error: 'Failed to update PIN code' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      pin_code: newPin,
      username: username,
      studentName: student.full_name,
      regenerated: true
    });
    
  } catch (error) {
    console.error('Error regenerating PIN:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}