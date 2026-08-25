import {
  listQuotes, getQuote, createQuote, updateQuote, getTemplate, applyTemplate,
} from "../crm.js";
import { generateQuotePdf } from "../pdf.js";
import { sendBrandedEmail } from "../email.js";
import { getBrandTemplate } from "../brand.js";
import { withAuth, methodNotAllowed } from "../api-handler.js";
import { json } from "../http.js";

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
      res.setHeader("Content-Disposition", `inline; filename="${quote.nummer}.pdf"`);
      return res.send(pdf);
    });
  }

  if (url.pathname.endsWith("/send") && req.method === "POST") {
    return withAuth(req, res, async () => {
      const { id, bericht } = req.body || {};
      const quote = await getQuote(id);
      if (!quote) return json(res, 404, { ok: false, error: "Offerte niet gevonden." });
      const pdf = await generateQuotePdf(quote);
      const template = (await getTemplate("offerte")) || getBrandTemplate("offerte");
      const baseUrl = process.env.SITE_URL || "https://fluweelevents.nl";
      const portalUrl = `${baseUrl}/portal/?token=${quote.portalToken}`;
      const vars = { naam: quote.klantNaam, nummer: quote.nummer };
      const subject = applyTemplate(template?.onderwerp || "Je offerte van Fluweel", vars);
      const body = applyTemplate(
        template?.inhoud || getBrandTemplate("offerte").inhoud,
        vars
      );

      await sendBrandedEmail({
        to: quote.klantEmail,
        subject,
        kicker: "Offerte",
        title: `Offerte ${quote.nummer}`,
        text: body,
        extra: String(bericht || "").trim(),
        cta: { label: "Bekijk de offerte", url: portalUrl },
        attachments: [{
          filename: `${quote.nummer}.pdf`,
          content: pdf,
          contentType: "application/pdf",
        }],
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
