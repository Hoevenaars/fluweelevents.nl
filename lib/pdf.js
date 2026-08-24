import PDFDocument from "pdfkit";

export function generateQuotePdf(quote) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(22).fillColor("#5B2A4E").text("Fluweel Events", { continued: false });
    doc.fontSize(10).fillColor("#7A5E6E").text("Meer dan een evenement. Een herinnering.");
    doc.moveDown(1.5);

    doc.fontSize(18).fillColor("#2A1322").text(`Offerte ${quote.nummer}`);
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor("#2A1322");
    doc.text(`Klant: ${quote.klantNaam}`);
    if (quote.klantBedrijf) doc.text(`Bedrijf: ${quote.klantBedrijf}`);
    doc.text(`E-mail: ${quote.klantEmail}`);
    if (quote.geldigTot) doc.text(`Geldig tot: ${quote.geldigTot}`);
    doc.moveDown(1);

    doc.fontSize(10).fillColor("#7A5E6E");
    doc.text("Omschrijving", 50, doc.y, { width: 280, continued: true });
    doc.text("Aantal", 330, doc.y - doc.currentLineHeight(), { width: 60, continued: true });
    doc.text("Prijs", 390, doc.y - doc.currentLineHeight(), { width: 60, continued: true });
    doc.text("Totaal", 450, doc.y - doc.currentLineHeight());
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke("#E3D5C9");
    doc.moveDown(0.5);

    doc.fillColor("#2A1322");
    for (const r of quote.regels || []) {
      const lineTotal = (r.aantal * r.prijs).toFixed(2);
      doc.text(r.omschrijving, 50, doc.y, { width: 280 });
      const y = doc.y - doc.currentLineHeight();
      doc.text(String(r.aantal), 330, y, { width: 60 });
      doc.text(`€ ${r.prijs.toFixed(2)}`, 390, y, { width: 60 });
      doc.text(`€ ${lineTotal}`, 450, y);
      doc.moveDown(0.4);
    }

    doc.moveDown(1);
    doc.text(`Subtotaal: € ${quote.subtotaal.toFixed(2)}`, { align: "right" });
    doc.text(`BTW (${quote.btwPct}%): € ${quote.btwBedrag.toFixed(2)}`, { align: "right" });
    doc.fontSize(13).fillColor("#C81E63").text(`Totaal: € ${quote.totaal.toFixed(2)}`, { align: "right" });

    if (quote.notities) {
      doc.moveDown(1.5).fontSize(10).fillColor("#7A5E6E").text(quote.notities);
    }

    doc.end();
  });
}

export function generateInvoicePdf(invoice) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(22).fillColor("#5B2A4E").text("Fluweel Events");
    doc.fontSize(10).fillColor("#7A5E6E").text("Fluweel Events · contact@fluweelevents.nl");
    doc.moveDown(1.5);

    doc.fontSize(18).fillColor("#2A1322").text(`Factuur ${invoice.nummer}`);
    doc.moveDown(0.5);
    doc.fontSize(11).text(`Klant: ${invoice.klantNaam}`);
    if (invoice.klantBedrijf) doc.text(`Bedrijf: ${invoice.klantBedrijf}`);
    doc.text(`E-mail: ${invoice.klantEmail}`);
    if (invoice.vervaldatum) doc.text(`Vervaldatum: ${invoice.vervaldatum}`);
    doc.moveDown(1);

    for (const r of invoice.regels || []) {
      doc.text(`${r.omschrijving} — ${r.aantal} × € ${r.prijs.toFixed(2)} = € ${(r.aantal * r.prijs).toFixed(2)}`);
    }

    doc.moveDown(1);
    doc.text(`Totaal incl. BTW: € ${invoice.totaal.toFixed(2)}`, { align: "right" });
    doc.end();
  });
}

export function generateIcs({ titel, omschrijving, start, end }) {
  const fmt = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const s = start || new Date();
  const e = end || new Date(s.getTime() + 3600000);
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Fluweel Events//CRM//NL", "BEGIN:VEVENT",
    `UID:${Date.now()}@fluweelevents.nl`, `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(s)}`, `DTEND:${fmt(e)}`,
    `SUMMARY:${titel}`, `DESCRIPTION:${(omschrijving || "").replace(/\n/g, "\\n")}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}
