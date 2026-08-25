/** Fluweel huisstijl — gedeeld door mails, PDF's en portaal. */

export const BRAND = {
  naam: "Fluweel",
  merk: "Fluweel.",
  tagline: "Meer dan een evenement. Een herinnering.",
  stem: "Niet luider. Wel scherper.",
  email: "contact@fluweelevents.nl",
  site: "https://fluweelevents.nl",
  kleuren: {
    ivoor: "#FAF5EF",
    vlak: "#F3EAE0",
    inkt: "#2A1322",
    aubergine: "#5B2A4E",
    fuchsia: "#C81E63",
    champagne: "#B8975A",
    mauve: "#7A5E6E",
    lijn: "#E3D5C9",
    wit: "#FFFFFF",
  },
};

export const BRAND_TEMPLATES = [
  {
    slug: "bevestiging",
    naam: "Bevestiging ontvangst",
    onderwerp: "We hebben je bericht · Fluweel",
    inhoud:
      "Beste {{naam}},\n\nDank je. Je aanvraag is binnen — we lezen hem met aandacht en nemen snel contact op.\n\nGeen standaardformat. Wel een herinnering die jouw merk vooruithelpt.",
  },
  {
    slug: "followup",
    naam: "Follow-up gesprek",
    onderwerp: "Vervolg op ons gesprek · Fluweel",
    inhoud:
      "Beste {{naam}},\n\nLeuk dat we hebben gesproken. We denken graag verder met je mee — tot in het detail.\n\nHeb je nog iets op je lijst? Mail of bel ons. We zijn er.",
  },
  {
    slug: "offerte",
    naam: "Offerte",
    onderwerp: "Je offerte van Fluweel",
    inhoud:
      "Beste {{naam}},\n\nHierbij onze offerte. Geen copy-paste, wel een voorstel voor een avond die blijft hangen.\n\nBekijk hem in de bijlage of via het portaal. Vragen? We denken scherp met je mee.",
  },
  {
    slug: "factuur",
    naam: "Factuur",
    onderwerp: "Factuur {{nummer}} · Fluweel",
    inhoud:
      "Beste {{naam}},\n\nIn de bijlage vind je factuur {{nummer}}. Zorgvuldig opgesteld, tot in het detail.\n\nVoor vragen over de betaling of de avond zelf: we zijn bereikbaar.",
  },
];

export function getBrandTemplate(slug) {
  return BRAND_TEMPLATES.find((t) => t.slug === slug) || null;
}

export function applyTemplate(text, vars = {}) {
  return String(text ?? "").replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

export function escHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paragraphsFromText(text) {
  return String(text || "")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => block.replace(/\n/g, "<br>"));
}

/**
 * @param {{ kicker?: string, title?: string, text: string, extra?: string, cta?: { label: string, url: string } }} opts
 * @returns {{ html: string, text: string }}
 */
export function composeEmail({ kicker = "", title = "", text, extra = "", cta } = {}) {
  const { kleuren } = BRAND;
  const extraTrim = String(extra || "").trim();
  const blocks = paragraphsFromText(text);
  const extraHtml = extraTrim
    ? `<tr><td style="padding:0 40px 22px;">
        <div style="border-left:3px solid ${kleuren.fuchsia};padding:2px 0 2px 16px;font-family:Georgia,'Newsreader',serif;font-size:17px;line-height:1.45;color:${kleuren.aubergine};font-style:italic;">
          ${escHtml(extraTrim).replace(/\n/g, "<br>")}
        </div>
      </td></tr>`
    : "";

  const bodyHtml = blocks
    .map(
      (p) =>
        `<tr><td style="padding:0 40px 16px;font-family:Georgia,'Newsreader',serif;font-size:17px;line-height:1.55;color:${kleuren.inkt};">${p}</td></tr>`
    )
    .join("");

  const ctaHtml = cta?.url
    ? `<tr><td style="padding:8px 40px 28px;">
        <a href="${escHtml(cta.url)}" style="display:inline-block;background:${kleuren.fuchsia};color:${kleuren.wit};font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:500;text-decoration:none;padding:14px 22px;border-radius:4px;">
          ${escHtml(cta.label || "Openen")}
        </a>
      </td></tr>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escHtml(title || BRAND.merk)}</title>
</head>
<body style="margin:0;padding:0;background:${kleuren.ivoor};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${kleuren.ivoor};">
    <tr>
      <td align="center" style="padding:36px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:${kleuren.wit};border:1px solid ${kleuren.lijn};">
          <tr><td style="height:8px;background:${kleuren.aubergine};font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr>
            <td style="padding:28px 40px 8px;">
              <p style="margin:0;font-family:Georgia,'Newsreader',serif;font-size:26px;line-height:1;color:${kleuren.inkt};">
                Fluweel<span style="color:${kleuren.fuchsia};">.</span>
              </p>
              <p style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:${kleuren.fuchsia};">
                ${escHtml(kicker || BRAND.tagline)}
              </p>
            </td>
          </tr>
          ${title ? `<tr><td style="padding:12px 40px 20px;font-family:Georgia,'Newsreader',serif;font-size:28px;line-height:1.2;color:${kleuren.inkt};">${escHtml(title)}</td></tr>` : ""}
          ${extraHtml}
          ${bodyHtml}
          ${ctaHtml}
          <tr>
            <td style="padding:8px 40px 32px;border-top:1px solid ${kleuren.lijn};">
              <p style="margin:18px 0 6px;font-family:Georgia,'Newsreader',serif;font-style:italic;font-size:16px;color:${kleuren.aubergine};">
                ${escHtml(BRAND.tagline)}
              </p>
              <p style="margin:0;font-family:Georgia,'Newsreader',serif;font-size:18px;color:${kleuren.inkt};">
                Fluweel<span style="color:${kleuren.fuchsia};">.</span>
              </p>
              <p style="margin:14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${kleuren.mauve};">
                <a href="mailto:${BRAND.email}" style="color:${kleuren.mauve};text-decoration:none;">${BRAND.email}</a>
                &nbsp;·&nbsp;
                <a href="${BRAND.site}" style="color:${kleuren.mauve};text-decoration:none;">fluweelevents.nl</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const plain = [
    extraTrim,
    String(text || "").trim(),
    cta?.url ? `${cta.label || "Openen"}: ${cta.url}` : "",
    BRAND.tagline,
    "Fluweel.",
    BRAND.email,
  ]
    .filter(Boolean)
    .join("\n\n");

  return { html, text: plain };
}

export function formatNlNumber(n, decimals = 2) {
  const value = Number(n || 0);
  if (!Number.isFinite(value)) return decimals > 0 ? "0," + "0".repeat(decimals) : "0";
  const neg = value < 0;
  const [intRaw, fracRaw] = Math.abs(value).toFixed(decimals).split(".");
  const intPart = intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const body = decimals > 0 ? `${intPart},${fracRaw}` : intPart;
  return (neg ? "-" : "") + body;
}

export function euro(n, decimals = 2) {
  return `€ ${formatNlNumber(n, decimals)}`;
}

export function formatNlDate(iso) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("nl-NL", { dateStyle: "long" }).format(new Date(iso));
  } catch {
    return String(iso);
  }
}

export function formatNlDateTime(iso) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return String(iso);
  }
}
