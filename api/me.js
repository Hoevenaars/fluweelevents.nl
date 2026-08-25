import { getSessionFromRequest } from "../lib/auth.js";
import { json } from "../lib/http.js";

/** Top-level /api/me — avoids nested rewrite issues on Vercel. */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return json(res, 405, { ok: false, error: "Methode niet toegestaan." });
  }

  const session = await getSessionFromRequest(req, res);
  if (!session) {
    return json(res, 401, { ok: false, authenticated: false });
  }

  return json(res, 200, { ok: true, authenticated: true, email: session.email });
}
