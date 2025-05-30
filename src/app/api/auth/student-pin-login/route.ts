// src/app/api/auth/student-pin-login/route.ts
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const supabaseAdmin = createAdminClient();
    
    // Get parameters from request
    const { username, pin_code } = await request.json();
    
    // Validate inputs
    if (!username || !pin_code) {
      return NextResponse.json({ 
        error: 'Missing username or PIN'
      }, { status: 400 });
    }
    
    // Find the user by username in student_profiles
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('student_profiles')
      .select('user_id, username, pin_code, full_name, first_name, surname')
      .eq('username', username.toLowerCase())
      .single();
      
    if (profileError || !profile) {
      console.error('Error looking up profile:', profileError);
      return NextResponse.json({ 
        error: 'Invalid username or PIN'
      }, { status: 401 });
    }
    
    // Verify PIN matches
    if (profile.pin_code !== pin_code) {
      return NextResponse.json({ 
        error: 'Invalid username or PIN' 
      }, { status: 401 });
    }
    
    // Get the user's email (which is username@student.classbots.local)
    const email = `${username}@student.classbots.local`;
    
    // Sign in with email and PIN (which is the password)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: pin_code
    });
    
    if (authError) {
      console.error('Auth error:', authError);
      
      // If the error is that the user doesn't exist with this email format,
      // it might be an older user - try to find their actual email
      if (authError.message.includes('Invalid login credentials')) {
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
        
        if (!userError && userData?.user?.email) {
          // Try again with the actual email
          const { data: retryAuthData, error: retryAuthError } = await supabase.auth.signInWithPassword({
            email: userData.user.email,
            password: pin_code
          });
          
          if (!retryAuthError && retryAuthData.session) {
            return NextResponse.json({
              success: true,
              user_id: profile.user_id,
              student_name: profile.full_name || `${profile.first_name} ${profile.surname}`,
              session: retryAuthData.session
            });
          }
        }
      }
      
      return NextResponse.json({ 
        error: 'Invalid username or PIN'
      }, { status: 401 });
    }
    
    if (!authData.session) {
      return NextResponse.json({ 
        error: 'Failed to create session'
      }, { status: 500 });
    }
    
    // Return success with session
    return NextResponse.json({
      success: true,
      user_id: profile.user_id,
      student_name: profile.full_name || `${profile.first_name} ${profile.surname}`,
      session: authData.session
    });
    
  } catch (error) {
    console.error('Error in student PIN login:', error);
    return NextResponse.json({ 
      error: 'An error occurred during login'
    }, { status: 500 });
  }
}