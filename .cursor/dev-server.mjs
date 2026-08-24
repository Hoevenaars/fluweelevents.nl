// Local development server for the Fluweel Events site.
//
// Production runs on Vercel: the static files are served directly and
// `api/*.js` runs as serverless functions. This harness reproduces that
// locally so `vercel dev` is not required inside a Cloud Agent.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PORT = Number(process.env.PORT) || 3000;
const MOCK_RESEND = !process.env.RESEND_API_KEY;

process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@fluweelevents.nl";
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "fluweel-admin-dev";
process.env.ADMIN_SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".txt": "text/plain; charset=utf-8",
};

function resolveApiHandler(method, pathname) {
  const routes = [
    ["POST", "/api/contact", "api/contact.js"],
    ["POST", "/api/auth/login", "api/auth/login.js"],
    ["POST", "/api/auth/logout", "api/auth/logout.js"],
    ["GET", "/api/auth/me", "api/auth/me.js"],
    ["GET", "/api/submissions", "api/submissions.js"],
    ["PATCH", "/api/submissions", "api/submissions.js"],
    ["GET", "/api/phases", "api/phases.js"],
    ["GET", "/api/leads", "api/leads.js"],
    ["PATCH", "/api/leads", "api/leads.js"],
    ["GET", "/api/activities", "api/activities.js"],
    ["POST", "/api/activities", "api/activities.js"],
    ["GET", "/api/tasks", "api/tasks.js"],
    ["POST", "/api/tasks", "api/tasks.js"],
    ["PATCH", "/api/tasks", "api/tasks.js"],
    ["GET", "/api/tasks/ics", "api/tasks.js"],
    ["GET", "/api/quotes", "api/quotes.js"],
    ["POST", "/api/quotes", "api/quotes.js"],
    ["PATCH", "/api/quotes", "api/quotes.js"],
    ["GET", "/api/quotes/pdf", "api/quotes.js"],
    ["POST", "/api/quotes/send", "api/quotes.js"],
    ["GET", "/api/invoices", "api/invoices.js"],
    ["POST", "/api/invoices", "api/invoices.js"],
    ["PATCH", "/api/invoices", "api/invoices.js"],
    ["GET", "/api/invoices/pdf", "api/invoices.js"],
    ["GET", "/api/invoices/moneybird", "api/invoices.js"],
    ["GET", "/api/projects", "api/projects.js"],
    ["PATCH", "/api/projects", "api/projects.js"],
    ["GET", "/api/campaigns", "api/campaigns.js"],
    ["POST", "/api/campaigns", "api/campaigns.js"],
    ["POST", "/api/campaigns/send", "api/campaigns.js"],
    ["GET", "/api/analytics", "api/analytics.js"],
    ["GET", "/api/content/templates", "api/content.js"],
    ["GET", "/api/content/website", "api/content.js"],
    ["PATCH", "/api/content/website", "api/content.js"],
    ["POST", "/api/send-email", "api/send-email.js"],
    ["POST", "/api/webhooks/typeform", "api/webhooks/typeform.js"],
    ["GET", "/api/portal/quote", "api/portal/quote.js"],
    ["POST", "/api/portal/quote", "api/portal/quote.js"],
  ];
  const hit = routes.find(([m, p]) => m === method && p === pathname);
  return hit ? hit[2] : null;
}

const handlerCache = new Map();

async function loadHandler(relativePath) {
  if (handlerCache.has(relativePath)) return handlerCache.get(relativePath);
  const mod = await import(pathToFileURL(join(ROOT, relativePath)).href);
  handlerCache.set(relativePath, mod.default);
  return mod.default;
}

if (MOCK_RESEND) {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input?.url;
    if (url && url.startsWith("https://api.resend.com/emails")) {
      let payload = {};
      try {
        payload = JSON.parse(init?.body ?? "{}");
      } catch {}
      console.log("[dev] Resend intercepted (no mail sent):", JSON.stringify(payload));
      return new Response(JSON.stringify({ id: "dev-mock-email-id" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return realFetch(input, init);
  };
  process.env.RESEND_API_KEY = "dev-mock-key";
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function makeVercelRes(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (obj) => {
    if (!res.getHeader("Content-Type")) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
    }
    res.end(JSON.stringify(obj));
    return res;
  };
  res.send = (data) => {
    res.end(data);
    return res;
  };
  return res;
}

async function handleApi(req, res, relativePath) {
  const raw = await readBody(req);
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("application/json")) {
    try {
      req.body = raw ? JSON.parse(raw) : {};
    } catch {
      req.body = {};
    }
  } else {
    req.body = raw;
  }
  req.url = req.url || "/";
  makeVercelRes(res);
  const handler = await loadHandler(relativePath);
  await handler(req, res);
}

async function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === "/") rel = "/index.html";
  if (rel === "/admin" || rel === "/admin/") rel = "/admin/index.html";
  if (rel === "/portal" || rel === "/portal/") rel = "/portal/index.html";

  let filePath = normalize(join(ROOT, rel));
  if (!filePath.startsWith(ROOT)) {
    res.statusCode = 403;
    return res.end("Forbidden");
  }

  if (!extname(filePath) && existsSync(filePath + ".html")) {
    filePath += ".html";
  }

  try {
    const data = await readFile(filePath);
    res.statusCode = 200;
    res.setHeader("Content-Type", MIME[extname(filePath)] || "application/octet-stream");
    return res.end(data);
  } catch {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    try {
      return res.end(await readFile(join(ROOT, "404.html")));
    } catch {
      return res.end("Not found");
    }
  }
}

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);

  try {
    const apiPath = resolveApiHandler(req.method, pathname);
    if (apiPath) {
      return await handleApi(req, res, apiPath);
    }
    return await serveStatic(req, res, pathname);
  } catch (err) {
    console.error("[dev] request error:", err);
    res.statusCode = 500;
    res.end("Internal server error");
  }
});

server.listen(PORT, async () => {
  const { getStorageMode } = await import("../lib/store.js");
  const { getAuthMode } = await import("../lib/auth.js");

  console.log(`[dev] Fluweel Events dev server on http://localhost:${PORT}`);
  console.log(`[dev] Access code (index.html gate): FLUWEEL26  ->  /preview.html`);
  console.log(`[dev] Admin werkomgeving: http://localhost:${PORT}/admin/`);
  console.log(`[dev] Opslag: ${getStorageMode()} · Auth: ${getAuthMode()}`);
  if (getAuthMode() === "legacy") {
    console.log(`[dev] Admin credentials: ${process.env.ADMIN_EMAIL} / ${process.env.ADMIN_PASSWORD}`);
  } else {
    console.log("[dev] Supabase Auth actief — log in met je Supabase-gebruiker.");
  }
  console.log(
    MOCK_RESEND
      ? "[dev] Resend API is mocked locally; no email is sent."
      : "[dev] RESEND_API_KEY set; contact form will call the real Resend API."
  );
});
