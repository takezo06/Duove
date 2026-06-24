import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './env';
import { logger } from './logger';

/**
 * Creates a Supabase client that authenticates as the user whose JWT is provided.
 * This ensures Row Level Security (RLS) is always enforced.
 *
 * @param accessToken - The user's JWT (from the Authorization header)
 * @returns A Supabase client instance scoped to that user
 * @throws Error if the access token is missing or Supabase URL is not set
 */
export function createUserClient(accessToken: string): SupabaseClient {
  if (!accessToken) {
    throw new Error('Access token is required to create a user‑scoped Supabase client.');
  }

  if (!config.supabaseUrl) {
    throw new Error('SUPABASE_URL is not defined in environment variables.');
  }

  // The Supabase client constructor accepts an access token as the second argument.
  // This will be used as the Authorization header for all requests.
  return createClient(config.supabaseUrl, accessToken, {
    auth: {
      autoRefreshToken: false,   // We handle token refresh on the frontend
      persistSession: false,     // No local storage on the server
    },
  });
}

// Optional: you can also export a helper to get the user ID from the token,
// but that's better handled by the auth middleware later.
