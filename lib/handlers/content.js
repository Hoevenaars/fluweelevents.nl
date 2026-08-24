import { listTemplates, getWebsiteSections, updateWebsiteSection } from "../crm.js";
import { withAuth, methodNotAllowed } from "../api-handler.js";
import { json } from "../http.js";

export default async function handler(req, res) {
  const url = new URL(req.url || "/", "http://x");

  if (url.pathname.includes("/templates")) {
    return withAuth(req, res, async () => {
      if (req.method !== "GET") return methodNotAllowed(res);
      return json(res, 200, { ok: true, templates: await listTemplates() });
    });
  }

  if (url.pathname.includes("/website")) {
    if (req.method === "GET") {
      const sections = await getWebsiteSections();
      return json(res, 200, { ok: true, sections });
    }
    return withAuth(req, res, async () => {
      const { sleutel, waarde } = req.body || {};
      if (!sleutel) return json(res, 400, { ok: false, error: "sleutel verplicht." });
      const section = await updateWebsiteSection(sleutel, waarde);
      return json(res, 200, { ok: true, section });
    });
  }

  return methodNotAllowed(res);
}
