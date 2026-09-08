export function money(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

/** Verkoopprijs = inkoopprijs × (1 + marge%/100) */
export function calcVerkoopprijs(prijs, margePct) {
  return money(money(prijs) * (1 + money(margePct) / 100));
}

export function calcMargeBedrag(prijs, verkoopprijs) {
  return money(money(verkoopprijs) - money(prijs));
}

export function normalizeProjectCostInput(body = {}) {
  const leverancier = String(body.leverancier || "").trim();
  const wat = String(body.wat || "").trim();
  const opmerking = String(body.opmerking || "").trim();
  const prijsRaw = body.prijs === "" || body.prijs == null ? 0 : Number(body.prijs);
  const margeRaw = body.margePct === "" || body.margePct == null
    ? (body.marge_pct === "" || body.marge_pct == null ? 0 : Number(body.marge_pct))
    : Number(body.margePct);

  if (!Number.isFinite(prijsRaw) || prijsRaw < 0) {
    throw new Error("Prijs moet een getal van 0 of hoger zijn.");
  }
  if (!Number.isFinite(margeRaw) || margeRaw < 0) {
    throw new Error("Marge % moet een getal van 0 of hoger zijn.");
  }
  if (margeRaw > 999.99) {
    throw new Error("Marge % is te hoog.");
  }

  const prijs = money(prijsRaw);
  const margePct = money(margeRaw);
  const hasOverride = body.verkoopprijs !== undefined && body.verkoopprijs !== null && body.verkoopprijs !== "";
  const verkoopRaw = hasOverride ? Number(body.verkoopprijs) : calcVerkoopprijs(prijs, margePct);
  if (!Number.isFinite(verkoopRaw) || verkoopRaw < 0) {
    throw new Error("Verkoopprijs moet een getal van 0 of hoger zijn.");
  }

  return {
    leverancier,
    wat,
    prijs,
    margePct,
    verkoopprijs: money(verkoopRaw),
    opmerking,
    bevestigdBetaald: Boolean(body.bevestigdBetaald ?? body.bevestigd_betaald),
  };
}

export function costTotals(kosten = []) {
  const inkoop = money(kosten.reduce((s, k) => s + money(k.prijs), 0));
  const verkoop = money(kosten.reduce((s, k) => s + money(k.verkoopprijs), 0));
  return {
    inkoop,
    verkoop,
    marge: money(verkoop - inkoop),
    regels: kosten.length,
    bevestigd: kosten.filter((k) => k.bevestigdBetaald).length,
  };
}
