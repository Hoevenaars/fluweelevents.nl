import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calcMargeBedrag,
  calcVerkoopprijs,
  costTotals,
  normalizeProjectCostInput,
} from "./project-calc.js";

test("verkoopprijs is prijs keer 1 plus marge", () => {
  assert.equal(calcVerkoopprijs(100, 30), 130);
  assert.equal(calcVerkoopprijs(250, 0), 250);
  assert.equal(calcVerkoopprijs("80.5", "20"), 96.6);
});

test("margebedrag is verkoop minus inkoop", () => {
  assert.equal(calcMargeBedrag(100, 130), 30);
});

test("normalize berekent verkoopprijs als die ontbreekt", () => {
  const row = normalizeProjectCostInput({
    leverancier: " Bloemist ",
    wat: "Boeket",
    prijs: 200,
    margePct: 25,
  });
  assert.equal(row.leverancier, "Bloemist");
  assert.equal(row.wat, "Boeket");
  assert.equal(row.prijs, 200);
  assert.equal(row.margePct, 25);
  assert.equal(row.verkoopprijs, 250);
  assert.equal(row.bevestigd, false);
  assert.equal(row.betaald, false);
});

test("normalize weigert een negatieve prijs", () => {
  assert.throws(() => normalizeProjectCostInput({ prijs: -1 }), /Prijs/);
});

test("normalize houdt bevestigd en betaald uit elkaar", () => {
  const alleenBevestigd = normalizeProjectCostInput({ bevestigd: true });
  assert.equal(alleenBevestigd.bevestigd, true);
  assert.equal(alleenBevestigd.betaald, false);

  const alleenBetaald = normalizeProjectCostInput({ betaald: true });
  assert.equal(alleenBetaald.bevestigd, false);
  assert.equal(alleenBetaald.betaald, true);
});

test("oude bevestigdBetaald-vlag telt als bevestigd én betaald", () => {
  const row = normalizeProjectCostInput({ bevestigdBetaald: true });
  assert.equal(row.bevestigd, true);
  assert.equal(row.betaald, true);
});

test("costTotals telt inkoop, verkoop en statussen apart", () => {
  const totals = costTotals([
    { prijs: 100, verkoopprijs: 130, bevestigd: true, betaald: false },
    { prijs: 50, verkoopprijs: 50, bevestigd: true, betaald: true },
  ]);
  assert.equal(totals.inkoop, 150);
  assert.equal(totals.verkoop, 180);
  assert.equal(totals.marge, 30);
  assert.equal(totals.regels, 2);
  assert.equal(totals.bevestigd, 2);
  assert.equal(totals.betaald, 1);
});
