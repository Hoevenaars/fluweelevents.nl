import { applyTemplate } from "./crm.js";

export async function sendEmail({ to, subject, text, html }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log("[email] Geen RESEND_API_KEY — mail niet verstuurd:", { to, subject });
    return { ok: true, mock: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Fluweel Events <noreply@fluweelevents.nl>",
      to: Array.isArray(to) ? to : [to],
      subject,
      text,
      html: html || text.replace(/\n/g, "<br>"),
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`E-mail versturen mislukt: ${detail}`);
  }
  return res.json();
}

export async function sendTemplateEmail({ template, to, vars = {} }) {
  const subject = applyTemplate(template.onderwerp, vars);
  const text = applyTemplate(template.inhoud, vars);
  return sendEmail({ to, subject, text });
}
