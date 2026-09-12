/**
 * Person C referee.
 *
 * Gemini Flash looks at the photo + written goal and returns
 * { pass, confidence, rationale }. Bands:
 *   ≥ 0.8  auto-resolve (pass → challenger, fail → friend)
 *   < 0.4  friend wins
 *   else   friend-verify fallback (a button, not a committee)
 *
 * Missing key / bad image / API error → mock so Person A can still demo.
 * Filename mock is demo-only. Live Gemini never reads the filename.
 */

import { createHash } from "node:crypto";

export const DEFAULT_MODEL = "gemini-3.6-flash";
export const FLASH_MODELS = [
  "gemini-3.6-flash",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
];

const FLASH_PATH = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const VERDICT_SCHEMA = {
  type: "OBJECT",
  properties: {
    pass: { type: "BOOLEAN" },
    confidence: { type: "NUMBER" },
    rationale: { type: "STRING" },
  },
  required: ["pass", "confidence", "rationale"],
};

/** In-process desk ticker. Last live Gemini call or last classified error. */
const status = {
  lastLiveAt: null,
  lastModel: null,
  lastError: null,
};

export function geminiStatus() {
  return { ...status, lastError: status.lastError ? { ...status.lastError } : null };
}

export function resetGeminiStatus() {
  status.lastLiveAt = null;
  status.lastModel = null;
  status.lastError = null;
}

export function modelsToTry(env = process.env) {
  const primary = env.GEMINI_MODEL || DEFAULT_MODEL;
  return [...new Set([primary, ...FLASH_MODELS])];
}

export function evidenceHash(dataBase64) {
  if (!dataBase64) return null;
  return createHash("sha256").update(Buffer.from(String(dataBase64), "base64")).digest("hex");
}

export function classifyGeminiError(httpStatus, bodyText = "") {
  const text = String(bodyText || "");
  const lower = text.toLowerCase();
  if (httpStatus === 429 || /resource_exhausted|quota|credits?.deplet|billing/i.test(text)) {
    return "credits_depleted";
  }
  if (httpStatus === 401 || httpStatus === 403 || /api.?key|permission|unauthorized/i.test(lower)) {
    return "unauthorized";
  }
  if (httpStatus === 404 || /not found|not supported for|unknown model/i.test(lower)) {
    return "model_not_found";
  }
  if (!httpStatus) return "parse_error";
  return "http_error";
}

export function bandName(confidence) {
  const conf = Math.min(1, Math.max(0, Number(confidence) || 0));
  if (conf >= 0.8) return "high";
  if (conf < 0.4) return "low";
  return "middle";
}

export function stampVerdict(verdict, extras = {}) {
  const confidence = Math.min(1, Math.max(0, Number(verdict.confidence) || 0));
  return {
    ...verdict,
    confidence,
    band: extras.band ?? verdict.band ?? bandName(confidence),
    model: extras.model !== undefined ? extras.model : (verdict.model ?? null),
    fallbackReason:
      extras.fallbackReason !== undefined ? extras.fallbackReason : (verdict.fallbackReason ?? null),
    evidenceHash:
      extras.evidenceHash !== undefined ? extras.evidenceHash : (verdict.evidenceHash ?? null),
  };
}

export function mockVerdict({ title, criteria, fileName } = {}, extras = {}) {
  if (!fileName) {
    return stampVerdict(
      {
        result: "fail",
        confidence: 0.61,
        rationale: "No frame landed on the slip. Referee cannot stand the pact.",
        source: "mock",
        auto: true,
      },
      { fallbackReason: extras.fallbackReason ?? "no_image", model: extras.model ?? null, evidenceHash: extras.evidenceHash ?? null },
    );
  }
  const name = String(fileName).toLowerCase();
  if (/\b(blur|unsure|maybe)\b/.test(name)) {
    return stampVerdict(
      band(true, 0.55, "Frame is too ambiguous for an auto call. Friend verifies.", "mock"),
      { fallbackReason: extras.fallbackReason ?? "mock_filename", model: extras.model ?? null, evidenceHash: extras.evidenceHash ?? null },
    );
  }
  if (/\b(cat|dog|meme)\b/.test(name)) {
    return stampVerdict(
      band(false, 0.86, `This frame does not match the written goal (${fileName}).`, "mock"),
      { fallbackReason: extras.fallbackReason ?? "mock_filename", model: extras.model ?? null, evidenceHash: extras.evidenceHash ?? null },
    );
  }
  const goal = criteria?.trim()
    ? `Criteria held: ${criteria.trim().replace(/\.$/, "")}.`
    : `Slip title (“${title}”) is on-brief.`;
  return stampVerdict(
    {
      result: "pass",
      confidence: 0.91,
      rationale: `Evidence matches the written goal. ${goal}`,
      source: "mock",
      auto: true,
    },
    { fallbackReason: extras.fallbackReason ?? "mock_filename", model: extras.model ?? null, evidenceHash: extras.evidenceHash ?? null },
  );
}

