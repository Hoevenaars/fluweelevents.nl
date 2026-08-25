import activities from "./handlers/activities.js";
import analytics from "./handlers/analytics.js";
import authLogin from "./handlers/auth/login.js";
import authLogout from "./handlers/auth/logout.js";
import authMe from "./handlers/auth/me.js";
import authStatus from "./handlers/auth/status.js";
import campaigns from "./handlers/campaigns.js";
import content from "./handlers/content.js";
import invoices from "./handlers/invoices.js";
import leads from "./handlers/leads.js";
import phases from "./handlers/phases.js";
import portalQuote from "./handlers/portal/quote.js";
import projects from "./handlers/projects.js";
import quotes from "./handlers/quotes.js";
import sendEmail from "./handlers/send-email.js";
import submissions from "./handlers/submissions.js";
import tasks from "./handlers/tasks.js";
import typeformWebhook from "./handlers/webhooks/typeform.js";

/** Route table shared by Vercel catch-all and the local dev server. */
export const API_ROUTES = [
  ["POST", "/api/auth/login", authLogin],
  ["POST", "/api/auth/logout", authLogout],
  ["GET", "/api/auth/me", authMe],
  ["GET", "/api/auth/status", authStatus],
  ["GET", "/api/submissions", submissions],
  ["PATCH", "/api/submissions", submissions],
  ["GET", "/api/phases", phases],
  ["GET", "/api/leads", leads],
  ["POST", "/api/leads", leads],
  ["PATCH", "/api/leads", leads],
  ["GET", "/api/activities", activities],
  ["POST", "/api/activities", activities],
  ["GET", "/api/tasks", tasks],
  ["POST", "/api/tasks", tasks],
  ["PATCH", "/api/tasks", tasks],
  ["GET", "/api/tasks/ics", tasks],
  ["GET", "/api/quotes", quotes],
  ["POST", "/api/quotes", quotes],
  ["PATCH", "/api/quotes", quotes],
  ["DELETE", "/api/quotes", quotes],
  ["GET", "/api/quotes/pdf", quotes],
  ["POST", "/api/quotes/send", quotes],
  ["GET", "/api/invoices", invoices],
  ["POST", "/api/invoices", invoices],
  ["PATCH", "/api/invoices", invoices],
  ["GET", "/api/invoices/pdf", invoices],
  ["GET", "/api/invoices/moneybird", invoices],
  ["GET", "/api/projects", projects],
  ["POST", "/api/projects", projects],
  ["PATCH", "/api/projects", projects],
  ["GET", "/api/campaigns", campaigns],
  ["POST", "/api/campaigns", campaigns],
  ["POST", "/api/campaigns/send", campaigns],
  ["GET", "/api/analytics", analytics],
  ["GET", "/api/content/templates", content],
  ["GET", "/api/content/website", content],
  ["PATCH", "/api/content/website", content],
  ["POST", "/api/send-email", sendEmail],
  ["POST", "/api/webhooks/typeform", typeformWebhook],
  ["GET", "/api/portal/quote", portalQuote],
  ["POST", "/api/portal/quote", portalQuote],
];

export function resolveApiHandler(method, pathname) {
  const hit = API_ROUTES.find(([m, p]) => m === method && p === pathname);
  return hit ? hit[2] : null;
}
