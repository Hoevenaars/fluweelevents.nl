import { timingSafeEqual } from "node:crypto";
import { addLead } from "../../crm.js";
import { json } from "../../http.js";

function webhookSecretOk(req) {
  const expected = (process.env.TYPEFORM_WEBHOOK_SECRET || "").trim();
  if (!expected) return true;

  const url = new URL(req.url || "/", "http://x");
  const provided =
    String(req.headers?.["x-fluweel-webhook"] || req.headers?.["x-webhook-secret"] || "").trim() ||
    String(url.searchParams.get("secret") || "").trim();

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { ok: false, error: "Methode niet toegestaan." });
  }
  if (!webhookSecretOk(req)) {
    return json(res, 401, { ok: false, error: "Ongeldige webhook." });
  }

  try {
    const body = req.body || {};
    const naam = body.naam || body.name || "Onbekend";
    const email = body.email || body.Email;
    const telefoon = body.telefoon || body.phone;
    const bericht = body.bericht || body.message || JSON.stringify(body);
    const bedrijf = body.bedrijf || body.company;

    if (!email) return json(res, 400, { ok: false, error: "E-mail ontbreekt." });

    await addLead({ naam, email, telefoon, bericht, bedrijf, bron: "typeform" });
    return json(res, 200, { ok: true });
  } catch (err) {
    console.error(err);
    return json(res, 500, { ok: false, error: "Webhook mislukt." });
  }
}
