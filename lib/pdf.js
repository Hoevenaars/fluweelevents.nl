import PDFDocument from "pdfkit";
import { BRAND, euro, formatNlDate } from "./brand.js";

const { kleuren } = BRAND;
const PAGE = { size: "A4", margin: 0 };
const M = { l: 56, r: 56, t: 48, b: 64 };

function paintPage(doc) {
  const { width, height } = doc.page;
  doc.save();
  doc.rect(0, 0, width, height).fill(kleuren.ivoor);
  doc.rect(0, 0, width, 8).fill(kleuren.aubergine);
  doc.rect(0, height - 42, width, 42).fill(kleuren.vlak);
  doc.fillColor(kleuren.mauve).font("Times-Italic").fontSize(9);
  doc.text(BRAND.tagline, M.l, height - 30, { width: 280, lineBreak: false });
  doc.font("Times-Roman").fillColor(kleuren.aubergine);
  doc.text("Fluweel.", width - M.r - 120, height - 30, { width: 120, align: "right", lineBreak: false });
  doc.restore();
}

function writeMerk(doc, x, y) {
  doc.font("Times-Roman").fontSize(26).fillColor(kleuren.inkt).text("Fluweel", x, y, { continued: true, lineBreak: false });
  doc.fillColor(kleuren.fuchsia).text(".", { lineBreak: false });
  return y + 34;
}

function writeKicker(doc, label, x, y) {
  doc.font("Helvetica").fontSize(8).fillColor(kleuren.fuchsia);
  doc.text(String(label || "").toUpperCase(), x, y, { characterSpacing: 2.2 });
  return y + 16;
}

function hr(doc, y, color = kleuren.lijn) {
  doc.save();
  doc.moveTo(M.l, y).lineTo(doc.page.width - M.r, y).lineWidth(1).strokeColor(color).stroke();
  doc.restore();
  return y + 14;
}

function writeParty(doc, y, { naam, bedrijf, email, extra = [] }) {
  doc.font("Times-Roman").fontSize(12).fillColor(kleuren.inkt).text(naam || "", M.l, y);
  y = doc.y + 2;
  if (bedrijf) {
    doc.font("Helvetica").fontSize(10).fillColor(kleuren.mauve).text(bedrijf, M.l, y);
    y = doc.y + 2;
  }
  if (email) {
    doc.font("Helvetica").fontSize(10).fillColor(kleuren.mauve).text(email, M.l, y);
    y = doc.y + 2;
  }
  for (const line of extra.filter(Boolean)) {
    doc.font("Helvetica").fontSize(10).fillColor(kleuren.mauve).text(line, M.l, y);
    y = doc.y + 2;
  }
  return y + 10;
}

function writeRegels(doc, startY, regels = []) {
  let y = startY;
  const col = {
    omschr: M.l,
    aantal: 350,
    prijs: 410,
    totaal: 470,
  };
  const right = doc.page.width - M.r;

  doc.font("Helvetica").fontSize(8).fillColor(kleuren.mauve);
  doc.text("OMSCHRIJVING", col.omschr, y, { characterSpacing: 1.2 });
  doc.text("AANTAL", col.aantal, y, { width: 50, align: "right", characterSpacing: 1.2 });
  doc.text("PRIJS", col.prijs, y, { width: 50, align: "right", characterSpacing: 1.2 });
  doc.text("TOTAAL", col.totaal, y, { width: right - col.totaal, align: "right", characterSpacing: 1.2 });
  y = hr(doc, y + 14, kleuren.champagne);

  for (const r of regels) {
    if (y > doc.page.height - 140) {
      doc.addPage();
      y = M.t + 24;
    }
    const lineTotal = Number(r.aantal || 0) * Number(r.prijs || 0);
    const rowTop = y;
    doc.font("Times-Roman").fontSize(11).fillColor(kleuren.inkt);
    doc.text(r.omschrijving || "", col.omschr, rowTop, { width: 270 });
    const after = doc.y;
    doc.font("Helvetica").fontSize(10).fillColor(kleuren.inkt);
    doc.text(String(r.aantal ?? ""), col.aantal, rowTop, { width: 50, align: "right" });
    doc.text(euro(r.prijs), col.prijs, rowTop, { width: 50, align: "right" });
    doc.text(euro(lineTotal), col.totaal, rowTop, { width: right - col.totaal, align: "right" });
    y = Math.max(after, rowTop + 16) + 8;
  }

  return hr(doc, y, kleuren.lijn);
}

