import {
  listQuotes, getQuote, createQuote, updateQuote, getTemplate,
} from "../lib/crm.js";
import { generateQuotePdf } from "../lib/pdf.js";
import { sendEmail } from "../lib/email.js";
import { withAuth, methodNotAllowed } from "../lib/api-handler.js";
import { json } from "../lib/http.js";

export default async function handler(req, res) {
  const url = new URL(req.url || "/", "http://x");

  if (url.pathname.endsWith("/pdf") && req.method === "GET") {
    return withAuth(req, res, async () => {
      const id = url.searchParams.get("id");
      const quote = await getQuote(id);
      if (!quote) return json(res, 404, { ok: false, error: "Offerte niet gevonden." });
      const pdf = await generateQuotePdf(quote);
      res.status(200);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=${quote.nummer}.pdf`);
      return res.send(pdf);
    });
  }

  if (url.pathname.endsWith("/send") && req.method === "POST") {
    return withAuth(req, res, async () => {
      const { id } = req.body || {};
      const quote = await getQuote(id);
      if (!quote) return json(res, 404, { ok: false, error: "Offerte niet gevonden." });
      const pdf = await generateQuotePdf(quote);
      const template = await getTemplate("offerte");
      const baseUrl = process.env.SITE_URL || "https://fluweelevents.nl";
      const portalUrl = `${baseUrl}/portal/?token=${quote.portalToken}`;
      const text = template
        ? `${template.inhoud.replace("{{naam}}", quote.klantNaam)}\n\nBekijk offerte: ${portalUrl}`
        : `Beste ${quote.klantNaam},\n\nHierbij uw offerte ${quote.nummer}.\n\n${portalUrl}`;

      await sendEmail({
        to: quote.klantEmail,
        subject: template?.onderwerp.replace("{{naam}}", quote.klantNaam) || `Offerte ${quote.nummer}`,
        text,
      });
      await updateQuote(id, { status: "verstuurd" });
      return json(res, 200, { ok: true, portalUrl });
    });
  }

  return withAuth(req, res, async () => {
    if (req.method === "GET") {
      const id = url.searchParams.get("id");
      if (id) {
        const quote = await getQuote(id);
        if (!quote) return json(res, 404, { ok: false, error: "Niet gevonden." });
        return json(res, 200, { ok: true, quote });
      }
      return json(res, 200, { ok: true, quotes: await listQuotes() });
    }
    if (req.method === "POST") {
      const quote = await createQuote(req.body || {});
      return json(res, 201, { ok: true, quote });
    }
    if (req.method === "PATCH") {
      const { id, ...updates } = req.body || {};
      const quote = await updateQuote(id, updates);
      if (!quote) return json(res, 404, { ok: false, error: "Niet gevonden." });
      return json(res, 200, { ok: true, quote });
    }
    return methodNotAllowed(res);
  });
}
