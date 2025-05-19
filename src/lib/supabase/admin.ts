// src/lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export const createAdminClient = () => {
  // Log the environment variables to verify they exist (redact part of the key for security)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  console.log('Admin client initialization:');
  console.log(`- URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
  console.log(`- Service key exists: ${serviceRoleKey.length > 0 ? 'YES' : 'NO'}`);
  
  // Check if the key starts with 'eyJ' which is the start of a valid JWT
  if (!serviceRoleKey.startsWith('eyJ')) {
    console.warn('WARNING: Service role key may not be valid - keys typically start with "eyJ"');
  }
  
  // Create the client with the service role key
  const client = createClient<Database>(
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
  
  // Log available methods for debugging - especially check the auth.admin object
  console.log('Admin client methods [auth]:', Object.keys(client.auth));
  if (client.auth.admin) {
    console.log('Admin client methods [auth.admin]:', Object.keys(client.auth.admin));
  } else {
    console.warn('Admin auth methods not available - this may indicate a Supabase version issue');
  }
  
  return client;
};