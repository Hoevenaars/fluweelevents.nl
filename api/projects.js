import { listProjects, updateProject } from "../lib/crm.js";
import { withAuth, methodNotAllowed } from "../lib/api-handler.js";
import { json } from "../lib/http.js";

export default async function handler(req, res) {
  return withAuth(req, res, async () => {
    if (req.method === "GET") {
      return json(res, 200, { ok: true, projects: await listProjects() });
    }
    if (req.method === "PATCH") {
      const { id, ...updates } = req.body || {};
      const project = await updateProject(id, updates);
      if (!project) return json(res, 404, { ok: false, error: "Niet gevonden." });
      return json(res, 200, { ok: true, project });
    }
    return methodNotAllowed(res);
  });
}
