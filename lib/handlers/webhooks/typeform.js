import { addLead } from "../../crm.js";
import { json } from "../../http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { ok: false, error: "Methode niet toegestaan." });
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
