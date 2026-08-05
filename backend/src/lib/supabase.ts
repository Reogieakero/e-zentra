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
