import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './env';
import WebSocket from 'ws';

// User-scoped client (for RLS)
export function createUserClient(accessToken: string): SupabaseClient {
  if (!accessToken) throw new Error('Access token is required.');
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error('Supabase URL or anon key is missing.');
  }
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    realtime: { transport: WebSocket as any },
  });
}

// Admin client (bypass RLS) – for internal operations like profile creation
export const supabaseAdmin = createClient(
  config.supabaseUrl,
  config.supabaseServiceRoleKey,
  {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: WebSocket as any },
  }
);
