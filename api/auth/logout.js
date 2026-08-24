import { logout } from "../../lib/auth.js";
import { json } from "../../lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { ok: false, error: "Methode niet toegestaan." });
  }

  await logout(req, res);
  return json(res, 200, { ok: true });
}
