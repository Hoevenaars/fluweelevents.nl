import { listLeads, updateLead, getTeamEmails } from "../lib/crm.js";
import { withAuth, methodNotAllowed } from "../lib/api-handler.js";
import { json } from "../lib/http.js";
import { FASE_IDS } from "../lib/phases.js";

export default async function handler(req, res) {
  const url = new URL(req.url || "/", "http://x");

  return withAuth(req, res, async () => {
    if (req.method === "GET") {
      if (url.searchParams.get("team") === "1") {
        return json(res, 200, { ok: true, team: getTeamEmails() });
      }
      const leads = await listLeads();
      return json(res, 200, { ok: true, leads, submissions: leads });
    }

    if (req.method === "PATCH") {
      const { id, status, notities, gelezen, toegewezenAan, bedrijf } = req.body || {};
      if (!id) return json(res, 400, { ok: false, error: "id verplicht." });
      if (status && !FASE_IDS.has(status)) return json(res, 400, { ok: false, error: "Ongeldige fase." });
      const patch = { notities, gelezen, toegewezenAan, bedrijf };
      if (status) { patch.status = status; patch.gelezen = true; }
      const lead = await updateLead(id, patch);
      if (!lead) return json(res, 404, { ok: false, error: "Niet gevonden." });
      return json(res, 200, { ok: true, lead, submission: lead });
    }

    return methodNotAllowed(res);
  });
}
