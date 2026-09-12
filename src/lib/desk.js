/** Desk ticker from GET /api/config. Honest about mock vs live Gemini. */

export function deskLine(cfg) {
  if (!cfg?.features) return "DESK OFFLINE";
  const { gemini, geminiLive, geminiError, geminiModel, mongo } = cfg.features;
  const grid = mongo ? "GRIDFS UP" : "GRIDFS DOWN";
  if (geminiLive) return `GEMINI LIVE · ${geminiModel || "flash"} · ${grid}`;
  if (geminiError === "credits_depleted") {
    return `MOCK DESK · Gemini credits depleted · ${grid}`;
  }
  if (geminiError === "unauthorized") {
    return `MOCK DESK · Gemini key rejected · ${grid}`;
  }
  if (gemini) return `GEMINI KEY ON FILE · waiting on first live call · ${grid}`;
  return `MOCK DESK · no Gemini key · ${grid}`;
}

export async function fetchDeskConfig() {
  const res = await fetch("/api/config");
  if (!res.ok) throw new Error("desk_down");
  return res.json();
}
