export function json(res, status, body) {
  res.status(status).json(body);
}

export function parseCookies(header = "") {
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const idx = part.indexOf("=");
        if (idx === -1) return [part, ""];
        const name = part.slice(0, idx);
        const raw = part.slice(idx + 1);
        try {
          return [name, decodeURIComponent(raw)];
        } catch {
          return [name, raw];
        }
      })
  );
}

function cookieHeader(req) {
  const headers = req.headers || {};
  return headers.cookie || headers.Cookie || "";
}

function headerValue(req, name) {
  const headers = req.headers || {};
  const direct = headers[name] || headers[name.toLowerCase()];
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const found = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase());
  if (found && typeof found[1] === "string" && found[1].trim()) return found[1].trim();
  return "";
}

function secureCookie() {
  return process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
}

function buildCookie(name, value, maxAgeSeconds) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (secureCookie()) parts.push("Secure");
  return parts.join("; ");
}

function clearCookie(name) {
  const parts = [`${name}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (secureCookie()) parts.push("Secure");
  return parts.join("; ");
}

function appendCookie(res, cookie) {
  if (typeof res.appendHeader === "function") {
    res.appendHeader("Set-Cookie", cookie);
    return;
  }
  const prev = res.getHeader?.("Set-Cookie");
  if (!prev) {
    res.setHeader("Set-Cookie", cookie);
    return;
  }
  res.setHeader("Set-Cookie", Array.isArray(prev) ? [...prev, cookie] : [prev, cookie]);
}

export function getAccessToken(req) {
  const auth = headerValue(req, "authorization");
  if (auth.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    if (token) return token;
  }

  const custom = headerValue(req, "x-fluweel-access");
  if (custom) return custom;

  const cookies = parseCookies(cookieHeader(req));
  return cookies.fluweel_access || null;
}

export function getRefreshToken(req) {
  const custom = headerValue(req, "x-fluweel-refresh");
  if (custom) return custom;
  const cookies = parseCookies(cookieHeader(req));
  return cookies.fluweel_refresh || null;
}

export function getLegacySessionToken(req) {
  const auth = headerValue(req, "authorization");
  if (auth.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    if (token.includes(".")) return token;
  }
  const custom = headerValue(req, "x-fluweel-access");
  if (custom?.includes(".")) return custom;
  const cookies = parseCookies(cookieHeader(req));
  return cookies.fluweel_session || null;
}

export function setSessionCookies(res, accessToken, refreshToken) {
  appendCookie(res, buildCookie("fluweel_access", accessToken, 60 * 60));
  appendCookie(res, buildCookie("fluweel_refresh", refreshToken, 60 * 60 * 24 * 30));
}

export function setLegacySessionCookie(res, token, { maxAgeSeconds = 60 * 60 * 24 * 7 } = {}) {
  appendCookie(res, buildCookie("fluweel_session", token, maxAgeSeconds));
}

export function clearSessionCookies(res) {
  appendCookie(res, clearCookie("fluweel_access"));
  appendCookie(res, clearCookie("fluweel_refresh"));
  appendCookie(res, clearCookie("fluweel_session"));
}
