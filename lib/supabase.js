import { createClient } from "@supabase/supabase-js";

let serviceClient = null;
let anonClient = null;

function getSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
}

/** Service/secret key: classic name or Vercel Marketplace name. */
function getServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
}

/** Anon/publishable key: classic name or Vercel Marketplace name. */
function getAnonKey() {
  return (
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ""
  );
}

export function isSupabaseConfigured() {
  return Boolean(getSupabaseUrl() && getServiceRoleKey());
}

export function getServiceClient() {
  if (!isSupabaseConfigured()) return null;
  if (!serviceClient) {
    serviceClient = createClient(getSupabaseUrl(), getServiceRoleKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return serviceClient;
}

export function getAnonClient() {
  const url = getSupabaseUrl();
  const anonKey = getAnonKey();
  if (!url || !anonKey) return null;
  if (!anonClient) {
    anonClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return anonClient;
}

export function isSupabaseAuthConfigured() {
  return Boolean(getSupabaseUrl() && getAnonKey());
}
