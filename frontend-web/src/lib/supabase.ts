import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!env.supabaseConfigured) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseAnonKey);
  }
  return client;
}

export interface GoogleSignInOptions {
  portal?: "student" | "parent" | "staff";
  mode?: "login" | "signup";
}

export async function googleSignIn(opts?: GoogleSignInOptions): Promise<void> {
  const supabase = getSupabase();
  const base = env.googleRedirectUrl || window.location.origin + "/auth/callback";

  const params = new URLSearchParams();
  if (opts?.portal) params.set("portal", opts.portal);
  if (opts?.mode) params.set("mode", opts.mode);
  const qs = params.toString();
  const redirectTo = qs ? `${base}?${qs}` : base;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) {
    throw new Error(error.message);
  }
}