import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import {
  getAnonClient,
  getServiceClient,
  getSupabaseAuthDiagnostics,
  isSupabaseAuthConfigured,
} from "./supabase.js";
import {
  clearSessionCookies,
  getAccessToken,
  getLegacySessionToken,
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

function hasLegacyCredentials() {
  return Boolean(
    (process.env.ADMIN_EMAIL || "").trim() && (process.env.ADMIN_PASSWORD || "")
  );
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
  let expected;
  try {
    expected = createHmac("sha256", getSecret()).update(body).digest("base64url");
  } catch {
    return null;
  }
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
  if (!hasLegacyCredentials()) return false;
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

function mapSupabaseAuthError(error) {
  const msg = String(error?.message || "").toLowerCase();
  if (msg.includes("email not confirmed")) {
    return "Dit account is nog niet bevestigd. Zet in Supabase bij de user 'Auto Confirm' aan, of bevestig het e-mailadres.";
  }
  if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
    return "Onjuiste inloggegevens. Gebruik het e-mailadres en wachtwoord van je Supabase Auth-user.";
  }
  if (msg.includes("fetch") || msg.includes("network")) {
    return "Supabase is niet bereikbaar. Controleer SUPABASE_URL in Vercel.";
  }
  return "Inloggen via Supabase mislukt. Controleer Auth-user en API-keys in Vercel.";
}

function getJwtSecret() {
  return process.env.SUPABASE_JWT_SECRET || "";
}

/** Local HS256 verify — works even when auth.getUser fails with Marketplace keys. */
function verifySupabaseJwt(accessToken) {
  const secret = getJwtSecret();
  if (!secret || !accessToken) return null;
  const parts = String(accessToken).split(".");
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;
  const expected = createHmac("sha256", secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64url");

  const a = Buffer.from(signatureB64);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    const email = payload.email || payload.user_metadata?.email;
    if (!email) return null;
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return { email: String(email).toLowerCase(), provider: "supabase" };
  } catch {
    return null;
  }
}

async function verifySupabaseAccessToken(accessToken) {
  if (!accessToken) return null;

  const local = verifySupabaseJwt(accessToken);
  if (local) return local;

  for (const client of [getAnonClient(), getServiceClient()]) {
    if (!client) continue;
    try {
      const { data, error } = await client.auth.getUser(accessToken);
      if (!error && data.user?.email) {
        return { email: data.user.email.toLowerCase(), provider: "supabase" };
      }
    } catch (err) {
      console.error("getUser failed:", err?.message || err);
    }
  }

  return null;
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

function legacySuccess(email) {
  return {
    ok: true,
    email: String(email).trim().toLowerCase(),
    provider: "legacy",
    legacyToken: createLegacySessionToken(email),
  };
}

export async function login(email, password) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedPassword = String(password || "");

  if (isSupabaseAuthConfigured()) {
    const supabase = getAnonClient();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      if (!error && data.session && data.user?.email) {
        return {
          ok: true,
          email: data.user.email.toLowerCase(),
          provider: "supabase",
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
        };
      }

      if (hasLegacyCredentials() && verifyLegacyLogin(normalizedEmail, normalizedPassword)) {
        return legacySuccess(normalizedEmail);
      }

      return {
        ok: false,
        error: mapSupabaseAuthError(error),
        code: error?.code || "supabase_auth_failed",
      };
    } catch (err) {
      console.error("Supabase login error:", err);
      if (hasLegacyCredentials() && verifyLegacyLogin(normalizedEmail, normalizedPassword)) {
        return legacySuccess(normalizedEmail);
      }
      return {
        ok: false,
        error: mapSupabaseAuthError(err),
        code: "supabase_auth_exception",
      };
    }
  }

  if (!verifyLegacyLogin(normalizedEmail, normalizedPassword)) {
    return {
      ok: false,
      error: hasLegacyCredentials()
        ? "Onjuiste inloggegevens."
        : "Geen login geconfigureerd. Zet Supabase Auth keys of ADMIN_EMAIL/ADMIN_PASSWORD in Vercel.",
    };
  }

  return legacySuccess(normalizedEmail);
}

export async function getSessionFromRequest(req, res = null) {
  const accessToken = getAccessToken(req);
  const refreshToken = getRefreshToken(req);

  if (accessToken || refreshToken) {
    let session = await verifySupabaseAccessToken(accessToken);
    if (!session && refreshToken) {
      const refreshed = await refreshSupabaseSession(refreshToken);
      if (refreshed) {
        if (res) {
          try {
            setSessionCookies(res, refreshed.accessToken, refreshed.refreshToken);
          } catch {}
        }
        session = { email: refreshed.email, provider: refreshed.provider };
      }
    }
    if (session) return session;

    // Bearer may be a legacy HMAC token when fallback auth is used.
    if (accessToken) {
      try {
        const legacy = verifyLegacyToken(accessToken);
        if (legacy) return { email: legacy.email, provider: "legacy" };
      } catch {}
    }
  }

  const legacyToken = getLegacySessionToken(req);
  if (legacyToken && legacyToken !== accessToken) {
    try {
      const legacy = verifyLegacyToken(legacyToken);
      if (legacy) return { email: legacy.email, provider: "legacy" };
    } catch {}
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
  if (hasLegacyCredentials()) return "legacy";
  return "unconfigured";
}

export function getAuthDiagnostics() {
  const supabase = getSupabaseAuthDiagnostics();
  return {
    mode: getAuthMode(),
    supabase: {
      ...supabase,
      jwtSecretConfigured: Boolean(getJwtSecret()),
    },
    legacyConfigured: hasLegacyCredentials(),
  };
}
