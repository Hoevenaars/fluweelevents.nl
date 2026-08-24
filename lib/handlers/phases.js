import { FASES } from "../phases.js";

export { FASES };

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Methode niet toegestaan." });
  }

  return res.status(200).json({ ok: true, fases: FASES });
}
