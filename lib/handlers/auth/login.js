import { login } from "../../auth.js";
import { rejectUnlessAdminHost } from "../../admin-host.js";
import { json } from "../../http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { ok: false, error: "Methode niet toegestaan." });
  }
  if (rejectUnlessAdminHost(req, res)) return;

  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return json(res, 400, { ok: false, error: "Vul e-mail en wachtwoord in." });
    }

    const result = await login(email, password);
    if (!result.ok) {
      return json(res, 401, {
        ok: false,
        error: result.error || "Onjuiste inloggegevens.",
        code: result.code || null,
      });
    }

    if (result.provider === "supabase") {
      return json(res, 200, {
        ok: true,
        email: result.email,
        provider: result.provider,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    }

    return json(res, 200, {
      ok: true,
      email: result.email,
      provider: result.provider,
      accessToken: result.legacyToken,
    });
  } catch (err) {
    console.error(err);
    return json(res, 500, { ok: false, error: "Inloggen is nu niet mogelijk." });
  }
}
