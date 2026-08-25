import assert from "node:assert/strict";
import { test } from "node:test";
import { getRequestHost, isAdminHost, isPublicCrmRoute } from "./admin-host.js";

test("admin host and local/preview are allowed", () => {
  assert.equal(isAdminHost({ headers: { host: "admin.fluweelevents.nl" } }), true);
  assert.equal(isAdminHost({ headers: { host: "localhost:3000" } }), true);
  assert.equal(isAdminHost({ headers: { host: "fluweel-git-abc.vercel.app" } }), true);
  assert.equal(isAdminHost({ headers: { host: "fluweelevents.nl" } }), false);
  assert.equal(isAdminHost({ headers: { host: "www.fluweelevents.nl" } }), false);
});

test("x-forwarded-host wins for proxies", () => {
  assert.equal(
    getRequestHost({
      headers: { host: "localhost", "x-forwarded-host": "admin.fluweelevents.nl, localhost" },
    }),
    "admin.fluweelevents.nl"
  );
});

test("portal and typeform stay public CRM routes", () => {
  assert.equal(isPublicCrmRoute("GET", "/api/portal/quote"), true);
  assert.equal(isPublicCrmRoute("POST", "/api/webhooks/typeform"), true);
  assert.equal(isPublicCrmRoute("GET", "/api/leads"), false);
});
