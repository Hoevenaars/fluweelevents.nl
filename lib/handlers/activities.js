import { listActivities, addActivity } from "../crm.js";
import { withAuth, methodNotAllowed } from "../api-handler.js";
import { json } from "../http.js";

export default async function handler(req, res) {
  const url = new URL(req.url || "/", "http://x");

  return withAuth(req, res, async () => {
    if (req.method === "GET") {
      const leadId = url.searchParams.get("leadId");
      if (!leadId) return json(res, 400, { ok: false, error: "leadId verplicht." });
      return json(res, 200, { ok: true, activities: await listActivities(leadId) });
    }
    if (req.method === "POST") {
      const { leadId, titel, omschrijving, type } = req.body || {};
      if (!leadId || !titel) return json(res, 400, { ok: false, error: "leadId en titel verplicht." });
      const activity = await addActivity({ leadId, titel, omschrijving, type });
      return json(res, 201, { ok: true, activity });
    }
    return methodNotAllowed(res);
  });
}
