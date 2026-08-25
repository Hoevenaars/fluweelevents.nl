import { resolveApiHandler } from "../lib/api-routes.js";
import { json } from "../lib/http.js";

/**
 * Single CRM API entrypoint.
 * Nested paths like /api/auth/login are rewritten here via vercel.json,
 * because non-Next.js Vercel projects do not support catch-all [...path] nesting.
 */
export default async function handler(req, res) {
  const incoming = new URL(req.url || "/", "http://localhost");
  const rewrittenPath = incoming.searchParams.get("__p");
  const pathname = rewrittenPath || incoming.pathname;

  if (rewrittenPath) {
    const restored = new URL(rewrittenPath, "http://localhost");
    incoming.searchParams.delete("__p");
    for (const [key, value] of incoming.searchParams) {
      restored.searchParams.set(key, value);
    }
    req.url = `${restored.pathname}${restored.search}`;
  }

  const routeHandler = resolveApiHandler(req.method, pathname);

  if (!routeHandler) {
    return json(res, 404, { ok: false, error: "Route niet gevonden." });
  }

  return routeHandler(req, res);
}
