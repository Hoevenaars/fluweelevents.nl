import { getAnalytics } from "../lib/crm.js";
import { withAuth } from "../lib/api-handler.js";
import { json } from "../lib/http.js";

export default async function handler(req, res) {
  return withAuth(req, res, async () => {
    if (req.method !== "GET") return json(res, 405, { ok: false, error: "Methode niet toegestaan." });
    return json(res, 200, { ok: true, analytics: await getAnalytics() });
  });
}
