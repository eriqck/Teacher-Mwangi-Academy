import { createClient } from "@supabase/supabase-js";

function getPublicUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
}

function getPublicAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
}

export function isSupabasePublicConfigured() {
  return Boolean(getPublicUrl() && getPublicAnonKey());
}

export function getSupabasePublicServerClient() {
  const url = getPublicUrl();
  const anonKey = getPublicAnonKey();

  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      flowType: "implicit"
    }
  });
}
