/**
 * Person C referee.
 *
 * Gemini Flash looks at the photo + written goal and returns
 * { pass, confidence, rationale, items }. Bands:
 *   ≥ 0.8  auto-resolve (pass → challenger, fail → friend)
 *   < 0.4  friend wins
 *   else   friend-verify fallback (a button, not a committee)
 *
 * Missing key / bad image / API error → mock so Person A can still demo.
 */

import {
  attachChecklistToVerdict,
  formatChecklistPrompt,
  pactChecklist,
} from "../src/lib/successCriteria.js";

export const DEFAULT_MODEL = "gemini-3.6-flash";
const FLASH_PATH = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

export function mockVerdict({ title, criteria, checklist, fileName } = {}) {
  if (!fileName) {
    return attachChecklistToVerdict(
      {
        result: "fail",
        confidence: 0.61,
        rationale: "No frame landed on the slip. Referee cannot stand the pact.",
        source: "mock",
        auto: true,
      },
      { title, criteria, checklist, fileName },
    );
  }
  const name = String(fileName).toLowerCase();
  if (/\b(blur|unsure|maybe)\b/.test(name)) {
    return attachChecklistToVerdict(
      band(true, 0.55, "Frame is too ambiguous for an auto call. Friend verifies.", "mock"),
      { title, criteria, checklist, fileName },
    );
  }
  if (/\b(cat|dog|meme)\b/.test(name)) {
    return attachChecklistToVerdict(
      band(false, 0.86, `This frame does not match the written goal (${fileName}).`, "mock"),
      { title, criteria, checklist, fileName },
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
    { title, criteria, checklist, fileName },
  );
}

export function band(pass, confidence, rationale, source) {
  const conf = Math.min(1, Math.max(0, Number(confidence) || 0));
  const line = String(rationale || "Referee returned a verdict.").slice(0, 280);
  if (conf >= 0.8) {
    return {
      result: pass ? "pass" : "fail",
      confidence: conf,
      rationale: line,
      source,
      auto: true,
    };
  }
  if (conf < 0.4) {
    return {
      result: "fail",
      confidence: conf,
      rationale: line,
      source,
      auto: true,
    };
  }
  return {
    result: "review",
    confidence: conf,
    rationale: line,
    source,
    auto: false,
  };
}

export function parseDataUrl(dataUrl) {
  const m = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  const mime = m[1].toLowerCase();
  if (!mime.startsWith("image/")) return null;
  return { mime, data: m[2] };
}

function extractJson(text) {
  const raw = String(text || "")
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .trim();
  try {
    return JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("no_json");
    return JSON.parse(m[0]);
  }
}

function candidateText(body) {
  const parts = body?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((p) => p.text)
    .filter(Boolean)
    .join("\n");
}

export function geminiEnabled(env = process.env) {
  return Boolean(env.GEMINI_API_KEY);
}

export async function judgeEvidence(input, env = process.env) {
  const key = env.GEMINI_API_KEY;
  const parsed = parseDataUrl(input.dataUrl);
  if (!key || !parsed) return mockVerdict(input);

  const items = pactChecklist(input);
  const checklistBlock = items.length
    ? `Success checklist (grade each line HOLD or MISS):\n${formatChecklistPrompt(items)}`
    : `Success criteria: ${input.criteria || "(none)"}`;
  const prompt = `You are the referee for a 1v1 accountability pact.
Goal title: ${input.title || "(untitled)"}
${checklistBlock}
Decide if this photo is reasonably sufficient proof that the person did the thing they promised.
Return JSON only: {"pass": boolean, "confidence": number between 0 and 1, "rationale": one short sentence, "items": [{"id": string, "pass": boolean, "note": "short HOLD/MISS reason"}]}.
Grade every checklist line. pass is true only if every required line holds.
Confidence is how sure you are of the pass/fail call, not how good the photo looks.
Do not reward self-harm, illegal activity, or eating-disorder content; fail those with high confidence.`;

  const url = env.GEMINI_API_URL || FLASH_PATH(env.GEMINI_MODEL || DEFAULT_MODEL);
  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType: parsed.mime, data: parsed.data } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn("gemini http", res.status, errText.slice(0, 240));
      return mockVerdict(input);
    }
    const body = await res.json();
    const parsedJson = extractJson(candidateText(body));
    const pass = Boolean(parsedJson.pass);
    const confidence = Number(parsedJson.confidence);
    const rationale = String(parsedJson.rationale || "Gemini returned a verdict.");
    return attachChecklistToVerdict(band(pass, confidence, rationale, "gemini"), input, parsedJson.items);
  } catch (err) {
    console.warn("gemini failed", err?.message || err);
    return mockVerdict(input);
  }
}
