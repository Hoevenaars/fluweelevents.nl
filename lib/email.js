import { applyTemplate } from "./crm.js";

/**
 * @param {{ to: string|string[], subject: string, text: string, html?: string, attachments?: { filename: string, content: Buffer|string, contentType?: string }[] }} opts
 */
export async function sendEmail({ to, subject, text, html, attachments = [] }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log("[email] Geen RESEND_API_KEY — mail niet verstuurd:", {
      to,
      subject,
      attachments: attachments.map((a) => a.filename),
    });
    return { ok: true, mock: true };
  }

  const payload = {
    from: process.env.EMAIL_FROM || "Fluweel Events <noreply@fluweelevents.nl>",
    to: Array.isArray(to) ? to : [to],
    subject,
    text,
    html: html || text.replace(/\n/g, "<br>"),
  };

  if (attachments.length) {
    payload.attachments = attachments.map((a) => ({
      filename: a.filename,
      content: Buffer.isBuffer(a.content) ? a.content.toString("base64") : a.content,
      ...(a.contentType ? { content_type: a.contentType } : {}),
    }));
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
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
