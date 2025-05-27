// src/components/student/StudentProfileCheck.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * StudentProfileCheck
 * 
 * A hidden component that automatically detects missing student profiles
 * and attempts to repair them. This is a safety net for when the normal
 * auth triggers don't create the profile correctly.
 * 
 * Usage: Include this component in student layouts or on student dashboard
 */
export default function StudentProfileCheck() {
  const [isLoading, setIsLoading] = useState(true);
  const [needsRepair, setNeedsRepair] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const checkStudentProfile = async () => {
      try {
        // First check if we're signed in
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          // Not signed in, nothing to do
          setIsLoading(false);
          return;
        }

        // Check if we already have a profile
        const { data: profile, error: profileError } = await supabase
          .from('student_profiles')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle();

        // Determine if we need repair
        let profileRepairNeeded = false;
        
        if (profileError || !profile) {
          console.log('[StudentProfileCheck] No profile found, needs repair');
          profileRepairNeeded = true;
        }

        if (profileRepairNeeded) {
          setNeedsRepair(true);
          await repairProfile(user);
        }
      } catch (error) {
        console.error('[StudentProfileCheck] Error checking profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const repairProfile = async (user: any) => {
      try {
        console.log('[StudentProfileCheck] Attempting to repair profile');
        
        // Call the profile repair API
        const response = await fetch('/api/student/repair-profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            fullName: user.user_metadata?.full_name,
            email: user.email,
            isAnonymous: user.user_metadata?.is_anonymous === true
          }),
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(`Profile repair failed: ${response.status}`);
        }

        const result = await response.json();
        console.log('[StudentProfileCheck] Profile repair result:', result);
        
        // Repair complete
        setNeedsRepair(false);
      } catch (error) {
        console.error('[StudentProfileCheck] Failed to repair profile:', error);
      }
    };

    checkStudentProfile();
  }, [supabase]);

  // This is a hidden component, it doesn't render anything visible
  return null;
}