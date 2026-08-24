import { login } from "../../lib/auth.js";
import { json, setLegacySessionCookie, setSessionCookies } from "../../lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { ok: false, error: "Methode niet toegestaan." });
  }

  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return json(res, 400, { ok: false, error: "Vul e-mail en wachtwoord in." });
    }

    const result = await login(email, password);
    if (!result.ok) {
      return json(res, 401, { ok: false, error: "Onjuiste inloggegevens." });
    }

    if (result.provider === "supabase") {
      setSessionCookies(res, result.accessToken, result.refreshToken);
    } else {
      setLegacySessionCookie(res, result.legacyToken);
    }

    return json(res, 200, { ok: true, email: result.email });
  } catch (err) {
    console.error(err);
    return json(res, 500, { ok: false, error: "Inloggen is nu niet mogelijk." });
  }
}
