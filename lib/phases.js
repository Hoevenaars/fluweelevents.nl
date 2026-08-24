export const FASES = [
  { id: "nieuw", label: "Nieuw", hint: "Binnengekomen aanvragen" },
  { id: "contact", label: "In contact", hint: "Je bent in gesprek" },
  { id: "offerte", label: "Offerte", hint: "Offerte verstuurd" },
  { id: "gewonnen", label: "Gewonnen", hint: "Bevestigd event" },
  { id: "verloren", label: "Verloren", hint: "Niet doorgegaan" },
];

export const FASE_IDS = new Set(FASES.map((f) => f.id));

export function normalizeStatus(status) {
  return FASE_IDS.has(status) ? status : "nieuw";
}
