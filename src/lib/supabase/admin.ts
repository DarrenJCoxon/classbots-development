// src/lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Add a flag to limit logging frequency
let hasLoggedAdminClientInitialization = false;

export const createAdminClient = () => {
  // Log the environment variables only once to prevent excessive console output
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  if (!hasLoggedAdminClientInitialization) {
    console.log('Admin client initialization:');
    console.log(`- URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
    console.log(`- Service key exists: ${serviceRoleKey.length > 0 ? 'YES' : 'NO'}`);
    
    // Check if the key starts with 'eyJ' which is the start of a valid JWT
    if (!serviceRoleKey.startsWith('eyJ')) {
      console.warn('WARNING: Service role key may not be valid - keys typically start with "eyJ"');
    }
    
    hasLoggedAdminClientInitialization = true;
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
  
  // Only log methods the first time
  if (!hasLoggedAdminClientInitialization) {
    console.log('Admin client methods [auth]:', Object.keys(client.auth));
    if (client.auth.admin) {
      console.log('Admin client methods [auth.admin]:', Object.keys(client.auth.admin));
    } else {
      console.warn('Admin auth methods not available - this may indicate a Supabase version issue');
    }
    
    hasLoggedAdminClientInitialization = true;
  }
  
  return client;
};