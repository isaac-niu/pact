/**
 * Person C referee client.
 *
 * Tries POST /api/referee (Vite plugin, Gemini Flash on the server).
 * If the plugin is down, the same filename mock the server uses still
 * lets Person A click through. Live Gemini never reads the filename.
 *
 * Contract: { title, criteria, fileName, dataUrl } →
 *   { result, confidence, rationale, source, auto, band, fallbackReason, model }
 */

export async function judgeEvidence({ title, criteria, fileName, dataUrl, ...extra }) {
  try {
    const res = await fetch("/api/referee", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, criteria, fileName, dataUrl, ...extra }),
    });
    if (res.ok) return await res.json();
  } catch {
    /* Vite plugin not running — fall through to local mock. */
  }

  if (!fileName) {
    return {
      result: "fail",
      confidence: 0.61,
      rationale: "No frame landed on the slip. Referee cannot stand the pact.",
      source: "mock",
      auto: true,
      band: "middle",
      fallbackReason: "desk_offline",
      model: null,
    };
  }
  const name = String(fileName).toLowerCase();
  if (/\b(blur|unsure|maybe)\b/.test(name)) {
    return {
      result: "review",
      confidence: 0.55,
      rationale: "Frame is too ambiguous for an auto call. Friend verifies.",
      source: "mock",
      auto: false,
      band: "middle",
      fallbackReason: "desk_offline",
      model: null,
    };
  }
  if (/\b(cat|dog|meme)\b/.test(name)) {
    return {
      result: "fail",
      confidence: 0.86,
      rationale: `This frame does not match the written goal (${fileName}).`,
      source: "mock",
      auto: true,
      band: "high",
      fallbackReason: "desk_offline",
      model: null,
    };
  }
  const goal = criteria?.trim()
    ? `Criteria held: ${criteria.trim().replace(/\.$/, "")}.`
    : `Slip title (“${title}”) is on-brief.`;
  return {
    result: "pass",
    confidence: 0.91,
    rationale: `Evidence matches the written goal. ${goal}`,
    source: "mock",
    auto: true,
    band: "high",
    fallbackReason: "desk_offline",
    model: null,
  };
}
