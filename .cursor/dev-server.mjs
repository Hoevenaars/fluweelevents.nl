// Local development server for the Fluweel Events site.
//
// Production runs on Vercel: the static files are served directly and
// `api/contact.js` runs as a serverless function. This harness reproduces that
// locally with only the Node standard library so `vercel dev` (and a Vercel
// login) is not required inside a Cloud Agent:
//   * static files are served from the repository root;
//   * POST /api/contact is routed to the real handler in api/contact.js,
//     wrapped in a Vercel-compatible request/response shim;
//   * the outbound call to the Resend email API is intercepted so the happy
//     path can be exercised without a real RESEND_API_KEY or sending mail.
//     Set RESEND_API_KEY to a real value to disable the mock and hit Resend.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PORT = Number(process.env.PORT) || 3000;
const MOCK_RESEND = !process.env.RESEND_API_KEY;

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

// Intercept the Resend email API in local dev so the contact handler's happy
// path succeeds without sending real mail. Any other request passes through.
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

// api/contact.js uses ESM syntax in a .js file. Without a root package.json
// declaring "type": "module", Node treats .js as CommonJS, so it is loaded via
// a data: URL to evaluate it as a real ES module. The handler has no imports of
// its own and reads process.env / global fetch, so this is faithful to Vercel.
async function loadContactHandler() {
  const source = await readFile(join(ROOT, "api", "contact.js"), "utf8");
  const dataUrl =
    "data:text/javascript;base64," + Buffer.from(source, "utf8").toString("base64");
  const mod = await import(dataUrl);
  return mod.default;
}

const contactHandler = await loadContactHandler();

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

// Minimal Vercel-style response shim: res.status().json() / .send() / .end().
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

async function handleApiContact(req, res) {
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
  makeVercelRes(res);
  await contactHandler(req, res);
}

async function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === "/") rel = "/index.html";

  // Prevent path traversal outside the project root.
  let filePath = normalize(join(ROOT, rel));
  if (!filePath.startsWith(ROOT)) {
    res.statusCode = 403;
    return res.end("Forbidden");
  }

  // Allow extension-less URLs to resolve to their .html file.
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
    if (pathname === "/api/contact") {
      return await handleApiContact(req, res);
    }
    return await serveStatic(req, res, pathname);
  } catch (err) {
    console.error("[dev] request error:", err);
    res.statusCode = 500;
    res.end("Internal server error");
  }
});

server.listen(PORT, () => {
  console.log(`[dev] Fluweel Events dev server on http://localhost:${PORT}`);
  console.log(`[dev] Access code (index.html gate): FLUWEEL26  ->  /preview.html`);
  console.log(
    MOCK_RESEND
      ? "[dev] Resend API is mocked locally; no email is sent."
      : "[dev] RESEND_API_KEY set; contact form will call the real Resend API."
  );
});
