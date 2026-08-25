import { listProjects, createProject, updateProject } from "../crm.js";
import { withAuth, methodNotAllowed } from "../api-handler.js";
import { json } from "../http.js";

const PROJECT_STATUSES = new Set(["planning", "voorbereiding", "live", "afgerond"]);

export default async function handler(req, res) {
  return withAuth(req, res, async () => {
    if (req.method === "GET") {
      return json(res, 200, { ok: true, projects: await listProjects() });
    }
    if (req.method === "POST") {
      const body = req.body || {};
      const naam = String(body.naam || "").trim();
      const klantNaam = String(body.klantNaam || "").trim();
      const klantEmail = String(body.klantEmail || "").trim() || null;
      const leadId = body.leadId || null;
      const eventDatum = body.eventDatum || null;
      const locatie = String(body.locatie || "").trim() || null;
      const aantalGasten = body.aantalGasten === "" || body.aantalGasten == null
        ? null
        : Number(body.aantalGasten);
      const budget = body.budget === "" || body.budget == null
        ? null
        : Number(body.budget);
      const status = PROJECT_STATUSES.has(body.status) ? body.status : "planning";

      if (!naam || !klantNaam) {
        return json(res, 400, { ok: false, error: "Projectnaam en klantnaam zijn verplicht." });
      }
      if (klantEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(klantEmail)) {
        return json(res, 400, { ok: false, error: "Dit e-mailadres klopt niet." });
      }

      try {
        const project = await createProject({
          leadId, naam, klantNaam, klantEmail, eventDatum, locatie, aantalGasten, budget, status,
        });
        return json(res, 201, { ok: true, project });
      } catch (err) {
        return json(res, 400, { ok: false, error: err?.message || "Aanmaken mislukt." });
      }
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
