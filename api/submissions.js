import { requireSession } from "../lib/auth.js";
import { json } from "../lib/http.js";
import { listSubmissions, markSubmissionRead } from "../lib/store.js";

export default async function handler(req, res) {
  try {
    await requireSession(req, res);
  } catch (err) {
    return json(res, err.status || 401, { ok: false, error: err.message });
  }

  if (req.method === "GET") {
    try {
      const submissions = await listSubmissions();
      return json(res, 200, { ok: true, submissions });
    } catch (err) {
      console.error(err);
      return json(res, 500, { ok: false, error: "Berichten konden niet worden opgehaald." });
    }
  }

  if (req.method === "PATCH") {
    try {
      const { id } = req.body || {};
      if (!id) {
        return json(res, 400, { ok: false, error: "Ontbrekend bericht-id." });
      }
      const updated = await markSubmissionRead(id);
      if (!updated) {
        return json(res, 404, { ok: false, error: "Bericht niet gevonden." });
      }
      return json(res, 200, { ok: true, submission: updated });
    } catch (err) {
      console.error(err);
      return json(res, 500, { ok: false, error: "Bericht kon niet worden bijgewerkt." });
    }
  }

  return json(res, 405, { ok: false, error: "Methode niet toegestaan." });
}
