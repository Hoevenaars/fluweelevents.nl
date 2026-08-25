import assert from "node:assert/strict";
import { test } from "node:test";
import { pathForView, viewFromPath } from "./routes.js";

test("admin host uses /dashboard and /leads", () => {
  assert.equal(pathForView("dashboard", "admin.fluweelevents.nl"), "/dashboard");
  assert.equal(pathForView("leads", "admin.fluweelevents.nl"), "/leads");
  assert.equal(viewFromPath("/dashboard", "admin.fluweelevents.nl"), "dashboard");
  assert.equal(viewFromPath("/leads", "admin.fluweelevents.nl"), "leads");
  assert.equal(viewFromPath("/", "admin.fluweelevents.nl"), "dashboard");
});

test("public host keeps /admin paths", () => {
  assert.equal(pathForView("dashboard", "localhost"), "/admin/");
  assert.equal(pathForView("quotes", "localhost"), "/admin/quotes");
  assert.equal(viewFromPath("/admin/", "localhost"), "dashboard");
  assert.equal(viewFromPath("/admin/quotes", "fluweelevents.nl"), "quotes");
});

test("unknown paths fall back to dashboard", () => {
  assert.equal(viewFromPath("/niet-bestaand", "admin.fluweelevents.nl"), "dashboard");
  assert.equal(pathForView("nope", "admin.fluweelevents.nl"), "/dashboard");
});
