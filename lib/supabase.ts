import { createClient } from "@supabase/supabase-js";

function getEnv(name: string) {
  return process.env[name];
}

export function isSupabaseConfigured() {
  return Boolean(getEnv("SUPABASE_URL") && getEnv("SUPABASE_SERVICE_ROLE_KEY"));
}

export function getSupabaseAdmin() {
  const url = getEnv("SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export function getSupabaseBucket() {
  return process.env.SUPABASE_STORAGE_BUCKET || "materials";
}
