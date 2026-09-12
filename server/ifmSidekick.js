/**
 * IFM sidekick — a color-commentator reaction sitting next to the referee's
 * verdict, powered by the Institute of Foundation Models' open K2 Horizon
 * models (https://ifm.ai), called through Hugging Face's OpenAI-compatible
 * router.
 *
 * This never decides pass/fail/review — Gemini (or the mock referee) has
 * already made that call by the time this runs. It only adds one flavor
 * line. Any failure here falls back to a canned line; it must never block,
 * delay materially, or change the actual verdict.
 */

export const DEFAULT_SIDEKICK_MODEL = "IFM/K2-Horizon-0.9B";
const ROUTER_URL = "https://router.huggingface.co/v1/chat/completions";
const SIDEKICK_TIMEOUT_MS = 8_000;

const SYSTEM_PROMPT =
  "You are the color commentator sitting next to the referee's desk at a " +
  "friendly accountability sportsbook. React to the referee's call in one " +
  "short, punchy line. Never change, contradict, or re-litigate the call " +
  "itself — you are reacting to it, not making it.";

const MOCK_LINES = {
  pass: [
    "Clean call. The desk isn't arguing with this one.",
    "That's a pass and nobody's mad about it.",
    "Book it — the stake's moving to the winner's side.",
  ],
  fail: [
    "Tough beat. The evidence just didn't hold up.",
    "That's a fail — the pot isn't staying put.",
    "No cover on this one. The referee isn't budging.",
  ],
  review: [
    "Too close to call automatically. Over to the friend for the real verdict.",
    "The desk's on the fence — someone's got to break the tie.",
    "Not enough to auto-settle. Friend, you're up.",
  ],
};

function mockLine(result) {
  const pool = MOCK_LINES[result] || MOCK_LINES.review;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return { text: pick, source: "mock" };
}

export function ifmEnabled(env = process.env) {
  return Boolean(env.HF_TOKEN);
}

/**
 * @param {{title?: string, result?: string, confidence?: number, rationale?: string}} verdict
 * @param {NodeJS.ProcessEnv} env
 */
export async function getSidekickLine(
  { title, result, confidence, rationale } = {},
  env = process.env,
) {
  if (!ifmEnabled(env)) return mockLine(result);

  const model = env.IFM_SIDEKICK_MODEL || DEFAULT_SIDEKICK_MODEL;
  const pct = Math.round((Number(confidence) || 0) * 100);
  const prompt =
    `Pact: "${title || "(untitled)"}". Referee call: ${result || "unknown"} ` +
    `(confidence ${pct}%). Rationale: ${rationale || "n/a"}. Write ONE short ` +
    "sportsbook color-commentator line reacting to this call, under 25 words. " +
    "No hashtags, no emoji, plain text only.";

  try {
    const res = await fetch(ROUTER_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.HF_TOKEN}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        max_tokens: 60,
        temperature: 0.9,
      }),
      signal: AbortSignal.timeout(Number(env.IFM_SIDEKICK_TIMEOUT_MS) || SIDEKICK_TIMEOUT_MS),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn("ifm sidekick http", res.status, body.slice(0, 240));
      return mockLine(result);
    }
    const body = await res.json();
    const text = String(body?.choices?.[0]?.message?.content || "").trim();
    if (!text) return mockLine(result);
    return { text: text.slice(0, 200), source: "ifm", model };
  } catch (err) {
    console.warn("ifm sidekick failed", err?.message || err);
    return mockLine(result);
  }
}
