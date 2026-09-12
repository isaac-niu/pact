const cache = new Map();

const DEFAULT_VOICE = "pNInz6obpgDQGcFmaJgB"; // Adam — works on ElevenLabs free (library voices 402)

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

  const voice = env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE;
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice}`;

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": key,
        accept: "audio/mpeg",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: env.ELEVENLABS_MODEL_ID || "eleven_turbo_v2_5",
      }),
    });
  } catch {
    return { error: "announcer_unavailable" };
  }

  if (!res.ok) return { error: "announcer_unavailable", status: res.status };

  const audio = Buffer.from(await res.arrayBuffer());
  if (cache.size > 32) cache.clear();
  cache.set(cacheKey, audio);
  return { audio };
}
