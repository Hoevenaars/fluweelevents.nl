import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getAnonClient, isSupabaseAuthConfigured } from "./supabase.js";
import {
  clearSessionCookies,
  getAccessToken,
  getRefreshToken,
  setSessionCookies,
} from "./http.js";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET of ADMIN_PASSWORD ontbreekt.");
  }
  return secret;
}

function getAdminCredentials() {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  if (!email || !password) {
    throw new Error("ADMIN_EMAIL en ADMIN_PASSWORD moeten geconfigureerd zijn.");
  }
  return { email, password };
}

function signPayload(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyLegacyToken(token) {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expected = createHmac("sha256", getSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload?.email || !payload?.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function verifyLegacyLogin(email, password) {
  const admin = getAdminCredentials();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedPassword = String(password || "");

  if (normalizedEmail !== admin.email) return false;

  const a = Buffer.from(normalizedPassword);
  const b = Buffer.from(admin.password);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function createLegacySessionToken(email) {
  const payload = {
    email: String(email).trim().toLowerCase(),
    exp: Date.now() + SESSION_TTL_MS,
    nonce: randomBytes(8).toString("hex"),
  };
  return signPayload(payload);
}

async function verifySupabaseAccessToken(accessToken) {
  const supabase = getAnonClient();
  if (!supabase || !accessToken) return null;

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user?.email) return null;
  return { email: data.user.email.toLowerCase(), provider: "supabase" };
}

async function refreshSupabaseSession(refreshToken) {
  const supabase = getAnonClient();
  if (!supabase || !refreshToken) return null;

  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session || !data.user?.email) return null;

  return {
    email: data.user.email.toLowerCase(),
    provider: "supabase",
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  };
}

export async function login(email, password) {
  if (isSupabaseAuthConfigured()) {
    const supabase = getAnonClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(email || "").trim().toLowerCase(),
      password: String(password || ""),
    });

    if (error || !data.session || !data.user?.email) {
      return { ok: false };
    }

    return {
      ok: true,
      email: data.user.email.toLowerCase(),
      provider: "supabase",
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  }

  if (!verifyLegacyLogin(email, password)) {
    return { ok: false };
  }

  return {
    ok: true,
    email: String(email).trim().toLowerCase(),
    provider: "legacy",
    legacyToken: createLegacySessionToken(email),
  };
}

export async function getSessionFromRequest(req, res = null) {
  const accessToken = getAccessToken(req);
  const refreshToken = getRefreshToken(req);

  if (isSupabaseAuthConfigured() && (accessToken || refreshToken)) {
    let session = await verifySupabaseAccessToken(accessToken);
    if (!session && refreshToken) {
      const refreshed = await refreshSupabaseSession(refreshToken);
      if (refreshed) {
        if (res) {
          setSessionCookies(res, refreshed.accessToken, refreshed.refreshToken);
        }
        session = { email: refreshed.email, provider: refreshed.provider };
      }
    }
    if (session) return session;
  }

  const legacyToken = req.headers?.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("fluweel_session="))
    ?.split("=")
    ?.slice(1)
    ?.join("=");

  if (legacyToken) {
    const legacy = verifyLegacyToken(decodeURIComponent(legacyToken));
    if (legacy) return { email: legacy.email, provider: "legacy" };
  }

  return null;
}

export async function requireSession(req, res = null) {
  const session = await getSessionFromRequest(req, res);
  if (!session) {
    const err = new Error("Niet ingelogd.");
    err.status = 401;
    throw err;
  }
  return session;
}

export async function logout(_req, res) {
  clearSessionCookies(res);
}

export function getAuthMode() {
  if (isSupabaseAuthConfigured()) return "supabase";
  return "legacy";
}
