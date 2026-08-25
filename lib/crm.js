import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { randomUUID, randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeStatus } from "./phases.js";
import { getServiceClient, isSupabaseConfigured } from "./supabase.js";
import { BRAND_TEMPLATES, applyTemplate as applyBrandTemplate } from "./brand.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CRM_FILE = join(ROOT, ".data", "crm.json");
const LEGACY_FILE = join(ROOT, ".data", "submissions.json");

const DEFAULT_TEMPLATES = BRAND_TEMPLATES.map((t) => ({ ...t }));

const DEFAULT_WEBSITE = {
  hero_titel: "Meer dan een evenement. Een herinnering.",
  hero_intro: "Wij ontwerpen zakelijke belevenissen die gasten raken en merken versterken.",
  contact_titel: "Klaar voor een avond die blijft hangen?",
};

function emptyDb() {
  return {
    leads: [],
    activities: [],
    tasks: [],
    templates: DEFAULT_TEMPLATES.map((t) => ({ ...t, id: randomUUID(), aangemaaktOp: new Date().toISOString() })),
    quotes: [],
    quoteLines: [],
    invoices: [],
    invoiceLines: [],
    projects: [],
    campaigns: [],
    campaignSends: [],
    website: { ...DEFAULT_WEBSITE },
    counters: { quote: 1, invoice: 1 },
  };
}

function nowIso() {
  return new Date().toISOString();
}

