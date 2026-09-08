import {
  createProjectCost,
  updateProjectCost,
  deleteProjectCost,
} from "../crm.js";
import { withAuth, methodNotAllowed } from "../api-handler.js";
import { json } from "../http.js";

export default async function handler(req, res) {
  return withAuth(req, res, async () => {
    if (req.method === "POST") {
      const body = req.body || {};
      const projectId = body.projectId || body.project_id;
      if (!projectId) return json(res, 400, { ok: false, error: "projectId verplicht." });
      try {
        const cost = await createProjectCost(projectId, body);
        return json(res, 201, { ok: true, cost });
      } catch (err) {
        return json(res, err.status || 400, { ok: false, error: err?.message || "Aanmaken mislukt." });
      }
    }

    if (req.method === "PATCH") {
      const { id, ...updates } = req.body || {};
      if (!id) return json(res, 400, { ok: false, error: "id verplicht." });
      try {
        const cost = await updateProjectCost(id, updates);
        if (!cost) return json(res, 404, { ok: false, error: "Niet gevonden." });
        return json(res, 200, { ok: true, cost });
      } catch (err) {
        return json(res, err.status || 400, { ok: false, error: err?.message || "Opslaan mislukt." });
      }
    }

    if (req.method === "DELETE") {
      const id = req.body?.id;
      if (!id) return json(res, 400, { ok: false, error: "id verplicht." });
      try {
        const ok = await deleteProjectCost(id);
        if (!ok) return json(res, 404, { ok: false, error: "Niet gevonden." });
        return json(res, 200, { ok: true });
      } catch (err) {
        return json(res, err.status || 400, { ok: false, error: err?.message || "Verwijderen mislukt." });
      }
    }

    return methodNotAllowed(res);
  });
}
