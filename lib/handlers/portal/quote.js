import { getQuoteByToken, updateQuote } from "../../crm.js";
import { json } from "../../http.js";

export default async function handler(req, res) {
  const url = new URL(req.url || "/", "http://x");

  if (req.method === "GET") {
    const token = url.searchParams.get("token");
    if (!token) return json(res, 400, { ok: false, error: "token verplicht." });
    const quote = await getQuoteByToken(token);
    if (!quote) return json(res, 404, { ok: false, error: "Offerte niet gevonden." });
    return json(res, 200, { ok: true, quote: { nummer: quote.nummer, klantNaam: quote.klantNaam, totaal: quote.totaal, status: quote.status, regels: quote.regels, geldigTot: quote.geldigTot } });
  }

  if (req.method === "POST") {
    const { token, actie } = req.body || {};
    const quote = await getQuoteByToken(token);
    if (!quote) return json(res, 404, { ok: false, error: "Offerte niet gevonden." });
    if (actie === "accepteer") {
      await updateQuote(quote.id, { status: "geaccepteerd" });
      return json(res, 200, { ok: true, status: "geaccepteerd" });
    }
    if (actie === "afwijzen") {
      await updateQuote(quote.id, { status: "afgewezen" });
      return json(res, 200, { ok: true, status: "afgewezen" });
    }
    return json(res, 400, { ok: false, error: "Ongeldige actie." });
  }

  return json(res, 405, { ok: false, error: "Methode niet toegestaan." });
}
