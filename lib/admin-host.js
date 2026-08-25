import { json } from "./http.js";

export const ADMIN_HOSTNAME = "admin.fluweelevents.nl";

const PUBLIC_CRM_ROUTES = new Set([
  "GET /api/portal/quote",
  "POST /api/portal/quote",
  "POST /api/webhooks/typeform",
]);

export function getRequestHost(req) {
  const headers = req?.headers || {};
  const forwarded = headers["x-forwarded-host"] || headers["X-Forwarded-Host"];
  const raw = (typeof forwarded === "string" && forwarded.split(",")[0].trim()) || headers.host || "";
  return String(raw).split(":")[0].toLowerCase();
}

export function isAdminHost(req) {
  const host = getRequestHost(req);
  if (host === ADMIN_HOSTNAME) return true;
  if (host === "localhost" || host === "127.0.0.1") return true;
  if (host.endsWith(".vercel.app")) return true;
  return false;
}

export function isPublicCrmRoute(method, pathname) {
  return PUBLIC_CRM_ROUTES.has(`${method} ${pathname}`);
}

export function rejectUnlessAdminHost(req, res) {
  if (isAdminHost(req)) return false;
  json(res, 404, { ok: false, error: "Niet gevonden." });
  return true;
}
