import { listInvoices, createInvoiceFromQuote, updateInvoice } from "../crm.js";
import { generateInvoicePdf } from "../pdf.js";
import { sendBrandedEmail } from "../email.js";
import { applyTemplate } from "../crm.js";
import { getBrandTemplate } from "../brand.js";
import { withAuth, methodNotAllowed } from "../api-handler.js";
import { json } from "../http.js";

export default async function handler(req, res) {
  const url = new URL(req.url || "/", "http://x");

  if (url.pathname.endsWith("/pdf") && req.method === "GET") {
    return withAuth(req, res, async () => {
      const id = url.searchParams.get("id");
      const invoices = await listInvoices();
      const invoice = invoices.find((i) => i.id === id);
      if (!invoice) return json(res, 404, { ok: false, error: "Factuur niet gevonden." });
      const pdf = await generateInvoicePdf(invoice);
      res.status(200);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${invoice.nummer}.pdf"`);
      return res.send(pdf);
    });
  }

  if (url.pathname.endsWith("/moneybird") && req.method === "GET") {
    return withAuth(req, res, async () => {
      const id = url.searchParams.get("id");
      const invoices = await listInvoices();
      const invoice = invoices.find((i) => i.id === id);
      if (!invoice) return json(res, 404, { ok: false, error: "Niet gevonden." });
      const exportData = {
        contact: { name: invoice.klantNaam, email: invoice.klantEmail, company: invoice.klantBedrijf },
        invoice: { number: invoice.nummer, date: invoice.aangemaaktOp, dueDate: invoice.vervaldatum, total: invoice.totaal },
        lines: invoice.regels,
      };
      res.status(200);
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename=${invoice.nummer}-moneybird.json`);
      return res.send(JSON.stringify(exportData, null, 2));
    });
  }

  return withAuth(req, res, async () => {
    if (req.method === "GET") {
      return json(res, 200, { ok: true, invoices: await listInvoices() });
    }
    if (req.method === "POST") {
      const { quoteId } = req.body || {};
      if (!quoteId) return json(res, 400, { ok: false, error: "quoteId verplicht." });
      const invoice = await createInvoiceFromQuote(quoteId);
      return json(res, 201, { ok: true, invoice });
    }
    if (req.method === "PATCH") {
      const { id, status, bericht } = req.body || {};
      const invoice = await updateInvoice(id, { status });
      if (!invoice) return json(res, 404, { ok: false, error: "Niet gevonden." });
      if (status === "verstuurd") {
        const pdf = await generateInvoicePdf(invoice);
        const template = getBrandTemplate("factuur");
        const vars = { naam: invoice.klantNaam, nummer: invoice.nummer };
        await sendBrandedEmail({
          to: invoice.klantEmail,
          subject: applyTemplate(template.onderwerp, vars),
          kicker: "Factuur",
          title: `Factuur ${invoice.nummer}`,
          text: applyTemplate(template.inhoud, vars),
          extra: String(bericht || "").trim(),
          attachments: [{
            filename: `${invoice.nummer}.pdf`,
            content: pdf,
            contentType: "application/pdf",
          }],
        });
      }
      return json(res, 200, { ok: true, invoice });
    }
    return methodNotAllowed(res);
  });
}
