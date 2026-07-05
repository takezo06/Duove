import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './env';

let adminClient: SupabaseClient | null = null;

/**
 * Returns a Supabase client authenticated with the service_role key.
 * This bypasses RLS – use only for internal operations like joining relationships.
 */
export function createServiceClient(): SupabaseClient {
  if (!adminClient) {
    if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
      throw new Error('Supabase URL or service role key missing.');
    }
    adminClient = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return adminClient;
}
