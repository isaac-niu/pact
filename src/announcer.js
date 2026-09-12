const cache = new Map();
const MUTE_KEY = "pact.announcer.muted";

export function isMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setMuted(muted) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function announcementText(pact, winnerHandle) {
  const result = pact?.verdict?.result;
  const rationale = pact?.verdict?.rationale || "";
  const who = winnerHandle || "The winner";
  const outcome =
    result === "fail"
      ? `${who} takes the pot. The pact did not stand.`
      : `${who} completed the challenge. The pact is settled.`;
  const why = rationale ? ` Referee says: ${rationale}` : "";
  return `${pact?.title || "Pact"}. ${outcome}${why}`.replace(/\s+/g, " ").trim().slice(0, 400);
}

export async function fetchAnnouncementAudio(pact, winnerHandle) {
  if (!pact?.id || !pact.verdict) return null;
  if (cache.has(pact.id)) return cache.get(pact.id);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch("/api/announce", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        pactId: pact.id,
        text: announcementText(pact, winnerHandle),
        winner: winnerHandle,
        result: pact.verdict.result,
        rationale: pact.verdict.rationale,
        title: pact.title,
      }),
      signal: controller.signal,
    });
    if (res.status === 204 || !res.ok) {
      cache.set(pact.id, null);
      return null;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    cache.set(pact.id, url);
    return url;
  } catch {
    cache.set(pact.id, null);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchDeskConfig() {
  try {
    const res = await fetch("/api/config", { cache: "no-store" });
    if (!res.ok) return { announcer: false, features: {} };
    return await res.json();
  } catch {
    return { announcer: false, features: {}, local: true };
  }
}
