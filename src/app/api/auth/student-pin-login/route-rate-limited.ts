// Example of rate-limited auth endpoint
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withRateLimit, RateLimits } from '@/lib/rate-limiter';

// Wrap with STRICT rate limiting (10 attempts per minute)
export const POST = withRateLimit(
  async (request: NextRequest) => {
    const supabase = await createServerSupabaseClient();
    const adminSupabase = createAdminClient();
    
    try {
      const { studentId, pin } = await request.json();
      
      if (!studentId || !pin) {
        return NextResponse.json(
          { error: 'Student ID and PIN are required' },
          { status: 400 }
        );
      }

      // Get student profile using admin client to bypass RLS
      const { data: studentProfile, error: profileError } = await adminSupabase
        .from('student_profiles')
        .select('*')
        .eq('user_id', studentId)
        .single();

      if (profileError || !studentProfile) {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      }

      // Check if account has a pin
      if (!studentProfile.pin_code) {
        return NextResponse.json(
          { error: 'PIN not set up for this account' },
          { status: 401 }
        );
      }

      // Verify PIN
      if (studentProfile.pin_code !== pin) {
        return NextResponse.json(
          { error: 'Invalid PIN' },
          { status: 401 }
        );
      }

      // Sign in the user using admin client
      const { data: authData, error: signInError } = await adminSupabase.auth.admin.generateLink({
        type: 'magiclink',
        email: studentProfile.email,
      });

      if (signInError || !authData) {
        console.error('Sign in error:', signInError);
        return NextResponse.json(
          { error: 'Failed to authenticate' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        user: {
          id: studentProfile.user_id,
          email: studentProfile.email,
          displayName: studentProfile.display_name
        }
      });

    } catch (error) {
      console.error('PIN login error:', error);
      return NextResponse.json(
        { error: 'An error occurred during login' },
        { status: 500 }
      );
    }
  },
  RateLimits.strict // Only 10 attempts per minute to prevent brute force
);