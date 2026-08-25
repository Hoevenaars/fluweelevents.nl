import { getAuthDiagnostics, requireSession } from "../../auth.js";
import { rejectUnlessAdminHost } from "../../admin-host.js";
import { json } from "../../http.js";

/** Alleen voor ingelogde admins — geen publieke recon. */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return json(res, 405, { ok: false, error: "Methode niet toegestaan." });
  }
  if (rejectUnlessAdminHost(req, res)) return;

  try {
    await requireSession(req, res);
  } catch (err) {
    return json(res, err.status || 401, { ok: false, error: err.message });
  }

  return json(res, 200, { ok: true, auth: getAuthDiagnostics() });
}
