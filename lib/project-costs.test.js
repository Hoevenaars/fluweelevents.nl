import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

process.env.FLUWEEL_CRM_FILE = join(tmpdir(), `fluweel-crm-${randomUUID()}.json`);

const {
  createProject,
  createProjectCost,
  deleteProjectCost,
  listProjects,
  updateProjectCost,
} = await import("./crm.js");

test("rekentoolregel hangt onder een project en herberekent verkoopprijs", async () => {
  const project = await createProject({ naam: "Gala · Test", klantNaam: "Acme" });
  const cost = await createProjectCost(project.id, {
    leverancier: "Licht & Geluid",
    wat: "PA-set",
    prijs: 400,
    margePct: 25,
  });

  assert.equal(cost.leverancier, "Licht & Geluid");
  assert.equal(cost.wat, "PA-set");
  assert.equal(cost.prijs, 400);
  assert.equal(cost.margePct, 25);
  assert.equal(cost.verkoopprijs, 500);
  assert.equal(cost.bevestigdBetaald, false);

  const listed = await listProjects();
  const found = listed.find((p) => p.id === project.id);
  assert.equal(found.kosten.length, 1);
  assert.equal(found.kosten[0].id, cost.id);

  const paid = await updateProjectCost(cost.id, { bevestigdBetaald: true });
  assert.equal(paid.bevestigdBetaald, true);
  assert.equal(paid.verkoopprijs, 500);

  const raised = await updateProjectCost(cost.id, { prijs: 600, margePct: 10 });
  assert.equal(raised.prijs, 600);
  assert.equal(raised.verkoopprijs, 660);
  assert.equal(raised.bevestigdBetaald, true);

  assert.equal(await deleteProjectCost(cost.id), true);
  const after = (await listProjects()).find((p) => p.id === project.id);
  assert.equal(after.kosten.length, 0);
});

test("rekentoolregel vereist een bestaand project", async () => {
  await assert.rejects(
    () => createProjectCost(randomUUID(), { wat: "Niks" }),
    /niet gevonden/i,
  );
});
