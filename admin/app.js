const FASES = [
  { id: "nieuw", label: "Nieuw" }, { id: "contact", label: "In contact" },
  { id: "offerte", label: "Offerte" }, { id: "gewonnen", label: "Gewonnen" }, { id: "verloren", label: "Verloren" },
];

const NAV = [
  { id: "dashboard", label: "Dashboard" },
  { id: "leads", label: "Aanvragen" },
  { id: "adresboek", label: "Adresboek" },
  { id: "quotes", label: "Offertes" },
  { id: "invoices", label: "Facturen" },
  { id: "projects", label: "Projecten" },
  { id: "campaigns", label: "Campagnes" },
  { id: "templates", label: "Templates" },
  { id: "website", label: "Website" },
  { id: "integrations", label: "Integraties" },
];

const state = { view: "dashboard", leads: [], quotes: [], invoices: [], projects: [], tasks: [], campaigns: [], templates: [], analytics: null, team: [], activeLead: null };

const SESSION_KEY = "fluweel_admin_session";
const $ = (s, r = document) => r.querySelector(s);
const loginView = $("#login-view");
const appView = $("#app-view");
const main = $("#main");
const detail = $("#detail");
const detailPaneel = $("#detail-paneel");

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

function writeSession(session) {
  if (!session?.accessToken) {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    return;
  }
  const raw = JSON.stringify(session);
  localStorage.setItem(SESSION_KEY, raw);
  sessionStorage.setItem(SESSION_KEY, raw);
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

async function api(path, opts = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
  };
  const session = readSession();
  if (session?.accessToken) {
    if (!headers.Authorization) headers.Authorization = `Bearer ${session.accessToken}`;
    if (!headers["x-fluweel-access"]) headers["x-fluweel-access"] = session.accessToken;
    if (session.refreshToken && !headers["x-fluweel-refresh"]) {
      headers["x-fluweel-refresh"] = session.refreshToken;
    }
  }

  const res = await fetch(path, {
    credentials: "same-origin",
    ...opts,
    headers,
  });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

function esc(s) { return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;"); }
function fmt(iso) { return iso ? new Intl.DateTimeFormat("nl-NL",{dateStyle:"medium",timeStyle:"short"}).format(new Date(iso)) : "-"; }
function fase(id) { return FASES.find(f=>f.id===id)?.label || id; }

function showLogin() {
  clearSession();
  if (loginView) {
    loginView.hidden = false;
    loginView.removeAttribute("hidden");
  }
  if (appView) {
    appView.hidden = true;
    appView.setAttribute("hidden", "");
  }
  detail?.classList.remove("open");
}

function showApp(email) {
  if (loginView) {
    loginView.hidden = true;
    loginView.setAttribute("hidden", "");
  }
  if (appView) {
    appView.hidden = false;
    appView.removeAttribute("hidden");
  }
  const account = $("#account");
  if (account) account.textContent = email || "";
  updateWerkDatum();
  renderNav();
  renderView();
}

function updateWerkDatum() {
  const el = $("#werk-datum");
  if (!el) return;
  el.textContent = new Intl.DateTimeFormat("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}

function renderNav() {
  $("#nav").innerHTML = NAV.map(n => `<button type="button" class="nav-item ${state.view===n.id?"actief":""}" data-view="${n.id}">${n.label}</button>`).join("");
  $("#nav").querySelectorAll(".nav-item").forEach(b => b.onclick = () => { state.view = b.dataset.view; renderNav(); renderView(); });
}

async function loadAll() {
  const [leads, quotes, invoices, projects, tasks, campaigns, templates, analytics, team] = await Promise.all([
    api("/api/leads"), api("/api/quotes"), api("/api/invoices"), api("/api/projects"),
    api("/api/tasks"), api("/api/campaigns"), api("/api/content/templates"), api("/api/analytics"), api("/api/leads?team=1"),
  ]);
  state.leads = leads.json.leads || [];
  state.quotes = quotes.json.quotes || [];
  state.invoices = invoices.json.invoices || [];
  state.projects = projects.json.projects || [];
  state.tasks = tasks.json.tasks || [];
  state.campaigns = campaigns.json.campaigns || [];
  state.templates = templates.json.templates || [];
  state.analytics = analytics.json.analytics;
  state.team = team.json.team || [];
}

function renderView() {
  const current = NAV.find(n => n.id === state.view);
  main.innerHTML = `
    <div class="page-kop">
      <p class="label">${esc(current?.label || "Overzicht")}</p>
      <h1>${esc(current?.label || "Dashboard")}</h1>
    </div>`;
  const renderers = {
    dashboard: renderDashboard,
    leads: renderLeads,
    adresboek: renderAdresboek,
    quotes: renderQuotes,
    invoices: renderInvoices,
    projects: renderProjects,
    campaigns: renderCampaigns,
    templates: renderTemplates,
    website: renderWebsite,
    integrations: renderIntegrations,
  };
  renderers[state.view]?.();
}

function renderDashboard() {
  const a = state.analytics || {};
  const vandaag = state.tasks.filter(t => t.deadline && t.deadline <= new Date().toISOString().slice(0,10) && !t.voltooid);
  main.innerHTML += `
    <div class="grid-4">
      <div class="kaart-stat"><span>Aanvragen</span><strong>${a.leads?.totaal||0}</strong></div>
      <div class="kaart-stat"><span>Conversie</span><strong>${a.leads?.conversie||0}%</strong></div>
      <div class="kaart-stat"><span>Pipeline offertes</span><strong>€ ${(a.quotes?.waarde||0).toFixed(0)}</strong></div>
      <div class="kaart-stat"><span>Omzet betaald</span><strong>€ ${(a.invoices?.betaald||0).toFixed(0)}</strong></div>
    </div>
    <div class="panel"><h2>Vandaag te doen (${vandaag.length})</h2>
      ${vandaag.length ? vandaag.map(t=>`<p class="taak-rij"><button type="button" class="taak-check" data-id="${t.id}" aria-label="Afvinken">☐</button> <strong>${esc(t.titel)}</strong> <span class="tag">${t.deadline}</span></p>`).join("") : "<p class='leeg'>Geen open taken voor vandaag.</p>"}
    </div>
    <div class="panel"><h2>Pipeline</h2>
      ${FASES.map(f=>`<p><span class="tag">${f.label}</span> ${state.leads.filter(l=>l.status===f.id).length} aanvragen</p>`).join("")}
    </div>`;
  main.querySelectorAll(".taak-check").forEach((b) => {
    b.onclick = async () => {
      await api("/api/tasks", { method: "PATCH", body: JSON.stringify({ id: b.dataset.id, voltooid: true }) });
      await refresh();
      renderView();
    };
  });
}

function renderLeads() {
  main.innerHTML += `
    <div class="panel">
      <h2>Nieuwe aanvraag</h2>
      <p style="color:var(--mauve);margin-bottom:.85rem;font-size:.92rem">Voor belletjes, walk-ins of referrals.</p>
      <form id="nieuw-lead" class="form-grid" style="max-width:640px">
        <label>Naam *</label><input name="naam" required placeholder="Voor- en achternaam">
        <label>E-mail *</label><input name="email" type="email" required placeholder="naam@bedrijf.nl">
        <label>Telefoon</label><input name="telefoon" placeholder="06...">
        <label>Bedrijf</label><input name="bedrijf" placeholder="Optioneel">
        <label>Bron</label>
        <select name="bron">
          <option value="telefoon">Telefoon</option>
          <option value="walk-in">Walk-in</option>
          <option value="referral">Referral</option>
          <option value="linkedin">LinkedIn</option>
          <option value="website">Website</option>
          <option value="overig">Overig</option>
        </select>
        <label>Korte notitie</label><textarea name="bericht" rows="3" placeholder="Waar ging het gesprek over?"></textarea>
        <button type="submit" class="btn btn-primair">Opslaan in pipeline</button>
        <p class="melding" id="nieuw-lead-melding"></p>
      </form>
    </div>
    <div class="board">${FASES.map(f=>{
    const items = state.leads.filter(l=>l.status===f.id);
    return `<section class="kolom"><div class="kolom-kop"><h3>${f.label} (${items.length})</h3></div><div class="kolom-lijst">${
      items.map(l=>`<button type="button" class="kaart-lead ${l.gelezen?"":"ongelezen"}" data-id="${l.id}"><strong>${esc(l.naam)}</strong><small>${fmt(l.ontvangenOp)}${l.bron?` · ${esc(l.bron)}`:""}</small></button>`).join("") || "<p class='leeg'>Leeg</p>"
    }</div></section>`;
  }).join("")}</div>`;

  main.querySelectorAll(".kaart-lead").forEach(b => b.onclick = () => openLeadDetail(b.dataset.id));
  $("#nieuw-lead")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const melding = $("#nieuw-lead-melding");
    melding.textContent = "";
    const data = Object.fromEntries(new FormData(e.target));
    const { res, json } = await api("/api/leads", { method: "POST", body: JSON.stringify(data) });
    if (!res.ok) {
      melding.textContent = json.error || "Opslaan mislukt.";
      return;
    }
    e.target.reset();
    melding.textContent = "Opgeslagen in de pipeline.";
    await refresh();
    renderView();
    if (json.lead?.id) openLeadDetail(json.lead.id);
  });
}

function filterLeads(query, status) {
  const q = String(query || "").trim().toLowerCase();
  return state.leads.filter((l) => {
    if (status && status !== "alle" && l.status !== status) return false;
    if (!q) return true;
    const hay = [l.naam, l.email, l.telefoon, l.bedrijf, l.bron, l.bericht, l.notities]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

function exportLeadsCsv(leads) {
  const cols = ["naam", "email", "telefoon", "bedrijf", "status", "bron", "ontvangenOp", "notities"];
  const escCsv = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [cols.join(",")].concat(
    leads.map((l) => cols.map((c) => escCsv(l[c])).join(","))
  );
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fluweel-adresboek-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function renderAdresboek() {
  const initial = filterLeads("", "alle");
  main.innerHTML += `
    <div class="panel">
      <div class="toolbar-grid">
        <div>
          <label for="ab-zoek">Zoeken</label>
          <input id="ab-zoek" placeholder="Naam, e-mail, telefoon, bedrijf...">
        </div>
        <div>
          <label for="ab-fase">Fase</label>
          <select id="ab-fase">
            <option value="alle">Alle fases</option>
            ${FASES.map((f) => `<option value="${f.id}">${f.label}</option>`).join("")}
          </select>
        </div>
        <button type="button" class="btn" id="ab-export">CSV exporteren</button>
      </div>
    </div>
    <div class="panel">
      <h2>Contacten (<span id="ab-count">${initial.length}</span>)</h2>
      <table class="tabel">
        <thead><tr><th>Naam</th><th>E-mail</th><th>Telefoon</th><th>Bedrijf</th><th>Fase</th><th>Bron</th><th></th></tr></thead>
        <tbody id="ab-body">${renderAdresboekRows(initial)}</tbody>
      </table>
    </div>`;

  const redraw = () => {
    const list = filterLeads($("#ab-zoek").value, $("#ab-fase").value);
    $("#ab-count").textContent = String(list.length);
    $("#ab-body").innerHTML = renderAdresboekRows(list);
    bindAdresboekRowActions();
  };
  $("#ab-zoek").addEventListener("input", redraw);
  $("#ab-fase").addEventListener("change", redraw);
  $("#ab-export").onclick = () => exportLeadsCsv(filterLeads($("#ab-zoek").value, $("#ab-fase").value));
  bindAdresboekRowActions();
}

function renderAdresboekRows(leads) {
  if (!leads.length) return `<tr><td colspan="7" class="leeg">Geen contacten gevonden.</td></tr>`;
  return leads.map((l) => `
    <tr>
      <td><strong>${esc(l.naam)}</strong></td>
      <td><a href="mailto:${esc(l.email)}">${esc(l.email)}</a></td>
      <td>${l.telefoon ? esc(l.telefoon) : "-"}</td>
      <td>${l.bedrijf ? esc(l.bedrijf) : "-"}</td>
      <td><span class="tag">${fase(l.status)}</span></td>
      <td>${esc(l.bron || "-")}</td>
      <td><button type="button" class="btn ab-open" data-id="${l.id}">Open</button></td>
    </tr>`).join("");
}

function bindAdresboekRowActions() {
  main.querySelectorAll(".ab-open").forEach((b) => {
    b.onclick = () => openLeadDetail(b.dataset.id);
  });
}

async function openLeadDetail(id) {
  state.activeLead = id;
  const lead = state.leads.find(l=>l.id===id);
  const { json } = await api(`/api/activities?leadId=${id}`);
  const { json: tj } = await api(`/api/tasks?leadId=${id}`);
  detailPaneel.innerHTML = `
    <button type="button" class="detail-x" id="detail-x">&times;</button>
    <p class="tag">${fase(lead.status)}</p>
    <h2 style="font-family:var(--serif);margin:.3rem 0 1rem">${esc(lead.naam)}</h2>
    <p><a href="mailto:${esc(lead.email)}">${esc(lead.email)}</a> ${lead.telefoon?`· ${esc(lead.telefoon)}`:""}</p>
    ${lead.bedrijf?`<p>${esc(lead.bedrijf)}</p>`:""}
    <div class="form-grid" style="margin:1rem 0">
      <label>Toegewezen aan</label>
      <select id="assign-select"><option value="">-</option>${state.team.map(e=>`<option value="${esc(e)}" ${lead.toegewezenAan===e?"selected":""}>${esc(e)}</option>`).join("")}</select>
    </div>
    <div class="panel"><strong>Aanvraag</strong><p style="margin-top:.5rem;white-space:pre-wrap">${esc(lead.bericht)}</p></div>
    <div class="form-grid"><label>Notities</label><textarea id="lead-notities" rows="3">${esc(lead.notities)}</textarea></div>
    <div class="form-grid">
      <label>Bel-log / snelle notitie</label>
      <input id="bel-log" placeholder="Bijv. Terugbellen donderdag over datum">
    </div>
    <div class="btn-groep">
      <button class="btn btn-primair" id="save-lead">Opslaan</button>
      <button class="btn" id="add-bel-log">Bel-log toevoegen</button>
      <button class="btn" id="mail-lead">E-mail</button>
      <button class="btn" id="tpl-bevestiging">Bevestiging</button>
      <button class="btn" id="tpl-followup">Follow-up</button>
      <button class="btn btn-primair" id="new-quote">Offerte maken</button>
      ${lead.telefoon?`<a class="btn" href="https://wa.me/${lead.telefoon.replace(/\D/g,"")}" target="_blank">WhatsApp</a>`:""}
    </div>
    <div class="panel"><h2>Fase</h2><div class="btn-groep">${FASES.map(f=>`<button class="btn fase-btn" data-status="${f.id}">${f.label}</button>`).join("")}</div></div>
    <div class="panel"><h2>Taken</h2>
      <div class="form-grid"><input id="task-titel" placeholder="Nieuwe taak"><input id="task-deadline" type="date"><button class="btn" id="add-task">Taak toevoegen</button></div>
      ${(tj.tasks||[]).map(t=>`<p class="taak-rij"><button type="button" class="taak-check" data-id="${t.id}" data-done="${t.voltooid?"1":"0"}" aria-label="${t.voltooid?"Heropenen":"Afvinken"}">${t.voltooid?"☑":"☐"}</button> <span class="${t.voltooid?"taak-done":""}">${esc(t.titel)}</span> <span class="tag">${t.deadline||""}</span></p>`).join("")}
    </div>
    <div class="panel"><h2>Tijdlijn</h2><div class="timeline">${(json.activities||[]).map(a=>`<div class="timeline-item"><strong>${esc(a.titel)}</strong><p>${fmt(a.aangemaaktOp)} · ${esc(a.omschrijving)}</p></div>`).join("")||"<p class='leeg'>Nog geen activiteiten</p>"}</div></div>`;
  detail.classList.add("open");
  $("#detail-x").onclick = closeDetail;
  $("#detail-sluit")?.addEventListener("click", closeDetail);
  $("#save-lead").onclick = async () => {
    await api("/api/leads", { method:"PATCH", body: JSON.stringify({ id, notities: $("#lead-notities").value, toegewezenAan: $("#assign-select").value||null }) });
    await refresh(); openLeadDetail(id);
  };
  $("#add-bel-log").onclick = async () => {
    const tekst = ($("#bel-log").value || "").trim();
    if (!tekst) return;
    await api("/api/leads", {
      method: "PATCH",
      body: JSON.stringify({
        id,
        activiteit: { type: "telefoon", titel: "Gebeld", omschrijving: tekst },
      }),
    });
    await refresh();
    openLeadDetail(id);
  };
  detailPaneel.querySelectorAll(".fase-btn").forEach(btn => btn.onclick = async () => {
    await api("/api/leads", { method:"PATCH", body: JSON.stringify({ id, status: btn.dataset.status }) });
    await refresh(); openLeadDetail(id);
  });
  $("#mail-lead").onclick = () => location.href = `mailto:${lead.email}?subject=${encodeURIComponent("Fluweel Events · "+lead.naam)}`;
  $("#tpl-bevestiging").onclick = () => sendTemplate("bevestiging", id);
  $("#tpl-followup").onclick = () => sendTemplate("followup", id);
  $("#new-quote").onclick = () => createQuoteForLead(lead);
  $("#add-task").onclick = async () => {
    await api("/api/tasks", { method:"POST", body: JSON.stringify({ leadId:id, titel:$("#task-titel").value, deadline:$("#task-deadline").value||null }) });
    await refresh();
    openLeadDetail(id);
  };
  detailPaneel.querySelectorAll(".taak-check").forEach((b) => {
    b.onclick = async () => {
      const done = b.dataset.done === "1";
      await api("/api/tasks", { method: "PATCH", body: JSON.stringify({ id: b.dataset.id, voltooid: !done }) });
      await refresh();
      openLeadDetail(id);
    };
  });
  if (!lead.gelezen) api("/api/leads", { method:"PATCH", body: JSON.stringify({ id, gelezen:true }) });
}

async function sendTemplate(slug, leadId) {
  await api("/api/send-email", { method:"POST", body: JSON.stringify({ templateSlug: slug, leadId }) });
  alert("E-mail verstuurd (of gelogd in dev).");
}

async function createQuoteForLead(lead) {
  const regels = [{ omschrijving: "Concept & organisatie event", aantal: 1, prijs: 2500 }];
  const { res, json } = await api("/api/quotes", {
    method: "POST",
    body: JSON.stringify({
      leadId: lead.id,
      klantNaam: lead.naam,
      klantEmail: lead.email,
      klantBedrijf: lead.bedrijf,
      regels,
      geldigTot: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    }),
  });
  await refresh();
  state.view = "quotes";
  renderNav();
  renderView();
  closeDetail();
  if (res.ok && json.quote?.id) openQuoteDetail(json.quote.id);
}

function closeDetail() {
  detail.classList.remove("open");
  state.activeLead = null;
}

function calcRegelsPreview(rows) {
  const subtotaal = rows.reduce((s, r) => s + (Number(r.aantal) || 0) * (Number(r.prijs) || 0), 0);
  const btw = subtotaal * 0.21;
  return { subtotaal, btw, totaal: subtotaal + btw };
}

function readQuoteRegelsFromForm(root) {
  return [...root.querySelectorAll(".regel-rij")].map((row) => ({
    omschrijving: row.querySelector(".r-omschr").value.trim(),
    aantal: Number(row.querySelector(".r-aantal").value) || 0,
    prijs: Number(row.querySelector(".r-prijs").value) || 0,
  })).filter((r) => r.omschrijving);
}

function renderRegelRow(r = { omschrijving: "", aantal: 1, prijs: 0 }) {
  return `<div class="regel-rij">
    <input class="r-omschr" value="${esc(r.omschrijving)}" placeholder="Omschrijving">
    <input class="r-aantal" type="number" min="0" step="0.5" value="${esc(r.aantal)}" title="Aantal">
    <input class="r-prijs" type="number" min="0" step="0.01" value="${esc(r.prijs)}" title="Prijs">
    <button type="button" class="btn r-del" aria-label="Regel verwijderen">×</button>
  </div>`;
}

function bindRegelEditor(root, onChange) {
  const redrawTotals = () => {
    const totals = calcRegelsPreview(readQuoteRegelsFromForm(root));
    const el = root.querySelector(".regel-totaal");
    if (el) {
      el.textContent = `Subtotaal € ${totals.subtotaal.toFixed(2)} · BTW € ${totals.btw.toFixed(2)} · Totaal € ${totals.totaal.toFixed(2)}`;
    }
    onChange?.(totals);
  };
  root.querySelector("#add-regel")?.addEventListener("click", () => {
    root.querySelector("#regel-lijst").insertAdjacentHTML("beforeend", renderRegelRow());
    bindRegelRowEvents(root, redrawTotals);
    redrawTotals();
  });
  bindRegelRowEvents(root, redrawTotals);
  redrawTotals();
}

function bindRegelRowEvents(root, redrawTotals) {
  root.querySelectorAll(".regel-rij").forEach((row) => {
    row.querySelectorAll("input").forEach((inp) => {
      inp.oninput = redrawTotals;
    });
    row.querySelector(".r-del").onclick = () => {
      row.remove();
      redrawTotals();
    };
  });
}

async function openQuoteDetail(id) {
  const { json } = await api(`/api/quotes?id=${encodeURIComponent(id)}`);
  const quote = json.quote || state.quotes.find((q) => q.id === id);
  if (!quote) return;

  detailPaneel.innerHTML = `
    <button type="button" class="detail-x" id="detail-x">&times;</button>
    <p class="tag">${esc(quote.status)}</p>
    <h2 style="font-family:var(--serif);margin:.3rem 0 .4rem">${esc(quote.nummer)}</h2>
    <p>${esc(quote.klantNaam)}${quote.klantBedrijf ? ` · ${esc(quote.klantBedrijf)}` : ""}</p>
    <p><a href="mailto:${esc(quote.klantEmail)}">${esc(quote.klantEmail)}</a></p>
    <div class="form-grid" style="margin-top:1rem;max-width:none">
      <label>Geldig tot</label>
      <input id="q-geldig" type="date" value="${esc(quote.geldigTot || "")}">
      <label>Notities</label>
      <textarea id="q-notities" rows="2">${esc(quote.notities || "")}</textarea>
      <label>Regels</label>
      <div id="regel-lijst">${(quote.regels || []).map(renderRegelRow).join("") || renderRegelRow()}</div>
      <button type="button" class="btn" id="add-regel">Regel toevoegen</button>
      <p class="regel-totaal"></p>
    </div>
    <div class="btn-groep">
      <button class="btn btn-primair" id="save-quote">Opslaan</button>
      <a class="btn" href="/api/quotes/pdf?id=${quote.id}" target="_blank">PDF</a>
      <button class="btn btn-primair" id="send-quote-detail">Versturen</button>
    </div>
    <p class="melding" id="quote-melding"></p>`;
  detail.classList.add("open");
  $("#detail-x").onclick = closeDetail;
  bindRegelEditor(detailPaneel);

  $("#save-quote").onclick = async () => {
    const melding = $("#quote-melding");
    const regels = readQuoteRegelsFromForm(detailPaneel);
    if (!regels.length) {
      melding.textContent = "Voeg minstens één regel toe.";
      return;
    }
    const { res, json: out } = await api("/api/quotes", {
      method: "PATCH",
      body: JSON.stringify({
        id,
        regels,
        notities: $("#q-notities").value,
        geldigTot: $("#q-geldig").value || null,
      }),
    });
    if (!res.ok) {
      melding.textContent = out.error || "Opslaan mislukt.";
      return;
    }
    melding.textContent = "Offerte opgeslagen.";
    await refresh();
    if (state.view === "quotes") renderView();
    openQuoteDetail(id);
  };

  $("#send-quote-detail").onclick = async () => {
    const { json: out } = await api("/api/quotes/send", { method: "POST", body: JSON.stringify({ id }) });
    alert(`Offerte verstuurd (PDF in bijlage).\nKlantportaal: ${out.portalUrl || "—"}`);
    await refresh();
    if (state.view === "quotes") renderView();
    openQuoteDetail(id);
  };
}

function renderQuotes() {
  main.innerHTML += `<table class="tabel"><thead><tr><th>Nr</th><th>Klant</th><th>Status</th><th>Totaal</th><th>Acties</th></tr></thead><tbody>
    ${state.quotes.map((q) => `<tr>
      <td>${esc(q.nummer)}</td>
      <td>${esc(q.klantNaam)}</td>
      <td><span class="tag">${esc(q.status)}</span></td>
      <td>€ ${Number(q.totaal || 0).toFixed(2)}</td>
      <td class="btn-groep">
        <button class="btn open-quote" data-id="${q.id}">Bewerken</button>
        <a class="btn" href="/api/quotes/pdf?id=${q.id}" target="_blank">PDF</a>
        <button class="btn btn-primair send-quote" data-id="${q.id}">Versturen</button>
      </td>
    </tr>`).join("") || "<tr><td colspan='5' class='leeg'>Nog geen offertes</td></tr>"}
  </tbody></table>`;
  main.querySelectorAll(".open-quote").forEach((b) => {
    b.onclick = () => openQuoteDetail(b.dataset.id);
  });
  main.querySelectorAll(".send-quote").forEach((b) => {
    b.onclick = async () => {
      const { json } = await api("/api/quotes/send", { method: "POST", body: JSON.stringify({ id: b.dataset.id }) });
      alert(`Offerte verstuurd (PDF in bijlage).\nKlantportaal: ${json.portalUrl || "—"}`);
      await refresh();
      renderView();
    };
  });
}

function renderInvoices() {
  main.innerHTML += `<table class="tabel"><thead><tr><th>Nr</th><th>Klant</th><th>Status</th><th>Totaal</th><th>Acties</th></tr></thead><tbody>
    ${state.invoices.map((i) => `<tr>
      <td>${esc(i.nummer)}</td>
      <td>${esc(i.klantNaam)}</td>
      <td><span class="tag">${esc(i.status)}</span></td>
      <td>€ ${Number(i.totaal || 0).toFixed(2)}</td>
      <td class="btn-groep">
        <a class="btn" href="/api/invoices/pdf?id=${i.id}" target="_blank">PDF</a>
        <a class="btn" href="/api/invoices/moneybird?id=${i.id}" target="_blank">Moneybird</a>
        ${i.status === "concept" || i.status === "vervallen" ? `<button class="btn btn-primair send-inv" data-id="${i.id}">Versturen</button>` : ""}
        ${i.status !== "betaald" ? `<button class="btn mark-paid" data-id="${i.id}">Betaald</button>` : ""}
      </td>
    </tr>`).join("") || "<tr><td colspan='5' class='leeg'>Nog geen facturen</td></tr>"}
  </tbody></table>
  <div class="panel"><h2>Factuur van offerte</h2><div class="form-grid"><select id="quote-pick">${state.quotes.map((q) => `<option value="${q.id}">${esc(q.nummer)} — ${esc(q.klantNaam)}</option>`).join("")}</select><button class="btn btn-primair" id="mk-invoice">Factuur aanmaken</button></div></div>`;
  $("#mk-invoice")?.addEventListener("click", async () => {
    await api("/api/invoices", { method: "POST", body: JSON.stringify({ quoteId: $("#quote-pick").value }) });
    await refresh();
    renderView();
  });
  main.querySelectorAll(".send-inv").forEach((b) => {
    b.onclick = async () => {
      await api("/api/invoices", { method: "PATCH", body: JSON.stringify({ id: b.dataset.id, status: "verstuurd" }) });
      alert("Factuur verstuurd (PDF in bijlage).");
      await refresh();
      renderView();
    };
  });
  main.querySelectorAll(".mark-paid").forEach((b) => {
    b.onclick = async () => {
      await api("/api/invoices", { method: "PATCH", body: JSON.stringify({ id: b.dataset.id, status: "betaald" }) });
      await refresh();
      renderView();
    };
  });
}

const PROJECT_STATUSES = [
  { id: "planning", label: "Planning" },
  { id: "voorbereiding", label: "Voorbereiding" },
  { id: "live", label: "Live" },
  { id: "afgerond", label: "Afgerond" },
];

function renderProjects() {
  main.innerHTML += state.projects.map((p) => `
    <div class="panel" data-project="${p.id}">
      <h2>${esc(p.naam)} <span class="tag">${esc(p.status)}</span></h2>
      <p style="color:var(--mauve);margin-bottom:1rem">${esc(p.klantNaam)}</p>
      <div class="form-grid" style="max-width:640px">
        <label>Eventdatum</label>
        <input class="p-datum" type="date" value="${esc(p.eventDatum || "")}">
        <label>Locatie</label>
        <input class="p-locatie" value="${esc(p.locatie || "")}" placeholder="Locatie">
        <label>Aantal gasten</label>
        <input class="p-gasten" type="number" min="0" value="${p.aantalGasten ?? ""}" placeholder="0">
        <label>Budget (€)</label>
        <input class="p-budget" type="number" min="0" step="0.01" value="${p.budget ?? ""}" placeholder="0">
        <label>Status</label>
        <select class="p-status">
          ${PROJECT_STATUSES.map((s) => `<option value="${s.id}" ${p.status === s.id ? "selected" : ""}>${s.label}</option>`).join("")}
        </select>
        <label>Draaiboek</label>
        <textarea class="draaiboek" rows="4">${esc(p.draaiboek || "")}</textarea>
        <label>Moodboard URL (één per regel)</label>
        <textarea class="mood" rows="3">${(p.moodboardUrls || []).join("\n")}</textarea>
        <button class="btn btn-primair save-project" data-id="${p.id}">Opslaan</button>
        <p class="melding p-melding" hidden></p>
      </div>
    </div>`).join("") || "<p class='leeg'>Nog geen projecten. Worden automatisch aangemaakt bij fase 'Gewonnen'.</p>";

  main.querySelectorAll(".save-project").forEach((b) => {
    b.onclick = async () => {
      const id = b.dataset.id;
      const panel = b.closest(".panel");
      const melding = panel.querySelector(".p-melding");
      const gastenRaw = panel.querySelector(".p-gasten").value;
      const budgetRaw = panel.querySelector(".p-budget").value;
      const { res, json } = await api("/api/projects", {
        method: "PATCH",
        body: JSON.stringify({
          id,
          eventDatum: panel.querySelector(".p-datum").value || null,
          locatie: panel.querySelector(".p-locatie").value.trim() || null,
          aantalGasten: gastenRaw === "" ? null : Number(gastenRaw),
          budget: budgetRaw === "" ? null : Number(budgetRaw),
          status: panel.querySelector(".p-status").value,
          draaiboek: panel.querySelector(".draaiboek").value,
          moodboardUrls: panel.querySelector(".mood").value.split("\n").map((s) => s.trim()).filter(Boolean),
        }),
      });
      if (!res.ok) {
        melding.hidden = false;
        melding.textContent = json.error || "Opslaan mislukt.";
        return;
      }
      await refresh();
      renderView();
    };
  });
}

function renderCampaigns() {
  main.innerHTML += `
    <div class="panel"><h2>Nieuwe campagne</h2>
      <div class="form-grid">
        <input id="c-naam" placeholder="Naam campagne">
        <input id="c-onderwerp" placeholder="Onderwerp">
        <textarea id="c-inhoud" rows="4" placeholder="Beste {{naam}}, ..."></textarea>
        <select id="c-filter"><option value="">Alle leads</option>${FASES.map(f=>`<option value="${f.id}">Fase: ${f.label}</option>`).join("")}</select>
        <input id="c-dagen" type="number" placeholder="Min. dagen oud (optioneel)">
        <button class="btn btn-primair" id="c-create">Campagne aanmaken</button>
      </div>
    </div>
    <div class="panel"><h2>Campagnes</h2>${state.campaigns.map(c=>`<p><strong>${esc(c.naam)}</strong> <span class="tag">${c.status||"concept"}</span>
      <button class="btn send-c" data-id="${c.id}">Versturen</button></p>`).join("")||"<p class='leeg'>Geen campagnes</p>"}</div>`;
  $("#c-create")?.addEventListener("click", async () => {
    const { json } = await api("/api/campaigns", { method:"POST", body: JSON.stringify({
      naam: $("#c-naam").value, onderwerp: $("#c-onderwerp").value, inhoud: $("#c-inhoud").value,
      filterStatus: $("#c-filter").value||null, filterDagenOud: Number($("#c-dagen").value)||null,
    })});
    alert(`Campagne aangemaakt voor ${json.ontvangers} ontvangers.`);
    await refresh(); renderView();
  });
  main.querySelectorAll(".send-c").forEach(b => b.onclick = async () => {
    const { json } = await api("/api/campaigns/send", { method:"POST", body: JSON.stringify({ id: b.dataset.id }) });
    alert(`${json.verzonden} e-mails verstuurd.`);
    await refresh(); renderView();
  });
}

function renderTemplates() {
  main.innerHTML += state.templates.map(t=>`
    <div class="panel"><h2>${esc(t.naam)} <span class="tag">${t.slug}</span></h2>
      <p><strong>${esc(t.onderwerp)}</strong></p>
      <pre style="white-space:pre-wrap;font-size:.85rem;color:var(--mauve);margin-top:.5rem">${esc(t.inhoud)}</pre>
    </div>`).join("");
}

async function renderWebsite() {
  const { json } = await api("/api/content/website");
  const s = json.sections || {};
  main.innerHTML += Object.entries(s).map(([k,v])=>`
    <div class="form-grid panel"><label>${esc(k)}</label><textarea class="web-field" data-key="${esc(k)}" rows="2">${esc(v)}</textarea></div>`).join("");
  main.innerHTML += `<button class="btn btn-primair" id="save-web">Website opslaan</button>`;
  $("#save-web").onclick = async () => {
    for (const el of main.querySelectorAll(".web-field")) {
      await api("/api/content/website", { method:"PATCH", body: JSON.stringify({ sleutel: el.dataset.key, waarde: el.value }) });
    }
    alert("Opgeslagen.");
  };
}

function renderIntegrations() {
  const base = location.origin;
  main.innerHTML += `
    <div class="panel"><h2>Koppelingen</h2>
      <p><strong>Google Calendar</strong> - <a href="/api/tasks/ics" target="_blank">Taken exporteren (.ics)</a></p>
      <p><strong>Typeform webhook</strong> - POST naar <code>${base}/api/webhooks/typeform</code></p>
      <p><strong>Moneybird</strong> - export via factuur naar Moneybird JSON</p>
      <p><strong>WhatsApp</strong> - via lead-detail (wa.me link)</p>
      <p><strong>DocuSign</strong> - binnenkort beschikbaar</p>
      <p><strong>Klantportaal</strong> - ${base}/portal/</p>
    </div>`;
}

async function refresh() { await loadAll(); }

$("#loginform").addEventListener("submit", async e => {
  e.preventDefault();
  const melding = $("#login-melding");
  const submitBtn = e.target.querySelector('button[type="submit"]');
  melding.textContent = "";
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Bezig...";
  }
  try {
    const data = Object.fromEntries(new FormData(e.target));
    const { res, json } = await api("/api/login", { method:"POST", body: JSON.stringify(data) });
    if (!res.ok) {
      melding.textContent = json.error || "Inloggen mislukt.";
      e.target.classList.remove("shake");
      void e.target.offsetWidth;
      e.target.classList.add("shake");
      return;
    }

    if (!json.ok || !json.accessToken) {
      melding.textContent = json.error || "Inloggen lukte, maar er kwam geen sessie terug. Probeer het opnieuw.";
      return;
    }

    writeSession({
      email: json.email,
      accessToken: json.accessToken,
      refreshToken: json.refreshToken || null,
      provider: json.provider || null,
    });

    showApp(json.email);
    try {
      await refresh();
    } catch (loadErr) {
      console.error(loadErr);
    }
  } catch (err) {
    melding.textContent = err?.message || "Inloggen mislukt.";
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Inloggen";
    }
  }
});

$("#uitloggen")?.addEventListener("click", async () => {
  try { await api("/api/logout", { method:"POST" }); } catch {}
  showLogin();
});
$("#detail-sluit")?.addEventListener("click", closeDetail);

(async () => {
  const werkKop = document.querySelector(".werk-kop");
  const mainEl = document.querySelector(".main");
  mainEl?.addEventListener("scroll", () => {
    werkKop?.classList.toggle("scrolled", (mainEl.scrollTop || 0) > 8);
  }, { passive: true });

  try {
    const session = readSession();
    if (!session?.accessToken) {
      showLogin();
      return;
    }
    showApp(session.email || "");
    const { res, json } = await api("/api/me");
    if (res.ok && json.email) $("#account").textContent = json.email;
    try { await refresh(); } catch (err) { console.error(err); }
  } catch {
    showLogin();
  }
})();
