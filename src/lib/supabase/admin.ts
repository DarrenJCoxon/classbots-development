// src/lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export const createAdminClient = () => {
  // Log the environment variables to verify they exist (redact part of the key for security)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  console.log('Admin client initialization:');
  console.log(`- URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
  console.log(`- Service key exists: ${serviceRoleKey.length > 0 ? 'YES' : 'NO'}`);
  
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      // These headers ensure the service role bypasses RLS
      global: {
        headers: {
          'X-Client-Info': 'admin-supabase-js',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    }
  );
};