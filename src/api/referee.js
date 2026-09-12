/**
 * Mocked referee. Person C can replace this module with Gemini Flash.
 * Contract: { title, criteria, fileName } → { result, confidence, rationale }
 * File present ⇒ eligible to pass. This desk always stands a real file.
 */

const PASS_LINES = [
  (goal) => `Clear frame on the desk. ${goal}`,
  (goal) => `Evidence matches the written goal. ${goal}`,
  (goal) => `Subject and setting read as legitimate. ${goal}`,
];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export async function judgeEvidence({ title, criteria, fileName }) {
  await delay(1100 + Math.round(Math.random() * 400));

  if (!fileName) {
    return {
      result: "fail",
      confidence: 0.61,
      rationale: "No frame landed on the slip. Referee cannot stand the pact.",
    };
  }

  const goal = criteria?.trim()
    ? `Criteria held: ${criteria.trim().replace(/\.$/, "")}.`
    : `Slip title (“${title}”) is on-brief.`;
  const line = PASS_LINES[Math.floor(Math.random() * PASS_LINES.length)];

  return {
    result: "pass",
    confidence: clamp(0.88 + Math.random() * 0.1, 0.86, 0.98),
    rationale: line(goal),
  };
}
