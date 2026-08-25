import { getQuoteByToken, updateQuote, recordQuoteView } from "../../crm.js";
import { sendBrandedEmail } from "../../email.js";
import { BRAND, euro, formatNlDateTime } from "../../brand.js";
import { json } from "../../http.js";

async function notifyTeam(quote, actie) {
  const akkoord = actie === "accepteer";
  const titel = akkoord ? "Akkoord op de offerte" : "Offerte afgewezen";
  const regel = akkoord
    ? `${quote.klantNaam} heeft offerte ${quote.nummer} geaccepteerd.`
    : `${quote.klantNaam} heeft offerte ${quote.nummer} afgewezen.`;
  const views = Number(quote.bekekenAantal || 0);
  const bekekenRegel = views
    ? `Bekeken ${views}×${quote.laatstBekekenOp ? `, laatst ${formatNlDateTime(quote.laatstBekekenOp)}` : ""}.`
    : "Nog niet eerder bekeken in het portaal.";
  try {
    await sendBrandedEmail({
      to: BRAND.email,
      subject: `${titel} · ${quote.nummer}`,
      kicker: "Portaal",
      title: titel,
      text: [
        regel,
        `Totaal ${euro(quote.totaal)}.`,
        bekekenRegel,
        quote.klantEmail ? `E-mail: ${quote.klantEmail}` : "",
        quote.klantBedrijf ? `Bedrijf: ${quote.klantBedrijf}` : "",
      ].filter(Boolean).join("\n\n"),
    });
  } catch (err) {
    console.error("Teammail offerte-besluit mislukt:", err);
  }
}

export default async function handler(req, res) {
  const url = new URL(req.url || "/", "http://x");

  if (req.method === "GET") {
    const token = url.searchParams.get("token");
    if (!token) return json(res, 400, { ok: false, error: "token verplicht." });
    const quote = await getQuoteByToken(token);
    if (!quote) return json(res, 404, { ok: false, error: "Offerte niet gevonden." });
    if (quote.status !== "concept") {
      try {
        await recordQuoteView(quote.id);
      } catch (err) {
        console.error("Offerte-weergave bijhouden mislukt:", err);
      }
    }
    return json(res, 200, { ok: true, quote: { nummer: quote.nummer, klantNaam: quote.klantNaam, totaal: quote.totaal, status: quote.status, regels: quote.regels, geldigTot: quote.geldigTot } });
  }

  if (req.method === "POST") {
    const { token, actie } = req.body || {};
    const quote = await getQuoteByToken(token);
    if (!quote) return json(res, 404, { ok: false, error: "Offerte niet gevonden." });
    if (actie === "accepteer") {
      if (quote.status !== "geaccepteerd") {
        await updateQuote(quote.id, { status: "geaccepteerd" });
        await notifyTeam(quote, actie);
      }
      return json(res, 200, { ok: true, status: "geaccepteerd" });
    }
    if (actie === "afwijzen") {
      if (quote.status !== "afgewezen") {
        await updateQuote(quote.id, { status: "afgewezen" });
        await notifyTeam(quote, actie);
      }
      return json(res, 200, { ok: true, status: "afgewezen" });
    }
    return json(res, 400, { ok: false, error: "Ongeldige actie." });
  }

  return json(res, 405, { ok: false, error: "Methode niet toegestaan." });
}
