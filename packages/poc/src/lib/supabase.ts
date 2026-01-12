/**
 * Supabase Client Configuration
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

/**
 * Create Supabase client with anon key (for public operations)
 */
export function createSupabaseClient(): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
}

/**
 * Create Supabase client with service role key (for admin operations)
 * Use this for batch processing and bypassing RLS
 */
export function createSupabaseAdmin(): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Default client instance (lazy initialization)
 */
let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!_client) {
    _client = createSupabaseClient();
  }
  return _client;
}

/**
 * Admin client instance (lazy initialization)
 */
let _adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!_adminClient) {
    _adminClient = createSupabaseAdmin();
  }
  return _adminClient;
}
