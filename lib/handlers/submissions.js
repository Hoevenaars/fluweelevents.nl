import { listLeads, updateLead } from "../crm.js";
import { withAuth, methodNotAllowed } from "../api-handler.js";
import { json } from "../http.js";
import { FASE_IDS } from "../phases.js";

export default async function handler(req, res) {
  return withAuth(req, res, async () => {
    if (req.method === "GET") {
      const leads = await listLeads();
      return json(res, 200, { ok: true, submissions: leads, leads });
    }
    if (req.method === "PATCH") {
      const { id, status, notities, gelezen, toegewezenAan, bedrijf } = req.body || {};
      if (!id) return json(res, 400, { ok: false, error: "id verplicht." });
      if (status && !FASE_IDS.has(status)) return json(res, 400, { ok: false, error: "Ongeldige fase." });
      const patch = { notities, gelezen, toegewezenAan, bedrijf };
      if (status) { patch.status = status; patch.gelezen = true; }
      const lead = await updateLead(id, patch);
      if (!lead) return json(res, 404, { ok: false, error: "Niet gevonden." });
      return json(res, 200, { ok: true, submission: lead, lead });
    }
    return methodNotAllowed(res);
  });
}
