import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './env';

let adminClient: SupabaseClient | null = null;

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
