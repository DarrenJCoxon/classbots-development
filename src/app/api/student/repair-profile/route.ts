// src/app/api/student/repair-profile/route.ts
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Repair student profile endpoint
 * 
 * This endpoint ensures that student profiles exist and have the correct role.
 * It can be called as a fallback mechanism when normal triggers fail.
 */
export async function POST(request: Request) {
  console.log('[API POST /student/repair-profile] Received request.');

  try {
    // Create admin client to bypass RLS
    const supabaseAdmin = createAdminClient();
    if (!supabaseAdmin) {
      console.error('[Student Profile Repair] Failed to create admin client');
      return NextResponse.json({ 
        error: 'Server configuration error' 
      }, { status: 500 });
    }

    // Get regular client for user session
    const supabase = await createServerSupabaseClient();
    
    // Parse request body
    const requestData = await request.json().catch(() => ({}));
    const { userId, fullName, email, isAnonymous } = requestData;

    // If no userId provided, try to get the current user
    let userIdToRepair = userId;
    if (!userIdToRepair) {
      const { data: { session } } = await supabase.auth.getSession();
      userIdToRepair = session?.user?.id;
      
      if (!userIdToRepair) {
        return NextResponse.json({ 
          error: 'User ID is required or user must be authenticated' 
        }, { status: 400 });
      }
    }

    console.log(`[Student Profile Repair] Repairing profile for user: ${userIdToRepair}`);

    // Get user details if available
    let userEmail = email;
    let userName = fullName;
    
    if (!userEmail || !userName) {
      try {
        // Get user data from Supabase Auth
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userIdToRepair);
        
        if (!userError && userData?.user) {
          userEmail = userEmail || userData.user.email || `${userIdToRepair}@example.com`;
          userName = userName || userData.user.user_metadata?.full_name || 'Student';
        }
      } catch (error) {
        console.error('[Student Profile Repair] Error fetching user details:', error);
        // Continue anyway with defaults
      }
    }

    // Ensure we have values
    userEmail = userEmail || `${userIdToRepair}@example.com`;
    userName = userName || 'Student';

    // First check if profile exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', userIdToRepair)
      .maybeSingle();

    let result;
    
    if (existingProfile) {
      // Update existing profile
      console.log(`[Student Profile Repair] Updating existing profile for: ${userIdToRepair}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = {
        updated_at: new Date().toISOString()
      };
      
      // Only update fields that were provided or needed
      if (userEmail && existingProfile.email !== userEmail) {
        updateData['email'] = userEmail;
      }
      
      if (userName && existingProfile.full_name !== userName) {
        updateData['full_name'] = userName;
      }
      
      // Always ensure role is student for this endpoint
      if (existingProfile.role !== 'student') {
        updateData['role'] = 'student';
      }
      
      // Set anonymous flag if provided
      if (isAnonymous !== undefined && existingProfile.is_anonymous !== isAnonymous) {
        updateData['is_anonymous'] = isAnonymous;
      }
      
      // Only update if there are changes
      if (Object.keys(updateData).length > 1) { // More than just updated_at
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update(updateData)
          .eq('user_id', userIdToRepair);
          
        if (updateError) {
          console.error('[Student Profile Repair] Error updating profile:', updateError);
          return NextResponse.json({ 
            error: 'Failed to update profile' 
          }, { status: 500 });
        }
        
        result = { action: 'updated', userId: userIdToRepair };
      } else {
        result = { action: 'none', message: 'No changes needed', userId: userIdToRepair };
      }
    } else {
      // Create new profile
      console.log(`[Student Profile Repair] Creating new profile for: ${userIdToRepair}`);
      
      const { error: createError } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: userIdToRepair,
          email: userEmail,
          full_name: userName,
          role: 'student',
          is_anonymous: isAnonymous === undefined ? false : isAnonymous,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
      if (createError) {
        console.error('[Student Profile Repair] Error creating profile:', createError);
        return NextResponse.json({ 
          error: 'Failed to create profile' 
        }, { status: 500 });
      }
      
      result = { action: 'created', userId: userIdToRepair };
    }

    console.log(`[Student Profile Repair] Successfully repaired profile for: ${userIdToRepair}`);
    return NextResponse.json({ 
      success: true,
      result: result
    });
  } catch (error) {
    console.error('[Student Profile Repair] Unhandled error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
}