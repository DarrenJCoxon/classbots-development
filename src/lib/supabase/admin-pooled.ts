// src/lib/supabase/admin-pooled.ts
import { getAdminClient } from './connection-pool';

/**
 * DEPRECATED: Use getAdminClient() from connection-pool.ts instead
 * 
 * This function now returns the pooled admin client for backward compatibility
 */
export const createAdminClient = () => {
  console.warn('[DEPRECATED] createAdminClient() is deprecated. Use getAdminClient() from connection-pool.ts');
  return getAdminClient();
};