// Vercel serverless function. Vangt het contactformulier op, slaat het op in
// centrale opslag en verstuurt via Resend een mail naar Fluweel, met reply-to
// op het adres van de afzender.
// RESEND_API_KEY staat als omgevingsvariabele in de Vercel-projectinstellingen,
// nooit hier in de code.

import { addSubmission } from "../lib/store.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Methode niet toegestaan." });
  }

  try {
    const { naam, email, telefoon, bericht, website } = req.body || {};

    // Honeypot: een onzichtbaar veld dat alleen bots invullen.
    if (website) {
      return res.status(200).json({ ok: true });
    }

    if (!naam || !email || !bericht) {
      return res.status(400).json({ ok: false, error: "Vul alle velden in." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok: false, error: "Dit e-mailadres klopt niet." });
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Fluweel Events <noreply@fluweelevents.nl>",
        to: ["contact@fluweelevents.nl"],
        reply_to: email,
        subject: `Nieuw bericht van ${naam}`,
        text: `Naam: ${naam}\nE-mail: ${email}${telefoon ? `\nTelefoon: ${telefoon}` : ""}\n\nBericht:\n${bericht}`,
      }),
    });

    if (!resendResponse.ok) {
      const detail = await resendResponse.text();
      console.error("Resend fout:", detail);
      return res.status(502).json({ ok: false, error: "Verzenden is niet gelukt. Probeer het later opnieuw." });
    }

    try {
      await addSubmission({ naam, email, telefoon, bericht, bron: "website" });
    } catch (storeErr) {
      console.error("Opslaan contactformulier mislukt:", storeErr);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: "Er ging iets mis." });
  }
}
