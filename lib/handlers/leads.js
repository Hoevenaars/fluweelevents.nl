import { listLeads, updateLead, addLead, getTeamEmails, addActivity } from "../crm.js";
import { withAuth, methodNotAllowed } from "../api-handler.js";
import { json } from "../http.js";
import { FASE_IDS } from "../phases.js";

const BRONNEN = new Set(["telefoon", "website", "typeform", "referral", "linkedin", "walk-in", "overig"]);

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

    if (req.method === "POST") {
      const body = req.body || {};
      const naam = String(body.naam || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const telefoon = String(body.telefoon || "").trim() || null;
      const bedrijf = String(body.bedrijf || "").trim() || null;
      const bericht = String(body.bericht || body.notities || "").trim() || "Handmatig toegevoegd.";
      const bron = BRONNEN.has(body.bron) ? body.bron : "telefoon";

      if (!naam || !email) {
        return json(res, 400, { ok: false, error: "Naam en e-mail zijn verplicht." });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return json(res, 400, { ok: false, error: "Dit e-mailadres klopt niet." });
      }

      const lead = await addLead({ naam, email, telefoon, bericht, bron, bedrijf });
      if (body.notities && String(body.notities).trim()) {
        await updateLead(lead.id, { notities: String(body.notities).trim() });
      }
      return json(res, 201, { ok: true, lead });
    }

    if (req.method === "PATCH") {
      const { id, status, notities, gelezen, toegewezenAan, bedrijf, activiteit } = req.body || {};
      if (!id) return json(res, 400, { ok: false, error: "id verplicht." });

      // Snel bel-log / notitie in de timeline
      if (activiteit?.titel) {
        await addActivity({
          leadId: id,
          type: activiteit.type || "notitie",
          titel: String(activiteit.titel).trim(),
          omschrijving: String(activiteit.omschrijving || "").trim(),
        });
        const lead = (await listLeads()).find((l) => l.id === id);
        return json(res, 200, { ok: true, lead });
      }

      if (status && !FASE_IDS.has(status)) return json(res, 400, { ok: false, error: "Ongeldige fase." });
      const patch = {};
      if (typeof notities === "string") patch.notities = notities;
      if (typeof gelezen === "boolean") patch.gelezen = gelezen;
      if (toegewezenAan !== undefined) patch.toegewezenAan = toegewezenAan;
      if (bedrijf !== undefined) patch.bedrijf = bedrijf;
      if (status) { patch.status = status; patch.gelezen = true; }
      const lead = await updateLead(id, patch);
      if (!lead) return json(res, 404, { ok: false, error: "Niet gevonden." });
      return json(res, 200, { ok: true, lead, submission: lead });
    }

    return methodNotAllowed(res);
  });
}
