import { listTasks, createTask, updateTask } from "../crm.js";
import { generateIcs } from "../pdf.js";
import { withAuth, methodNotAllowed } from "../api-handler.js";
import { json } from "../http.js";

export default async function handler(req, res) {
  const url = new URL(req.url || "/", "http://x");

  if (url.pathname.endsWith("/ics") && req.method === "GET") {
    return withAuth(req, res, async () => {
      const tasks = await listTasks({ today: false });
      const events = tasks.filter((t) => t.deadline && !t.voltooid).slice(0, 20);
      let ics = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Fluweel Events//CRM//NL\r\n";
      for (const t of events) {
        const start = new Date(t.deadline + "T09:00:00");
        ics += generateIcs({ titel: t.titel, omschrijving: t.omschrijving, start, end: new Date(start.getTime() + 3600000) })
          .split("\r\n").slice(1, -2).join("\r\n") + "\r\n";
      }
      ics += "END:VCALENDAR";
      res.status(200);
      res.setHeader("Content-Type", "text/calendar; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=fluweel-taken.ics");
      return res.send(ics);
    });
  }

  return withAuth(req, res, async () => {
    if (req.method === "GET") {
      const today = url.searchParams.get("today") === "1";
      const leadId = url.searchParams.get("leadId");
      const tasks = await listTasks({ today, leadId });
      return json(res, 200, { ok: true, tasks });
    }
    if (req.method === "POST") {
      const task = await createTask(req.body || {});
      return json(res, 201, { ok: true, task });
    }
    if (req.method === "PATCH") {
      const { id, ...updates } = req.body || {};
      if (!id) return json(res, 400, { ok: false, error: "id verplicht." });
      const task = await updateTask(id, updates);
      if (!task) return json(res, 404, { ok: false, error: "Niet gevonden." });
      return json(res, 200, { ok: true, task });
    }
    return methodNotAllowed(res);
  });
}
