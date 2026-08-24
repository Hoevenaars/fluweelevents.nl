import { getTemplate, getLead } from "../crm.js";
import { sendTemplateEmail } from "../email.js";
import { withAuth, methodNotAllowed } from "../api-handler.js";
import { json } from "../http.js";

export default async function handler(req, res) {
  return withAuth(req, res, async () => {
    if (req.method !== "POST") return methodNotAllowed(res);
    const { templateSlug, leadId, to, vars = {} } = req.body || {};
    const lead = leadId ? await getLead(leadId) : null;
    const email = to || lead?.email;
    if (!email || !templateSlug) {
      return json(res, 400, { ok: false, error: "templateSlug en e-mail verplicht." });
    }
    const template = await getTemplate(templateSlug);
    if (!template) return json(res, 404, { ok: false, error: "Template niet gevonden." });
    const merged = { naam: lead?.naam || "", email, ...vars };
    await sendTemplateEmail({ template, to: email, vars: merged });
    return json(res, 200, { ok: true });
  });
}
