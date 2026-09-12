const cache = new Map();

// Adam is always usable on the ElevenLabs free plan. Custom/library voices often 402.
export const FREE_PLAN_VOICE = "pNInz6obpgDQGcFmaJgB";
const DEFAULT_VOICE = FREE_PLAN_VOICE;

export function buildAnnouncement({ winner, result, rationale, title } = {}) {
  const who = winner || "The challenger";
  const outcome =
    result === "fail"
      ? `${who} takes the pot. The pact did not stand.`
      : `${who} completed the challenge. The pact is settled.`;
  const why = rationale ? ` Referee says: ${String(rationale).slice(0, 220)}` : "";
  const line = title ? `${title}. ${outcome}${why}` : `${outcome}${why}`;
  return line.replace(/\s+/g, " ").trim().slice(0, 400);
}

export async function synthesize(text, env = process.env) {
  const key = env.ELEVENLABS_API_KEY;
  if (!key || !text) return { disabled: true };

  const cacheKey = text;
  if (cache.has(cacheKey)) return { audio: cache.get(cacheKey), cached: true };

  const preferred = (env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE).trim();
  const voices = preferred === FREE_PLAN_VOICE ? [FREE_PLAN_VOICE] : [preferred, FREE_PLAN_VOICE];
  const model = env.ELEVENLABS_MODEL_ID || "eleven_turbo_v2_5";

  let lastStatus = 0;
  for (const voice of voices) {
    let res;
    try {
      res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
        method: "POST",
        headers: {
          "xi-api-key": key,
          accept: "audio/mpeg",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: model,
        }),
      });
    } catch {
      return { error: "announcer_unavailable" };
    }

    if (res.ok) {
      const audio = Buffer.from(await res.arrayBuffer());
      if (cache.size > 32) cache.clear();
      cache.set(cacheKey, audio);
      return { audio };
    }

    lastStatus = res.status;
    // 402 = payment required / voice not on this plan — try Adam next.
    if (res.status !== 402 && res.status !== 404) {
      return { error: "announcer_unavailable", status: res.status };
    }
  }

  return { error: "announcer_unavailable", status: lastStatus };
}