function writeTotals(doc, y, { subtotaal, btwPct, btwBedrag, totaal }) {
  const right = doc.page.width - M.r;
  const labelX = 350;
  const valueW = right - 410;
  const valueX = 410;

  doc.font("Helvetica").fontSize(10).fillColor(kleuren.mauve);
  doc.text("Subtotaal", labelX, y, { width: 55 });
  doc.fillColor(kleuren.inkt).text(euro(subtotaal), valueX, y, { width: valueW, align: "right" });
  y += 16;
  doc.fillColor(kleuren.mauve).text(`BTW ${btwPct || 21}%`, labelX, y, { width: 70 });
  doc.fillColor(kleuren.inkt).text(euro(btwBedrag), valueX, y, { width: valueW, align: "right" });
  y += 22;
  doc.font("Times-Roman").fontSize(16).fillColor(kleuren.fuchsia);
  doc.text("Totaal", labelX, y, { width: 55 });
  doc.text(euro(totaal), valueX, y, { width: valueW, align: "right" });
  return y + 28;
}

function createBrandedDoc() {
  const doc = new PDFDocument(PAGE);
  paintPage(doc);
  doc.on("pageAdded", () => paintPage(doc));
  return doc;
}

function toBuffer(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

export function generateQuotePdf(quote) {
  const doc = createBrandedDoc();
  const done = toBuffer(doc);

  let y = M.t + 18;
  y = writeMerk(doc, M.l, y);
  y = writeKicker(doc, "Offerte", M.l, y + 4);
  doc.font("Times-Roman").fontSize(22).fillColor(kleuren.inkt).text(quote.nummer || "Offerte", M.l, y);
  y = doc.y + 6;
  if (quote.geldigTot) {
    doc.font("Helvetica").fontSize(10).fillColor(kleuren.mauve).text(`Geldig tot ${formatNlDate(quote.geldigTot)}`, M.l, y);
    y = doc.y + 12;
  } else {
    y += 10;
  }

  y = writeParty(doc, y, {
    naam: quote.klantNaam,
    bedrijf: quote.klantBedrijf,
    email: quote.klantEmail,
  });

  doc.font("Times-Italic").fontSize(12).fillColor(kleuren.aubergine);
  doc.text("Geen copy-paste. Wel een voorstel voor een avond die blijft hangen.", M.l, y, {
    width: doc.page.width - M.l - M.r,
  });
  y = doc.y + 18;

  y = writeRegels(doc, y, quote.regels || []);
  y = writeTotals(doc, y + 4, {
    subtotaal: quote.subtotaal,
    btwPct: quote.btwPct,
    btwBedrag: quote.btwBedrag,
    totaal: quote.totaal,
  });

  if (quote.notities) {
    doc.font("Times-Italic").fontSize(11).fillColor(kleuren.mauve);
    doc.text(quote.notities, M.l, y, { width: doc.page.width - M.l - M.r });
  }

  doc.end();
  return done;
}

export function generateInvoicePdf(invoice) {
  const doc = createBrandedDoc();
  const done = toBuffer(doc);

  let y = M.t + 18;
  y = writeMerk(doc, M.l, y);
  y = writeKicker(doc, "Factuur", M.l, y + 4);
  doc.font("Times-Roman").fontSize(22).fillColor(kleuren.inkt).text(invoice.nummer || "Factuur", M.l, y);
  y = doc.y + 6;
  const extras = [];
  if (invoice.vervaldatum) extras.push(`Vervaldatum ${formatNlDate(invoice.vervaldatum)}`);
  if (invoice.status) extras.push(`Status: ${invoice.status}`);
  y = writeParty(doc, y + 6, {
    naam: invoice.klantNaam,
    bedrijf: invoice.klantBedrijf,
    email: invoice.klantEmail,
    extra: extras,
  });

  doc.font("Times-Italic").fontSize(12).fillColor(kleuren.aubergine);
  doc.text("Zorgvuldig opgesteld, tot in het detail.", M.l, y, {
    width: doc.page.width - M.l - M.r,
  });
  y = doc.y + 18;

  y = writeRegels(doc, y, invoice.regels || []);
  writeTotals(doc, y + 4, {
    subtotaal: invoice.subtotaal ?? invoice.totaal,
    btwPct: invoice.btwPct ?? 21,
    btwBedrag: invoice.btwBedrag ?? 0,
    totaal: invoice.totaal,
  });

  const payY = doc.page.height - 110;
  doc.font("Helvetica").fontSize(9).fillColor(kleuren.mauve);
  doc.text("Betaling binnen 14 dagen. Vragen? Mail contact@fluweelevents.nl.", M.l, payY, {
    width: doc.page.width - M.l - M.r,
  });

  doc.end();
  return done;
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
