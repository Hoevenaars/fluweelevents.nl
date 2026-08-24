import { listCampaigns, createCampaign, getCampaignRecipients, sendCampaign } from "../lib/crm.js";
import { withAuth, methodNotAllowed } from "../lib/api-handler.js";
import { json } from "../lib/http.js";

export default async function handler(req, res) {
  const url = new URL(req.url || "/", "http://x");

  if (url.pathname.endsWith("/send") && req.method === "POST") {
    return withAuth(req, res, async () => {
      const { id } = req.body || {};
      const result = await sendCampaign(id);
      if (!result) return json(res, 404, { ok: false, error: "Campagne niet gevonden." });
      return json(res, 200, { ok: true, ...result });
    });
  }

  return withAuth(req, res, async () => {
    if (req.method === "GET") {
      return json(res, 200, { ok: true, campaigns: await listCampaigns() });
    }
    if (req.method === "POST") {
      const campaign = await createCampaign(req.body || {});
      const preview = await getCampaignRecipients(campaign);
      return json(res, 201, { ok: true, campaign, ontvangers: preview.length });
    }
    return methodNotAllowed(res);
  });
}
