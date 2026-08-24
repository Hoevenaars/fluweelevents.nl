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
        return [part.slice(0, idx), decodeURIComponent(part.slice(idx + 1))];
      })
  );
}

function secureCookie() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL;
}

function buildCookie(name, value, maxAgeSeconds) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (secureCookie()) parts.push("Secure");
  return parts.join("; ");
}

function clearCookie(name) {
  const parts = [ `${name}=`, "Path=/", "HttpOnly", "SameSite=Strict", "Max-Age=0" ];
  if (secureCookie()) parts.push("Secure");
  return parts.join("; ");
}

export function getAccessToken(req) {
  const cookies = parseCookies(req.headers?.cookie || "");
  return cookies.fluweel_access || null;
}

export function getRefreshToken(req) {
  const cookies = parseCookies(req.headers?.cookie || "");
  return cookies.fluweel_refresh || null;
}

export function setSessionCookies(res, accessToken, refreshToken) {
  res.setHeader("Set-Cookie", [
    buildCookie("fluweel_access", accessToken, 60 * 60),
    buildCookie("fluweel_refresh", refreshToken, 60 * 60 * 24 * 30),
  ]);
}

export function setLegacySessionCookie(res, token, { maxAgeSeconds = 60 * 60 * 24 * 7 } = {}) {
  res.setHeader("Set-Cookie", buildCookie("fluweel_session", token, maxAgeSeconds));
}

export function clearSessionCookies(res) {
  res.setHeader("Set-Cookie", [
    clearCookie("fluweel_access"),
    clearCookie("fluweel_refresh"),
    clearCookie("fluweel_session"),
  ]);
}
