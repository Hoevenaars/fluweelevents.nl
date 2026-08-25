// Vercel serverless function. Vangt het contactformulier op, slaat het op in
// centrale opslag en verstuurt via Resend een mail naar Fluweel, met reply-to
// op het adres van de afzender.
// RESEND_API_KEY staat als omgevingsvariabele in de Vercel-projectinstellingen,
// nooit hier in de code.

import { addLead } from "../lib/crm.js";
import { getTemplate } from "../lib/crm.js";
import { sendBrandedEmail, sendTemplateEmail } from "../lib/email.js";

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

    if (!process.env.RESEND_API_KEY) {
      return res.status(502).json({ ok: false, error: "Verzenden is niet gelukt. Probeer het later opnieuw." });
    }

    const details = [
      `Naam: ${naam}`,
      `E-mail: ${email}`,
      telefoon ? `Telefoon: ${telefoon}` : "",
      "",
      "Bericht:",
      bericht,
    ].filter((line) => line !== "").join("\n");

    try {
      await sendBrandedEmail({
        to: "contact@fluweelevents.nl",
        replyTo: email,
        subject: `Nieuw bericht van ${naam}`,
        kicker: "Aanvraag",
        title: "Iemand klopt aan",
        text: `Er is een nieuw bericht binnengekomen via fluweelevents.nl.\n\n${details}`,
      });
    } catch (mailErr) {
      console.error("Resend fout:", mailErr);
      return res.status(502).json({ ok: false, error: "Verzenden is niet gelukt. Probeer het later opnieuw." });
    }

    try {
      await addLead({ naam, email, telefoon, bericht, bron: "website" });
      const template = await getTemplate("bevestiging");
      if (template) {
        await sendTemplateEmail({
          template,
          to: email,
          vars: { naam, email },
          kicker: "Welkom",
        });
      }
    } catch (storeErr) {
      console.error("Opslaan contactformulier mislukt:", storeErr);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: "Er ging iets mis." });
  }
}
