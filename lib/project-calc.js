export function money(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj || {}, key);
}

/** Bevestigd en betaald zijn losse statussen. Oude bevestigdBetaald-vlag telt als allebei. */
export function splitCostStatus(row = {}) {
  if (hasOwn(row, "bevestigd") || hasOwn(row, "betaald")) {
    return {
      bevestigd: Boolean(row.bevestigd),
      betaald: Boolean(row.betaald),
    };
  }
  const legacy = Boolean(row.bevestigd_betaald ?? row.bevestigdBetaald);
  return { bevestigd: legacy, betaald: legacy };
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
    ...splitCostStatus(body),
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
    bevestigd: kosten.filter((k) => k.bevestigd).length,
    betaald: kosten.filter((k) => k.betaald).length,
  };
}