export function band(pass, confidence, rationale, source) {
  const conf = Math.min(1, Math.max(0, Number(confidence) || 0));
  const line = String(rationale || "Referee returned a verdict.").slice(0, 280);
  if (conf >= 0.8) {
    return stampVerdict({
      result: pass ? "pass" : "fail",
      confidence: conf,
      rationale: line,
      source,
      auto: true,
    });
  }
  if (conf < 0.4) {
    return stampVerdict({
      result: "fail",
      confidence: conf,
      rationale: line,
      source,
      auto: true,
    });
  }
  return stampVerdict({
    result: "review",
    confidence: conf,
    rationale: line,
    source,
    auto: false,
  });
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

function refereePrompt(input) {
  return `You are the floor referee for a 1v1 accountability pact, not a cheerleader.
Goal title: ${input.title || "(untitled)"}
Success criteria: ${input.criteria || "(none)"}

Decide if this photo is reasonably sufficient proof that the person did the thing they promised.
Rules:
- Judge the pixels against the written criteria. Ignore the filename.
- Pass only if a reasonable friend would accept this as proof of the promise.
- A related object in the background is not enough if the criteria ask for the person doing the thing.
- A screenshot of a chat claiming they did it is a fail unless the criteria are specifically about a screenshot.
- Do not reward self-harm, illegal activity, or eating-disorder content; fail those with confidence ≥ 0.9.
- Confidence is how sure you are of the pass/fail call, not how pretty the photo is.
Return JSON only: {"pass": boolean, "confidence": number between 0 and 1, "rationale": one short sentence}.`;
}

function generationConfig(withSchema) {
  const config = {
    temperature: 0.15,
    responseMimeType: "application/json",
  };
  if (withSchema) config.responseSchema = VERDICT_SCHEMA;
  return config;
}

async function callFlash({ url, key, prompt, parsed, withSchema, fetchImpl }) {
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
    generationConfig: generationConfig(withSchema),
  };

  const res = await fetchImpl(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": key,
    },
    body: JSON.stringify(payload),
  });

  const errText = res.ok ? "" : await res.text().catch(() => "");
  return { res, errText };
}

function rememberError(code, httpStatus, model) {
  status.lastError = {
    code,
    status: httpStatus || null,
    model: model || null,
    at: Date.now(),
  };
}

function rememberLive(model) {
  status.lastLiveAt = Date.now();
  status.lastModel = model;
  status.lastError = null;
}

/**
 * @param {object} input
 * @param {NodeJS.ProcessEnv} [env]
 * @param {typeof fetch} [fetchImpl]
 */
export async function judgeEvidence(input, env = process.env, fetchImpl = fetch) {
  const key = env.GEMINI_API_KEY;
  const parsed = parseDataUrl(input.dataUrl);
  const hash = parsed ? evidenceHash(parsed.data) : null;

  if (!parsed) {
    return mockVerdict(input, { fallbackReason: "no_image", evidenceHash: hash });
  }
  if (!key) {
    return mockVerdict(input, { fallbackReason: "no_key", evidenceHash: hash });
  }

  const prompt = refereePrompt(input);
  const overrideUrl = env.GEMINI_API_URL;
  const models = overrideUrl ? [env.GEMINI_MODEL || DEFAULT_MODEL] : modelsToTry(env);
  let lastReason = "http_error";
  let lastModel = models[0];

  for (const model of models) {
    lastModel = model;
    const url = overrideUrl || FLASH_PATH(model);
    status.lastModel = model;

    try {
      let { res, errText } = await callFlash({
        url,
        key,
        prompt,
        parsed,
        withSchema: true,
        fetchImpl,
      });

      if (!res.ok && res.status === 400) {
        ({ res, errText } = await callFlash({
          url,
          key,
          prompt,
          parsed,
          withSchema: false,
          fetchImpl,
        }));
      }

      if (!res.ok) {
        const code = classifyGeminiError(res.status, errText);
        lastReason = code;
        console.warn("gemini http", model, res.status, errText.slice(0, 240));
        rememberError(code, res.status, model);
        if (code === "credits_depleted" || code === "unauthorized") break;
        continue;
      }

      const body = await res.json();
      const parsedJson = extractJson(candidateText(body));
      const pass = Boolean(parsedJson.pass);
      const confidence = Number(parsedJson.confidence);
      const rationale = String(parsedJson.rationale || "Gemini returned a verdict.");
      rememberLive(model);
      return stampVerdict(band(pass, confidence, rationale, "gemini"), {
        model,
        fallbackReason: null,
        evidenceHash: hash,
      });
    } catch (err) {
      lastReason = "parse_error";
      console.warn("gemini failed", model, err?.message || err);
      rememberError("parse_error", null, model);
    }
  }

  return mockVerdict(input, {
    fallbackReason: lastReason,
    model: lastModel,
    evidenceHash: hash,
  });
}
