/**
 * Local-fallback referee (when Mongo desk is not up).
 * Production judging is server/gemini.js via the desk API.
 *
 * Contract: { title, criteria, fileName } →
 *   { result: "pass"|"fail"|"review", confidence, rationale, source, auto }
 *
 * Filename heuristics match Person C’s demo: gym.jpg pass, cat.jpg fail, blur.jpg review.
 */

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function judgeEvidence({ title, criteria, fileName }) {
  await delay(1100 + Math.round(Math.random() * 400));

  if (!fileName) {
    return {
      result: "fail",
      confidence: 0.61,
      rationale: "No frame landed on the slip. Referee cannot stand the pact.",
      source: "mock",
      auto: true,
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
    };
  }
  if (/\b(cat|dog|meme)\b/.test(name)) {
    return {
      result: "fail",
      confidence: 0.86,
      rationale: `This frame does not match the written goal (${fileName}).`,
      source: "mock",
      auto: true,
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
  };
}
