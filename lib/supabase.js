import { createClient } from "@supabase/supabase-js";

let serviceClient = null;
let anonClient = null;

function getSupabaseUrl() {
  return process.env.SUPABASE_URL || "";
}

export function isSupabaseConfigured() {
  return Boolean(getSupabaseUrl() && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getServiceClient() {
  if (!isSupabaseConfigured()) return null;
  if (!serviceClient) {
    serviceClient = createClient(getSupabaseUrl(), process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return serviceClient;
}

export function getAnonClient() {
  const url = getSupabaseUrl();
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  if (!anonClient) {
    anonClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return anonClient;
}

export function isSupabaseAuthConfigured() {
  return Boolean(getSupabaseUrl() && process.env.SUPABASE_ANON_KEY);
}
