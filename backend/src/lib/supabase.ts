import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config/env';
import { ApiError } from '../utils/ApiError';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!config.supabase.enabled) {
    throw ApiError.notFound('Supabase auth is not configured');
  }
  if (!client) {
    client = createClient(config.supabase.url!, config.supabase.anonKey!);
  }
  return client;
}

let storageClient: SupabaseClient | null = null;

/**
 * Client used for object storage (uploads). Uses the service role key so
 * bucket operations bypass RLS; only ever call this from the backend.
 */
export function getSupabaseStorage(): SupabaseClient {
  if (!config.supabase.url || !config.storage.serviceRoleKey) {
    throw ApiError.notFound('Supabase storage is not configured');
  }
  if (!storageClient) {
    storageClient = createClient(config.supabase.url, config.storage.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return storageClient;
}
