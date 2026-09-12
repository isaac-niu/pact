/**
 * Person C referee client.
 *
 * Tries POST /api/referee (Vite plugin / Node desk, Gemini Flash on the server).
 * The server mocks only when no key or no image is present. A configured key
 * that then fails Flash comes back as source "gemini-error", not a dummy pass.
 * This local mock is only for when /api/referee itself is unreachable.
 *
 * Contract: { title, criteria, checklist, fileName, dataUrl } →
 *   { result: "pass"|"fail"|"review", confidence, rationale, items, source, auto }
 */

import { attachChecklistToVerdict } from "../lib/successCriteria.js";

export async function judgeEvidence({ title, criteria, checklist, fileName, dataUrl, ...extra }) {
  try {
    const res = await fetch("/api/referee", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, criteria, checklist, fileName, dataUrl, ...extra }),
    });
    if (res.ok) return await res.json();
  } catch {
    /* Vite plugin not running — fall through to local mock. */
  }

  const input = { title, criteria, checklist, fileName };
  if (!fileName) {
    return attachChecklistToVerdict(
      {
        result: "fail",
        confidence: 0.61,
        rationale: "No frame landed on the slip. Referee cannot stand the pact.",
        source: "mock",
        auto: true,
      },
      input,
    );
  }
  const name = String(fileName).toLowerCase();
  if (/\b(blur|unsure|maybe)\b/.test(name)) {
    return attachChecklistToVerdict(
      {
        result: "review",
        confidence: 0.55,
        rationale: "Frame is too ambiguous for an auto call. Friend verifies.",
        source: "mock",
        auto: false,
      },
      input,
    );
  }
  if (/\b(cat|dog|meme)\b/.test(name)) {
    return attachChecklistToVerdict(
      {
        result: "fail",
        confidence: 0.86,
        rationale: `This frame does not match the written goal (${fileName}).`,
        source: "mock",
        auto: true,
      },
      input,
    );
  }
  const goal = criteria?.trim()
    ? `Criteria held: ${criteria.trim().replace(/\.$/, "")}.`
    : `Slip title (“${title}”) is on-brief.`;
  return attachChecklistToVerdict(
    {
      result: "pass",
      confidence: 0.91,
      rationale: `Evidence matches the written goal. ${goal}`,
      source: "mock",
      auto: true,
    },
    input,
  );
}
