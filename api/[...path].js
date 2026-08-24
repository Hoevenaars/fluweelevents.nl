import { resolveApiHandler } from "../lib/api-routes.js";
import { json } from "../lib/http.js";

export default async function handler(req, res) {
  const url = new URL(req.url || "/", "http://localhost");
  const routeHandler = resolveApiHandler(req.method, url.pathname);

  if (!routeHandler) {
    return json(res, 404, { ok: false, error: "Route niet gevonden." });
  }

  return routeHandler(req, res);
}
