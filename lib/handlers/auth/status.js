import { getAuthDiagnostics } from "../../auth.js";
import { json } from "../../http.js";

/** Publieke diagnose zonder secrets — handig bij setup. */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return json(res, 405, { ok: false, error: "Methode niet toegestaan." });
  }

  return json(res, 200, { ok: true, auth: getAuthDiagnostics() });
}
