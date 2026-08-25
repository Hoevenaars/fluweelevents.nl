import { requireSession } from "./auth.js";
import { rejectUnlessAdminHost } from "./admin-host.js";
import { json } from "./http.js";

export async function withAuth(req, res, handler) {
  if (rejectUnlessAdminHost(req, res)) return;
  try {
    await requireSession(req, res);
    return handler();
  } catch (err) {
    return json(res, err.status || 401, { ok: false, error: err.message });
  }
}

export function methodNotAllowed(res) {
  return json(res, 405, { ok: false, error: "Methode niet toegestaan." });
}
