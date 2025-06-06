// src/app/api/auth/student-username-lookup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Public API to look up a student by name, username, or email and check if the PIN matches
// This avoids requiring client-side permissions to read from the profiles table
export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();
    console.log('Student lookup API called');
    
    // Get identifier (name or email) and PIN from request body
    const { identifier, pin } = await request.json();
    
    if (!identifier) {
      return NextResponse.json({ 
        error: 'Name or email is required' 
      }, { status: 400 });
    }
    
    const cleanIdentifier = identifier.trim();
    console.log(`Looking up student: ${cleanIdentifier}`);
    
    // First, try to match by username (most specific)
    const { data: usernameProfiles } = await supabaseAdmin
      .from('student_profiles')
      .select('user_id, full_name, email, pin_code, username')
      .ilike('username', cleanIdentifier)
      .limit(5);
      
    let profiles = usernameProfiles;
    
    // If not found by username, try full_name
    if (!profiles || profiles.length === 0) {
      console.log(`Not found by username, trying name: ${cleanIdentifier}`);
      const { data: nameProfiles } = await supabaseAdmin
        .from('student_profiles')
        .select('user_id, full_name, email, pin_code, username')
        .ilike('full_name', cleanIdentifier)
        .limit(5);
        
      if (nameProfiles && nameProfiles.length > 0) {
        profiles = nameProfiles;
      }
    }
      
    // If not found by name, try email
    if (!profiles || profiles.length === 0) {
      console.log(`Not found by name, trying email: ${cleanIdentifier}`);
      const { data: emailProfiles } = await supabaseAdmin
        .from('student_profiles')
        .select('user_id, full_name, email, pin_code, username')
        .ilike('email', cleanIdentifier)
        .limit(5);
        
      if (emailProfiles && emailProfiles.length > 0) {
        profiles = emailProfiles;
      }
    }
    
    // If still not found, try fuzzy matching on any field
    if (!profiles || profiles.length === 0) {
      console.log(`Not found by exact matches, trying fuzzy match: ${cleanIdentifier}`);
      
      // Get all student profiles
      const { data: allStudents } = await supabaseAdmin
        .from('student_profiles')
        .select('user_id, full_name, email, pin_code, username')
        .limit(30);
      
      if (allStudents && allStudents.length > 0) {
        console.log(`Searching among ${allStudents.length} student profiles`);
        console.log('Available usernames:', allStudents.map((s: any) => s.username));
        
        // Try fuzzy matching on name, email, or username
        const matches = allStudents.filter((student: any) => {
          const name = (student.full_name || '').toLowerCase();
          const email = (student.email || '').toLowerCase();
          const username = (student.username || '').toLowerCase();
          const searchTerm = cleanIdentifier.toLowerCase();
          
          return name.includes(searchTerm) || 
                 searchTerm.includes(name) ||
                 email.includes(searchTerm) || 
                 searchTerm.includes(email) ||
                 username.includes(searchTerm) ||
                 searchTerm.includes(username);
        });
        
        if (matches.length > 0) {
          console.log(`Found ${matches.length} fuzzy matches`);
          console.log('Matched usernames:', matches.map((s: any) => s.username));
          profiles = matches;
        }
      }
    }
    
    // If no profile found, return error
    if (!profiles || profiles.length === 0) {
      console.log('No matches found for:', cleanIdentifier);
      return NextResponse.json({
        error: 'Student not found',
        status: 'not_found',
        identifier: cleanIdentifier
      }, { status: 404 });
    }
    
    // Find the best match if we have multiple
    const bestMatch = profiles[0] as any; // Default to first match
    
    console.log(`Best match found: ${bestMatch.full_name} (${bestMatch.username})`);
    
    // If PIN is provided, verify it matches
    if (pin) {
      console.log(`Verifying PIN for: ${bestMatch.full_name}`);
      console.log(`Expected PIN: ${bestMatch.pin_code}, Provided PIN: ${pin}`);
      
      if (!bestMatch.pin_code) {
        return NextResponse.json({
          error: 'Student does not have a PIN set',
          status: 'no_pin',
          user_id: null
        }, { status: 401 });
      }
        
      if (bestMatch.pin_code !== pin) {
        return NextResponse.json({
          error: 'Incorrect PIN',
          status: 'incorrect_pin',
          user_id: null
        }, { status: 401 });
      }
      
      // PIN matches, return success with user_id for login
      return NextResponse.json({
        success: true,
        status: 'success',
        user_id: bestMatch.user_id,
        pin_verified: true,
        best_match: {
          full_name: bestMatch.full_name,
          email: bestMatch.email,
          username: bestMatch.username
        }
      });
    }
    
    // If just looking up without verifying PIN, return info about matches
    return NextResponse.json({
      success: true,
      status: 'student_found',
      matches: profiles.map((p: any) => ({
        full_name: p.full_name,
        email: p.email,
        username: p.username
      })),
      match_count: profiles.length,
      best_match: {
        full_name: bestMatch.full_name,
        email: bestMatch.email,
        username: bestMatch.username
      },
      user_id: null, // Don't leak the user_id if PIN wasn't verified
      pin_required: true
    });
    
  } catch (error) {
    console.error('Student lookup error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Student lookup failed' },
      { status: 500 }
    );
  }
}