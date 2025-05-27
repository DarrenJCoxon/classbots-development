// src/app/api/auth/student-account/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { full_name, email, room_code } = await request.json();
    
    if (!full_name || !email || !room_code) {
      return NextResponse.json({ 
        error: 'Missing required parameters: full_name, email, and room_code' 
      }, { status: 400 });
    }
    
    // Find the room first
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('room_id, is_active')
      .eq('room_code', room_code)
      .single();
      
    if (roomError || !room) {
      return NextResponse.json({ 
        error: 'Room not found or invalid room code' 
      }, { status: 404 });
    }
    
    if (!room.is_active) {
      return NextResponse.json({ 
        error: 'This room is currently inactive' 
      }, { status: 400 });
    }
    
    // Check if email is already registered
    const { data: existingUser } = await supabase
      .from('student_profiles')
      .select('user_id')
      .eq('email', email)
      .maybeSingle();
      
    if (existingUser) {
      return NextResponse.json({ 
        error: 'Email already registered. Please sign in.' 
      }, { status: 400 });
    }
    
    // Generate a random password for the account
    const generatePassword = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
      return Array(16).fill('0')
        .map(() => chars.charAt(Math.floor(Math.random() * chars.length)))
        .join('');
    };
    
    const password = generatePassword();
    
    // Create a new user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: 'student',
          full_name: full_name,
        }
      }
    });
    
    if (signUpError || !signUpData.user) {
      console.error('Error creating student account:', signUpError);
      return NextResponse.json({ 
        error: 'Failed to create student account' 
      }, { status: 500 });
    }
    
    // Create profile for the user
    const { error: profileError } = await supabase
      .from('student_profiles')
      .insert({
        user_id: signUpData.user.id,
        email,
        full_name
      });
      
    if (profileError) {
      console.error('Error creating user profile:', profileError);
      return NextResponse.json({ 
        error: 'Failed to create user profile' 
      }, { status: 500 });
    }
    
    // Add user to room
    const { error: joinError } = await supabase
      .from('room_memberships')
      .insert({
        room_id: room.room_id,
        student_id: signUpData.user.id
      });
      
    if (joinError) {
      console.error('Error adding student to room:', joinError);
      return NextResponse.json({ 
        error: 'Failed to add student to room' 
      }, { status: 500 });
    }
    
    // Return success with session
    return NextResponse.json({ 
      success: true, 
      user_id: signUpData.user.id,
      room_id: room.room_id
    });
  } catch (error) {
    console.error('Student account creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create student account' },
      { status: 500 }
    );
  }
}