function num(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

function calcTotals(lines, btwPct = 21) {
  const subtotaal = num(lines.reduce((s, l) => s + num(l.aantal) * num(l.prijs), 0));
  const btw_bedrag = num(subtotaal * (btwPct / 100));
  return { subtotaal, btw_pct: btwPct, btw_bedrag, totaal: num(subtotaal + btw_bedrag) };
}

function applyTemplate(text, vars) {
  return applyBrandTemplate(text, vars);
}

// ===== LOCAL DB =====
async function readLocalDb() {
  if (!existsSync(CRM_FILE) && existsSync(LEGACY_FILE)) {
    const legacy = JSON.parse(await readFile(LEGACY_FILE, "utf8"));
    const db = emptyDb();
    db.leads = (Array.isArray(legacy) ? legacy : []).map((l) => ({
      id: l.id,
      naam: l.naam,
      email: l.email,
      telefoon: l.telefoon || null,
      bedrijf: l.bedrijf || null,
      bericht: l.bericht,
      bron: l.bron || "website",
      status: normalizeStatus(l.status),
      notities: l.notities || "",
      toegewezenAan: l.toegewezenAan || null,
      gelezen: Boolean(l.gelezen),
      ontvangenOp: l.ontvangenOp || nowIso(),
    }));
    await writeLocalDb(db);
    return db;
  }
  if (!existsSync(CRM_FILE)) return emptyDb();
  try {
    const db = JSON.parse(await readFile(CRM_FILE, "utf8"));
    if (!db.templates?.length) db.templates = emptyDb().templates;
    if (!db.website) db.website = { ...DEFAULT_WEBSITE };
    if (!db.counters) db.counters = { quote: 1, invoice: 1 };
    return db;
  } catch {
    return emptyDb();
  }
}

async function writeLocalDb(db) {
  await mkdir(dirname(CRM_FILE), { recursive: true });
  await writeFile(CRM_FILE, JSON.stringify(db, null, 2), "utf8");
}

function mapLead(row) {
  return {
    id: row.id,
    naam: row.naam,
    email: row.email,
    telefoon: row.telefoon,
    bedrijf: row.bedrijf,
    bericht: row.bericht,
    bron: row.bron,
    status: normalizeStatus(row.status),
    notities: row.notities || "",
    toegewezenAan: row.toegewezen_aan ?? row.toegewezenAan,
    gelezen: row.gelezen,
    ontvangenOp: row.ontvangen_op ?? row.ontvangenOp,
  };
}

function mapQuote(row, lines = []) {
  return {
    id: row.id,
    leadId: row.lead_id ?? row.leadId,
    nummer: row.nummer,
    klantNaam: row.klant_naam ?? row.klantNaam,
    klantEmail: row.klant_email ?? row.klantEmail,
    klantBedrijf: row.klant_bedrijf ?? row.klantBedrijf,
    status: row.status,
    geldigTot: row.geldig_tot ?? row.geldigTot,
    subtotaal: num(row.subtotaal),
    btwPct: num(row.btw_pct ?? row.btwPct ?? 21),
    btwBedrag: num(row.btw_bedrag ?? row.btwBedrag),
    totaal: num(row.totaal),
    notities: row.notities || "",
    portalToken: row.portal_token ?? row.portalToken,
    aangemaaktOp: row.aangemaakt_op ?? row.aangemaaktOp,
    regels: lines.map(mapQuoteLine),
  };
}

function mapQuoteLine(row) {
  return {
    id: row.id,
    quoteId: row.quote_id ?? row.quoteId,
    omschrijving: row.omschrijving,
    aantal: num(row.aantal),
    prijs: num(row.prijs),
    sortOrder: row.sort_order ?? row.sortOrder ?? 0,
  };
}

function mapInvoice(row, lines = []) {
  return {
    id: row.id,
    quoteId: row.quote_id ?? row.quoteId,
    leadId: row.lead_id ?? row.leadId,
    nummer: row.nummer,
    klantNaam: row.klant_naam ?? row.klantNaam,
    klantEmail: row.klant_email ?? row.klantEmail,
    klantBedrijf: row.klant_bedrijf ?? row.klantBedrijf,
    status: row.status,
    vervaldatum: row.vervaldatum,
    subtotaal: num(row.subtotaal),
    btwPct: num(row.btw_pct ?? row.btwPct ?? 21),
    btwBedrag: num(row.btw_bedrag ?? row.btwBedrag),
    totaal: num(row.totaal),
    notities: row.notities || "",
    aangemaaktOp: row.aangemaakt_op ?? row.aangemaaktOp,
    regels: lines.map((l) => ({
      id: l.id,
      invoiceId: l.invoice_id ?? l.invoiceId,
      omschrijving: l.omschrijving,
      aantal: num(l.aantal),
      prijs: num(l.prijs),
      sortOrder: l.sort_order ?? l.sortOrder ?? 0,
    })),
  };
}

function mapProject(row) {
  return {
    id: row.id,
    leadId: row.lead_id ?? row.leadId,
    naam: row.naam,
    klantNaam: row.klant_naam ?? row.klantNaam,
    klantEmail: row.klant_email ?? row.klantEmail,
    eventDatum: row.event_datum ?? row.eventDatum,
    locatie: row.locatie,
    aantalGasten: row.aantal_gasten ?? row.aantalGasten,
    budget: row.budget != null ? num(row.budget) : null,
    status: row.status,
    draaiboek: row.draaiboek || "",
    moodboardUrls: row.moodboard_urls ?? row.moodboardUrls ?? [],
    aangemaaktOp: row.aangemaakt_op ?? row.aangemaaktOp,
  };
}

async function nextNumber(kind) {
  const year = new Date().getFullYear();
  const prefix = kind === "quote" ? "OFF" : "FAC";
  const supabase = getServiceClient();
  if (supabase) {
    const table = kind === "quote" ? "quotes" : "invoices";
    const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
    return `${prefix}-${year}-${String((count || 0) + 1).padStart(3, "0")}`;
  }
  const db = await readLocalDb();
  const n = db.counters[kind]++;
  await writeLocalDb(db);
  return `${prefix}-${year}-${String(n).padStart(3, "0")}`;
}

// ===== LEADS =====
export async function addLead({ naam, email, telefoon, bericht, bron = "website", bedrijf = null }) {
  const supabase = getServiceClient();
  if (supabase) {
    const { data, error } = await supabase.from("contact_submissions").insert({
      naam, email, telefoon, bericht, bron, bedrijf, status: "nieuw",
    }).select().single();
    if (error) throw error;
    await addActivity({ leadId: data.id, type: "systeem", titel: "Aanvraag ontvangen", omschrijving: `Via ${bron}` });
    return mapLead(data);
  }
  const db = await readLocalDb();
  const lead = {
    id: randomUUID(), naam, email, telefoon: telefoon || null, bedrijf,
    bericht, bron, status: "nieuw", notities: "", toegewezenAan: null,
    gelezen: false, ontvangenOp: nowIso(),
  };
  db.leads.unshift(lead);
  db.activities.unshift({
    id: randomUUID(), leadId: lead.id, type: "systeem",
    titel: "Aanvraag ontvangen", omschrijving: `Via ${bron}`,
    door: null, aangemaaktOp: nowIso(),
  });
  await writeLocalDb(db);
  return lead;
}

export async function listLeads() {
  const supabase = getServiceClient();
  if (supabase) {
    const { data, error } = await supabase.from("contact_submissions").select("*").order("ontvangen_op", { ascending: false });
    if (error) throw error;
    return (data || []).map(mapLead);
  }
  const db = await readLocalDb();
  return db.leads.sort((a, b) => new Date(b.ontvangenOp) - new Date(a.ontvangenOp));
}

export async function getLead(id) {
  const leads = await listLeads();
  return leads.find((l) => l.id === id) || null;
}

export async function updateLead(id, updates = {}) {
  const patch = {};
  if (updates.status) patch.status = normalizeStatus(updates.status);
  if (typeof updates.notities === "string") patch.notities = updates.notities;
  if (typeof updates.gelezen === "boolean") patch.gelezen = updates.gelezen;
  if (updates.toegewezenAan !== undefined) patch.toegewezen_aan = updates.toegewezenAan;
  if (updates.bedrijf !== undefined) patch.bedrijf = updates.bedrijf;

  const supabase = getServiceClient();
  if (supabase) {
    const { data, error } = await supabase.from("contact_submissions").update(patch).eq("id", id).select().single();
    if (error) throw error;
    const lead = mapLead(data);
    if (updates.status) {
      await addActivity({ leadId: id, type: "status", titel: `Fase: ${updates.status}`, omschrijving: "" });
      if (updates.status === "gewonnen") await ensureProjectForLead(lead);
    }
    return lead;
  }
  const db = await readLocalDb();
  const idx = db.leads.findIndex((l) => l.id === id);
  if (idx === -1) return null;
  // Only apply defined fields — spreading raw `{ bedrijf: undefined }` would wipe values on JSON save.
  const localPatch = {};
  if (updates.status) localPatch.status = normalizeStatus(updates.status);
  if (typeof updates.notities === "string") localPatch.notities = updates.notities;
  if (typeof updates.gelezen === "boolean") localPatch.gelezen = updates.gelezen;
  if (updates.toegewezenAan !== undefined) localPatch.toegewezenAan = updates.toegewezenAan;
  if (updates.bedrijf !== undefined) localPatch.bedrijf = updates.bedrijf;
  db.leads[idx] = { ...db.leads[idx], ...localPatch };
  if (updates.status === "gewonnen") await ensureProjectForLead(db.leads[idx], db);
  await writeLocalDb(db);
  return db.leads[idx];
}

// Backward compat
export const addSubmission = addLead;
export const listSubmissions = listLeads;
export const updateSubmission = updateLead;

// ===== ACTIVITIES =====
export async function listActivities(leadId) {
  const supabase = getServiceClient();
  if (supabase) {
    const { data, error } = await supabase.from("activities").select("*").eq("lead_id", leadId).order("aangemaakt_op", { ascending: false });
    if (error) throw error;
    return (data || []).map((a) => ({
      id: a.id, leadId: a.lead_id, type: a.type, titel: a.titel,
      omschrijving: a.omschrijving, door: a.door, aangemaaktOp: a.aangemaakt_op,
    }));
  }
  const db = await readLocalDb();
  return db.activities.filter((a) => a.leadId === leadId).sort((a, b) => new Date(b.aangemaaktOp) - new Date(a.aangemaaktOp));
}

export async function addActivity({ leadId, type = "notitie", titel, omschrijving = "", door = null }) {
  const supabase = getServiceClient();
  if (supabase) {
    const { data, error } = await supabase.from("activities").insert({
      lead_id: leadId, type, titel, omschrijving, door,
    }).select().single();
    if (error) throw error;
    return { id: data.id, leadId, type, titel, omschrijving, door, aangemaaktOp: data.aangemaakt_op };
  }
  const db = await readLocalDb();
  const act = { id: randomUUID(), leadId, type, titel, omschrijving, door, aangemaaktOp: nowIso() };
  db.activities.unshift(act);
  await writeLocalDb(db);
  return act;
}

// ===== TASKS =====
export async function listTasks({ leadId, today = false } = {}) {
  const supabase = getServiceClient();
  if (supabase) {
    let q = supabase.from("tasks").select("*").order("deadline", { ascending: true });
    if (leadId) q = q.eq("lead_id", leadId);
    const { data, error } = await q;
    if (error) throw error;
    let tasks = (data || []).map(mapTask);
    if (today) {
      const d = new Date().toISOString().slice(0, 10);
      tasks = tasks.filter((t) => t.deadline && t.deadline <= d && !t.voltooid);
    }
    return tasks;
  }
  const db = await readLocalDb();
  let tasks = db.tasks;
  if (leadId) tasks = tasks.filter((t) => t.leadId === leadId);
  if (today) {
    const d = new Date().toISOString().slice(0, 10);
    tasks = tasks.filter((t) => t.deadline && t.deadline <= d && !t.voltooid);
  }
  return tasks.sort((a, b) => (a.deadline || "").localeCompare(b.deadline || ""));
}

function mapTask(row) {
  return {
    id: row.id,
    leadId: row.lead_id ?? row.leadId,
    projectId: row.project_id ?? row.projectId,
    titel: row.titel,
    omschrijving: row.omschrijving || "",
    deadline: row.deadline,
    voltooid: row.voltooid,
    toegewezenAan: row.toegewezen_aan ?? row.toegewezenAan,
    aangemaaktOp: row.aangemaakt_op ?? row.aangemaaktOp,
  };
}

export async function createTask(data) {
  const supabase = getServiceClient();
  if (supabase) {
    const { data: row, error } = await supabase.from("tasks").insert({
      lead_id: data.leadId || null,
      project_id: data.projectId || null,
      titel: data.titel,
      omschrijving: data.omschrijving || "",
      deadline: data.deadline || null,
      toegewezen_aan: data.toegewezenAan || null,
    }).select().single();
    if (error) throw error;
    return mapTask(row);
  }
  const db = await readLocalDb();
  const task = { id: randomUUID(), ...data, voltooid: false, aangemaaktOp: nowIso() };
  db.tasks.unshift(task);
  await writeLocalDb(db);
  return task;
}

export async function updateTask(id, updates) {
  const patch = {};
  if (updates.titel) patch.titel = updates.titel;
  if (updates.omschrijving !== undefined) patch.omschrijving = updates.omschrijving;
  if (updates.deadline !== undefined) patch.deadline = updates.deadline;
  if (typeof updates.voltooid === "boolean") patch.voltooid = updates.voltooid;
  if (updates.toegewezenAan !== undefined) patch.toegewezen_aan = updates.toegewezenAan;

  const supabase = getServiceClient();
  if (supabase) {
    const { data, error } = await supabase.from("tasks").update(patch).eq("id", id).select().single();
    if (error) throw error;
    return mapTask(data);
  }
  const db = await readLocalDb();
  const idx = db.tasks.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  db.tasks[idx] = { ...db.tasks[idx], ...updates };
  await writeLocalDb(db);
  return db.tasks[idx];
}

// ===== TEMPLATES =====
export async function listTemplates() {
  const supabase = getServiceClient();
  if (supabase) {
    const { data, error } = await supabase.from("email_templates").select("*").order("naam");
    if (error) throw error;
    const rows = (data || []).map((t) => ({
      id: t.id, slug: t.slug, naam: t.naam, onderwerp: t.onderwerp, inhoud: t.inhoud, aangemaaktOp: t.aangemaakt_op,
    }));
    return overlayBrandTemplates(rows);
  }
  return overlayBrandTemplates((await readLocalDb()).templates);
}

function overlayBrandTemplates(templates) {
  const bySlug = new Map((templates || []).map((t) => [t.slug, t]));
  for (const branded of BRAND_TEMPLATES) {
    const existing = bySlug.get(branded.slug);
    bySlug.set(branded.slug, existing ? { ...existing, ...branded } : { ...branded });
  }
  return [...bySlug.values()];
}

export async function getTemplate(slug) {
  const templates = await listTemplates();
  return templates.find((t) => t.slug === slug) || null;
}

// ===== QUOTES =====
export async function listQuotes() {
  const supabase = getServiceClient();
  if (supabase) {
    const { data, error } = await supabase.from("quotes").select("*").order("aangemaakt_op", { ascending: false });
    if (error) throw error;
    const quotes = await Promise.all((data || []).map(async (q) => {
      const { data: lines } = await supabase.from("quote_lines").select("*").eq("quote_id", q.id).order("sort_order");
      return mapQuote(q, lines || []);
    }));
    return quotes;
  }
  const db = await readLocalDb();
  return db.quotes.map((q) => ({
    ...q,
    regels: db.quoteLines.filter((l) => l.quoteId === q.id).sort((a, b) => a.sortOrder - b.sortOrder),
  })).sort((a, b) => new Date(b.aangemaaktOp) - new Date(a.aangemaaktOp));
}

export async function getQuote(id) {
  const quotes = await listQuotes();
  return quotes.find((q) => q.id === id) || null;
}

export async function getQuoteByToken(token) {
  const supabase = getServiceClient();
  if (supabase) {
    const { data, error } = await supabase.from("quotes").select("*").eq("portal_token", token).single();
    if (error) return null;
    const { data: lines } = await supabase.from("quote_lines").select("*").eq("quote_id", data.id).order("sort_order");
    return mapQuote(data, lines || []);
  }
  const db = await readLocalDb();
  const q = db.quotes.find((x) => x.portalToken === token);
  if (!q) return null;
  return { ...q, regels: db.quoteLines.filter((l) => l.quoteId === q.id) };
}

export async function createQuote({ leadId, klantNaam, klantEmail, klantBedrijf, regels = [], geldigTot, notities = "" }) {
  const nummer = await nextNumber("quote");
  const totals = calcTotals(regels);
  const portalToken = randomBytes(16).toString("hex");

  const supabase = getServiceClient();
  if (supabase) {
    const { data: q, error } = await supabase.from("quotes").insert({
      lead_id: leadId || null, nummer, klant_naam: klantNaam, klant_email: klantEmail,
      klant_bedrijf: klantBedrijf || null, geldig_tot: geldigTot || null, notities, portal_token: portalToken,
      ...totals, btw_pct: totals.btw_pct,
    }).select().single();
    if (error) throw error;
    if (regels.length) {
      await supabase.from("quote_lines").insert(regels.map((r, i) => ({
        quote_id: q.id, omschrijving: r.omschrijving, aantal: r.aantal, prijs: r.prijs, sort_order: i,
      })));
    }
    if (leadId) await updateLead(leadId, { status: "offerte", gelezen: true });
    return getQuote(q.id);
  }
  const db = await readLocalDb();
  const quote = {
    id: randomUUID(), leadId, nummer, klantNaam, klantEmail, klantBedrijf,
    status: "concept", geldigTot, notities, portalToken, aangemaaktOp: nowIso(), ...totals, btwPct: totals.btw_pct, btwBedrag: totals.btw_bedrag, regels: [],
  };
  db.quotes.unshift(quote);
  regels.forEach((r, i) => db.quoteLines.push({ id: randomUUID(), quoteId: quote.id, ...r, sortOrder: i }));
  if (leadId) {
    const idx = db.leads.findIndex((l) => l.id === leadId);
    if (idx !== -1) db.leads[idx].status = "offerte";
  }
  await writeLocalDb(db);
  return { ...quote, regels };
}

export async function updateQuote(id, updates) {
  const supabase = getServiceClient();
  const patch = {};
  if (updates.status) patch.status = updates.status;
  if (updates.notities !== undefined) patch.notities = updates.notities;
  if (updates.geldigTot !== undefined) patch.geldig_tot = updates.geldigTot;

  if (supabase) {
    if (updates.regels) {
      const totals = calcTotals(updates.regels, updates.btwPct || 21);
      Object.assign(patch, totals, { btw_pct: totals.btw_pct });
      await supabase.from("quote_lines").delete().eq("quote_id", id);
      await supabase.from("quote_lines").insert(updates.regels.map((r, i) => ({
        quote_id: id, omschrijving: r.omschrijving, aantal: r.aantal, prijs: r.prijs, sort_order: i,
      })));
    }
    const { error } = await supabase.from("quotes").update(patch).eq("id", id);
    if (error) throw error;
    return getQuote(id);
  }
  const db = await readLocalDb();
  const idx = db.quotes.findIndex((q) => q.id === id);
  if (idx === -1) return null;
  if (updates.regels) {
    const totals = calcTotals(updates.regels);
    db.quotes[idx] = { ...db.quotes[idx], ...totals, btwPct: totals.btw_pct, btwBedrag: totals.btw_bedrag };
    db.quoteLines = db.quoteLines.filter((l) => l.quoteId !== id);
    updates.regels.forEach((r, i) => db.quoteLines.push({ id: randomUUID(), quoteId: id, ...r, sortOrder: i }));
  }
  db.quotes[idx] = { ...db.quotes[idx], ...updates };
  await writeLocalDb(db);
  return getQuote(id);
}

// ===== INVOICES =====
export async function listInvoices() {
  const supabase = getServiceClient();
  if (supabase) {
    const { data, error } = await supabase.from("invoices").select("*").order("aangemaakt_op", { ascending: false });
    if (error) throw error;
    return Promise.all((data || []).map(async (inv) => {
      const { data: lines } = await supabase.from("invoice_lines").select("*").eq("invoice_id", inv.id).order("sort_order");
      return mapInvoice(inv, lines || []);
    }));
  }
  const db = await readLocalDb();
  return db.invoices.map((inv) => ({
    ...inv,
    regels: db.invoiceLines.filter((l) => l.invoiceId === inv.id),
  })).sort((a, b) => new Date(b.aangemaaktOp) - new Date(a.aangemaaktOp));
}

export async function createInvoiceFromQuote(quoteId) {
  const quote = await getQuote(quoteId);
  if (!quote) return null;
  const nummer = await nextNumber("invoice");
  const verval = new Date(); verval.setDate(verval.getDate() + 14);

  const supabase = getServiceClient();
  if (supabase) {
    const { data: inv, error } = await supabase.from("invoices").insert({
      quote_id: quoteId, lead_id: quote.leadId,
      nummer, klant_naam: quote.klantNaam, klant_email: quote.klantEmail, klant_bedrijf: quote.klantBedrijf,
      vervaldatum: verval.toISOString().slice(0, 10),
      subtotaal: quote.subtotaal, btw_pct: quote.btwPct, btw_bedrag: quote.btwBedrag, totaal: quote.totaal,
    }).select().single();
    if (error) throw error;
    await supabase.from("invoice_lines").insert(quote.regels.map((r, i) => ({
      invoice_id: inv.id, omschrijving: r.omschrijving, aantal: r.aantal, prijs: r.prijs, sort_order: i,
    })));
    return listInvoices().then((all) => all.find((x) => x.id === inv.id));
  }
  const db = await readLocalDb();
  const invoice = {
    id: randomUUID(), quoteId, leadId: quote.leadId, nummer,
    klantNaam: quote.klantNaam, klantEmail: quote.klantEmail, klantBedrijf: quote.klantBedrijf,
    status: "concept", vervaldatum: verval.toISOString().slice(0, 10),
    subtotaal: quote.subtotaal, btwPct: quote.btwPct, btwBedrag: quote.btwBedrag, totaal: quote.totaal,
    notities: "", aangemaaktOp: nowIso(), regels: [],
  };
  db.invoices.unshift(invoice);
  quote.regels.forEach((r, i) => db.invoiceLines.push({ id: randomUUID(), invoiceId: invoice.id, ...r, sortOrder: i }));
  await writeLocalDb(db);
  return { ...invoice, regels: quote.regels };
}

export async function updateInvoice(id, updates) {
  const supabase = getServiceClient();
  if (supabase) {
    const patch = {};
    if (updates.status) patch.status = updates.status;
    const { error } = await supabase.from("invoices").update(patch).eq("id", id);
    if (error) throw error;
    return listInvoices().then((all) => all.find((x) => x.id === id));
  }
  const db = await readLocalDb();
  const idx = db.invoices.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  db.invoices[idx] = { ...db.invoices[idx], ...updates };
  await writeLocalDb(db);
  return {
    ...db.invoices[idx],
    regels: db.invoiceLines.filter((l) => l.invoiceId === id),
  };
}

// ===== PROJECTS =====
async function ensureProjectForLead(lead, dbIn = null) {
  const supabase = getServiceClient();
  if (supabase) {
    const { data: existing } = await supabase.from("projects").select("id").eq("lead_id", lead.id).maybeSingle();
    if (existing) return existing;
    const { data, error } = await supabase.from("projects").insert({
      lead_id: lead.id, naam: `Event · ${lead.naam}`, klant_naam: lead.naam, klant_email: lead.email,
    }).select().single();
    if (error) throw error;
    return mapProject(data);
  }
  const db = dbIn || await readLocalDb();
  if (db.projects.some((p) => p.leadId === lead.id)) return null;
  const project = {
    id: randomUUID(), leadId: lead.id, naam: `Event · ${lead.naam}`,
    klantNaam: lead.naam, klantEmail: lead.email, status: "planning",
    draaiboek: "", moodboardUrls: [], aangemaaktOp: nowIso(),
  };
  db.projects.unshift(project);
  if (!dbIn) await writeLocalDb(db);
  return project;
}

export async function listProjects() {
  const supabase = getServiceClient();
  if (supabase) {
    const { data, error } = await supabase.from("projects").select("*").order("aangemaakt_op", { ascending: false });
    if (error) throw error;
    return (data || []).map(mapProject);
  }
  return (await readLocalDb()).projects.sort((a, b) => new Date(b.aangemaaktOp) - new Date(a.aangemaaktOp));
}

export async function createProject({
  leadId = null,
  naam,
  klantNaam,
  klantEmail = null,
  eventDatum = null,
  locatie = null,
  aantalGasten = null,
  budget = null,
  status = "planning",
} = {}) {
  const projectNaam = String(naam || "").trim();
  const projectKlant = String(klantNaam || "").trim();
  if (!projectNaam || !projectKlant) {
    throw new Error("Projectnaam en klantnaam zijn verplicht.");
  }

  const supabase = getServiceClient();
  if (supabase) {
    const { data, error } = await supabase.from("projects").insert({
      lead_id: leadId || null,
      naam: projectNaam,
      klant_naam: projectKlant,
      klant_email: klantEmail || null,
      event_datum: eventDatum || null,
      locatie: locatie || null,
      aantal_gasten: aantalGasten,
      budget,
      status: status || "planning",
    }).select().single();
    if (error) throw error;
    return mapProject(data);
  }

  const db = await readLocalDb();
  const project = {
    id: randomUUID(),
    leadId: leadId || null,
    naam: projectNaam,
    klantNaam: projectKlant,
    klantEmail: klantEmail || null,
    eventDatum: eventDatum || null,
    locatie: locatie || null,
    aantalGasten,
    budget,
    status: status || "planning",
    draaiboek: "",
    moodboardUrls: [],
    aangemaaktOp: nowIso(),
  };
  db.projects.unshift(project);
  await writeLocalDb(db);
  return project;
}

export async function updateProject(id, updates) {
  const patch = {};
  if (updates.naam) patch.naam = updates.naam;
  if (updates.eventDatum !== undefined) patch.event_datum = updates.eventDatum;
  if (updates.locatie !== undefined) patch.locatie = updates.locatie;
  if (updates.aantalGasten !== undefined) patch.aantal_gasten = updates.aantalGasten;
  if (updates.budget !== undefined) patch.budget = updates.budget;
  if (updates.status) patch.status = updates.status;
  if (updates.draaiboek !== undefined) patch.draaiboek = updates.draaiboek;
  if (updates.moodboardUrls) patch.moodboard_urls = updates.moodboardUrls;

  const supabase = getServiceClient();
  if (supabase) {
    const { data, error } = await supabase.from("projects").update(patch).eq("id", id).select().single();
    if (error) throw error;
    return mapProject(data);
  }
  const db = await readLocalDb();
  const idx = db.projects.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  db.projects[idx] = { ...db.projects[idx], ...updates };
  await writeLocalDb(db);
  return db.projects[idx];
}

// ===== CAMPAIGNS =====
export async function listCampaigns() {
  const supabase = getServiceClient();
  if (supabase) {
    const { data, error } = await supabase.from("campaigns").select("*").order("aangemaakt_op", { ascending: false });
    if (error) throw error;
    return data || [];
  }
  return (await readLocalDb()).campaigns;
}

export async function createCampaign({ naam, onderwerp, inhoud, filterStatus, filterDagenOud }) {
  const supabase = getServiceClient();
  if (supabase) {
    const { data, error } = await supabase.from("campaigns").insert({
      naam, onderwerp, inhoud, filter_status: filterStatus, filter_dagen_oud: filterDagenOud,
    }).select().single();
    if (error) throw error;
    return data;
  }
  const db = await readLocalDb();
  const c = { id: randomUUID(), naam, onderwerp, inhoud, filterStatus, filterDagenOud, status: "concept", aangemaaktOp: nowIso() };
  db.campaigns.unshift(c);
  await writeLocalDb(db);
  return c;
}

export async function getCampaignRecipients(campaign) {
  const leads = await listLeads();
  const now = Date.now();
  return leads.filter((l) => {
    if (campaign.filter_status || campaign.filterStatus) {
      const fs = campaign.filter_status || campaign.filterStatus;
      if (l.status !== fs) return false;
    }
    if (campaign.filter_dagen_oud || campaign.filterDagenOud) {
      const days = (now - new Date(l.ontvangenOp).getTime()) / 86400000;
      if (days < (campaign.filter_dagen_oud || campaign.filterDagenOud)) return false;
    }
    return true;
  });
}

// ===== WEBSITE =====
export async function getWebsiteSections() {
  const supabase = getServiceClient();
  if (supabase) {
    const { data, error } = await supabase.from("website_sections").select("*");
    if (error) throw error;
    return Object.fromEntries((data || []).map((r) => [r.sleutel, r.waarde]));
  }
  return (await readLocalDb()).website;
}

export async function updateWebsiteSection(sleutel, waarde) {
  const supabase = getServiceClient();
  if (supabase) {
    const { error } = await supabase.from("website_sections").upsert({ sleutel, waarde, bijgewerkt_op: nowIso() });
    if (error) throw error;
    return { sleutel, waarde };
  }
  const db = await readLocalDb();
  db.website[sleutel] = waarde;
  await writeLocalDb(db);
  return { sleutel, waarde };
}

// ===== ANALYTICS =====
export async function getAnalytics() {
  const leads = await listLeads();
  const quotes = await listQuotes();
  const invoices = await listInvoices();
  const projects = await listProjects();

  const byStatus = {};
  for (const l of leads) byStatus[l.status] = (byStatus[l.status] || 0) + 1;

  const gewonnen = byStatus.gewonnen || 0;
  const totaal = leads.length || 1;
  const offertes = quotes.length;
  const offerteWaarde = quotes.reduce((s, q) => s + q.totaal, 0);
  const factuurWaarde = invoices.filter((i) => i.status === "betaald").reduce((s, i) => s + i.totaal, 0);

  return {
    leads: { totaal, byStatus, conversie: num((gewonnen / totaal) * 100) },
    quotes: { totaal: offertes, waarde: offerteWaarde },
    invoices: { totaal: invoices.length, betaald: factuurWaarde },
    projects: { totaal: projects.length, actief: projects.filter((p) => p.status !== "afgerond").length },
  };
}

export async function sendCampaign(campaignId) {
  const campaigns = await listCampaigns();
  const campaign = campaigns.find((c) => c.id === campaignId);
  if (!campaign) return null;
  const recipients = await getCampaignRecipients(campaign);
  const { sendBrandedEmail } = await import("./email.js");

  for (const lead of recipients) {
    await sendBrandedEmail({
      to: lead.email,
      subject: campaign.onderwerp,
      kicker: "Fluweel",
      title: campaign.naam || campaign.onderwerp,
      text: campaign.inhoud.replace(/\{\{naam\}\}/g, lead.naam),
    });
  }

  const supabase = getServiceClient();
  if (supabase) {
    await supabase.from("campaigns").update({ status: "verzonden", verzonden_op: nowIso() }).eq("id", campaignId);
    if (recipients.length) {
      await supabase.from("campaign_sends").insert(
        recipients.map((lead) => ({ campaign_id: campaignId, lead_id: lead.id, email: lead.email }))
      );
    }
  } else {
    const db = await readLocalDb();
    const c = db.campaigns.find((x) => x.id === campaignId);
    if (c) { c.status = "verzonden"; c.verzondenOp = nowIso(); }
    recipients.forEach((lead) => {
      db.campaignSends.push({ id: randomUUID(), campaignId, leadId: lead.id, email: lead.email, verzondenOp: nowIso() });
    });
    await writeLocalDb(db);
  }
  return { verzonden: recipients.length };
}

export function getTeamEmails() {
  const raw = process.env.ADMIN_TEAM_EMAILS || process.env.ADMIN_EMAIL || "";
  return raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export function getStorageMode() {
  return isSupabaseConfigured() ? "supabase" : "local";
}

export { applyTemplate, calcTotals };
