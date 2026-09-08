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
  assert.equal(row.bevestigdBetaald, false);
});

test("normalize weigert een negatieve prijs", () => {
  assert.throws(() => normalizeProjectCostInput({ prijs: -1 }), /Prijs/);
});

test("costTotals telt inkoop, verkoop en bevestigde regels", () => {
  const totals = costTotals([
    { prijs: 100, verkoopprijs: 130, bevestigdBetaald: true },
    { prijs: 50, verkoopprijs: 50, bevestigdBetaald: false },
  ]);
  assert.equal(totals.inkoop, 150);
  assert.equal(totals.verkoop, 180);
  assert.equal(totals.marge, 30);
  assert.equal(totals.regels, 2);
  assert.equal(totals.bevestigd, 1);
});
