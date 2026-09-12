function mockVerdict({ title, criteria, fileName }) {
  if (!fileName) {
    return {
      result: "fail",
      confidence: 0.61,
      rationale: "No frame landed on the slip. Referee cannot stand the pact.",
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

function parseDataUrl(dataUrl) {
  const m = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  return { mime: m[1], data: m[2] };
}

function band(pass, confidence, rationale, source) {
  const conf = Math.min(1, Math.max(0, Number(confidence) || 0));
  if (conf >= 0.8) {
    return { result: pass ? "pass" : "fail", confidence: conf, rationale, source, auto: true };
  }
  if (conf < 0.4) {
    return {
      result: "fail",
      confidence: conf,
      rationale,
      source,
      auto: true,
    };
  }
  return { result: "review", confidence: conf, rationale, source, auto: false };
}

export async function judgeEvidence(input, env = process.env) {
  const key = env.GEMINI_API_KEY;
  const parsed = parseDataUrl(input.dataUrl);
  if (!key || !parsed) return mockVerdict(input);

  const prompt = `You are the referee for a 1v1 accountability pact.
Goal title: ${input.title}
Success criteria: ${input.criteria || "(none)"}
Decide if this photo is reasonably sufficient proof that the person did the thing.
Return JSON only: {"pass": boolean, "confidence": number between 0 and 1, "rationale": one short sentence}.
Do not reward self-harm, illegal activity, or eating-disorder content; fail those.`;

  const url =
    env.GEMINI_API_URL ||
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

  try {
    const res = await fetch(`${url}?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              { inlineData: { mimeType: parsed.mime, data: parsed.data } },
            ],
          },
        ],
        generationConfig: { temperature: 0.2 },
      }),
    });
    if (!res.ok) return mockVerdict(input);
    const body = await res.json();
    const text = body?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("\n") || "";
    const jsonText = text.replace(/^```json\s*|\s*```$/g, "").trim();
    const parsedJson = JSON.parse(jsonText);
    const pass = Boolean(parsedJson.pass);
    const confidence = Number(parsedJson.confidence);
    const rationale = String(parsedJson.rationale || "Gemini returned a verdict.").slice(0, 280);
    return band(pass, confidence, rationale, "gemini");
  } catch {
    return mockVerdict(input);
  }
}

export { mockVerdict, band };
