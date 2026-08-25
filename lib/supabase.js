import { createClient } from "@supabase/supabase-js";

let serviceClient = null;
let anonClient = null;

function getSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
}

/** Normalize classic JWT keys and Marketplace JSON key maps. */
function normalizeKey(raw) {
  if (!raw) return "";
  const trimmed = String(raw).trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      return (
        parsed.default ||
        parsed.anon ||
        parsed.service_role ||
        parsed.publishable ||
        parsed.secret ||
        Object.values(parsed).find((v) => typeof v === "string" && v.length > 20) ||
        ""
      );
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

/** Service/secret key: classic name or Vercel Marketplace name. */
function getServiceRoleKey() {
  return normalizeKey(
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || ""
  );
}

/** Anon/publishable key: classic name or Vercel Marketplace name. */
function getAnonKey() {
  return normalizeKey(
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

export function getSupabaseAuthDiagnostics() {
  return {
    urlConfigured: Boolean(getSupabaseUrl()),
    anonKeyConfigured: Boolean(getAnonKey()),
    serviceKeyConfigured: Boolean(getServiceRoleKey()),
  };
}
