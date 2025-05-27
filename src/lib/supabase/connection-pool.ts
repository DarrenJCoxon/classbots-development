// src/lib/supabase/connection-pool.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

/**
 * Connection Pooling for Supabase Clients
 * 
 * This module implements connection pooling to prevent creating new
 * database connections on every request, which is critical for scale.
 */

// Singleton admin client - this can be shared across all requests
let adminClient: SupabaseClient<Database> | null = null;

// For monitoring connection usage
let adminClientUseCount = 0;
let serverClientCreationCount = 0;

/**
 * Get or create the admin client (service role)
 * This client bypasses RLS and can be shared across all requests
 */
export function getAdminClient(): SupabaseClient<Database> {
  if (!adminClient) {
    console.log('[Connection Pool] Creating admin client singleton');
    
    adminClient = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: {
            'X-Client-Info': 'pooled-admin-client',
          }
        }
      }
    );
  }
  
  adminClientUseCount++;
  if (adminClientUseCount % 1000 === 0) {
    console.log(`[Connection Pool] Admin client used ${adminClientUseCount} times`);
  }
  
  return adminClient;
}

/**
 * Server client with cookie handling
 * 
 * NOTE: We cannot pool server clients because they need access to
 * request-specific cookies for authentication. However, we can still
 * optimize by using the Supabase client's internal connection pooling.
 */
export async function getServerClient() {
  // Import dynamically to avoid issues with Next.js
  const { createServerSupabaseClient } = await import('./server');
  
  serverClientCreationCount++;
  if (serverClientCreationCount % 100 === 0) {
    console.log(`[Connection Pool] Server clients created: ${serverClientCreationCount}`);
  }
  
  return createServerSupabaseClient();
}

/**
 * Get connection pool statistics
 */
export function getPoolStats() {
  return {
    adminClientUseCount,
    serverClientCreationCount,
    adminClientExists: !!adminClient,
  };
}

/**
 * Reset the connection pool (useful for testing)
 */
export function resetPool() {
  adminClient = null;
  adminClientUseCount = 0;
  serverClientCreationCount = 0;
  console.log('[Connection Pool] Pool reset');
}