/** Desk ticker from GET /api/config. Honest about mock vs live Gemini. */

export function deskLine(cfg) {
  if (!cfg?.features) return "DESK OFFLINE";
  const { gemini, geminiLive, geminiError, geminiModel, mongo } = cfg.features;
  const desk = mongo ? "DESK UP" : "LOCAL DESK";
  if (geminiLive) return `GEMINI LIVE · ${geminiModel || "flash"} · ${desk}`;
  if (geminiError === "credits_depleted") {
    return `MOCK DESK · Gemini credits depleted · ${desk}`;
  }
  if (geminiError === "unauthorized") {
    return `MOCK DESK · Gemini key rejected · ${desk}`;
  }
  if (gemini) return `GEMINI KEY ON FILE · waiting on first live call · ${desk}`;
  return `MOCK DESK · no Gemini key · ${desk}`;
}

export async function fetchDeskConfig() {
  const res = await fetch("/api/config");
  if (!res.ok) throw new Error("desk_down");
  return res.json();
}
