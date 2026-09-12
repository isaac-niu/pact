import test from "node:test";
import assert from "node:assert/strict";
import {
  band,
  bandName,
  classifyGeminiError,
  DEFAULT_MODEL,
  evidenceHash,
  judgeEvidence,
  mockVerdict,
  modelsToTry,
  parseDataUrl,
  resetGeminiStatus,
  geminiStatus,
} from "./gemini.js";

test("uses an available Flash model by default", async () => {
  resetGeminiStatus();
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  globalThis.fetch = async (url) => {
    requestedUrl = String(url);
    return new Response(
      JSON.stringify({
        candidates: [{ content: { parts: [{ text: '{"pass":true,"confidence":0.9,"rationale":"clear proof"}' }] } }],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };

  try {
    const verdict = await judgeEvidence(
      { title: "Gym", criteria: "Attend", dataUrl: "data:image/png;base64,aGVsbG8=" },
      { GEMINI_API_KEY: "test-key" },
    );
    assert.equal(DEFAULT_MODEL, "gemini-3.6-flash");
    assert.match(requestedUrl, /models\/gemini-3\.6-flash:generateContent/);
    assert.equal(verdict.source, "gemini");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("high confidence auto-resolves a pass to the challenger", () => {
  const v = band(true, 0.88, "clear gym", "gemini");
  assert.equal(v.result, "pass");
  assert.equal(v.auto, true);
  assert.equal(v.source, "gemini");
  assert.equal(v.band, "high");
});

test("exactly 0.8 is an auto call, 0.799 waits on a friend", () => {
  assert.equal(band(true, 0.8, "edge", "gemini").auto, true);
  assert.equal(band(true, 0.8, "edge", "gemini").result, "pass");
  const mid = band(true, 0.799, "edge", "gemini");
  assert.equal(mid.auto, false);
  assert.equal(mid.result, "review");
  assert.equal(mid.band, "middle");
});

test("exactly 0.4 waits on a friend, 0.399 is an auto-fail", () => {
  const floor = band(true, 0.4, "edge", "gemini");
  assert.equal(floor.result, "review");
  assert.equal(floor.auto, false);
  const low = band(true, 0.399, "edge", "gemini");
  assert.equal(low.result, "fail");
  assert.equal(low.auto, true);
  assert.equal(low.band, "low");
});

test("high confidence fail pays the friend", () => {
  const v = band(false, 0.92, "that's a cat", "gemini");
  assert.equal(v.result, "fail");
  assert.equal(v.auto, true);
});

test("low confidence is an auto-fail for the challenger", () => {
  const v = band(true, 0.2, "unclear", "gemini");
  assert.equal(v.result, "fail");
  assert.equal(v.auto, true);
});

test("middle confidence waits on a friend", () => {
  const v = band(true, 0.55, "maybe", "gemini");
  assert.equal(v.result, "review");
  assert.equal(v.auto, false);
});

test("missing photo mock-fails so the desk can still talk", () => {
  const v = mockVerdict({ title: "Gym", fileName: null });
  assert.equal(v.result, "fail");
  assert.equal(v.source, "mock");
  assert.equal(v.fallbackReason, "no_image");
});

test("present photo mock-passes so A can demo without a key", () => {
  const v = mockVerdict({ title: "Gym selfie", fileName: "gym.jpg", criteria: "Be at the gym." });
  assert.equal(v.result, "pass");
  assert.ok(v.confidence >= 0.8);
  assert.equal(v.auto, true);
  assert.equal(v.source, "mock");
});

test("cat photo mock-fails a gym goal so the demo still has a loss", () => {
  const v = mockVerdict({ title: "Gym selfie", fileName: "cat.jpg" });
  assert.equal(v.result, "fail");
  assert.equal(v.auto, true);
});

test("blurry filename parks in friend-verify", () => {
  const v = mockVerdict({ title: "Gym selfie", fileName: "blur.jpg" });
  assert.equal(v.result, "review");
  assert.equal(v.auto, false);
});

test("parseDataUrl accepts image payloads only", () => {
  assert.deepEqual(parseDataUrl("data:image/jpeg;base64,abc"), { mime: "image/jpeg", data: "abc" });
  assert.equal(parseDataUrl("data:text/plain;base64,abc"), null);
  assert.equal(parseDataUrl("not-a-data-url"), null);
});

test("bandName splits the house rules", () => {
  assert.equal(bandName(1), "high");
  assert.equal(bandName(0.8), "high");
  assert.equal(bandName(0.4), "middle");
  assert.equal(bandName(0.399), "low");
});

test("classifyGeminiError maps 429 credits and 404 models", () => {
  assert.equal(classifyGeminiError(429, '{"error":{"status":"RESOURCE_EXHAUSTED"}}'), "credits_depleted");
  assert.equal(classifyGeminiError(404, "model not found"), "model_not_found");
  assert.equal(classifyGeminiError(401, "API key not valid"), "unauthorized");
  assert.equal(classifyGeminiError(500, "boom"), "http_error");
});

test("evidenceHash is stable for the same bytes", () => {
  const a = evidenceHash("aGVsbG8=");
  const b = evidenceHash("aGVsbG8=");
  const c = evidenceHash("d29ybGQ=");
  assert.equal(a, b);
  assert.equal(a.length, 64);
  assert.notEqual(a, c);
});

test("modelsToTry puts GEMINI_MODEL first and de-dupes flash cascade", () => {
  const list = modelsToTry({ GEMINI_MODEL: "gemini-3.6-flash" });
  assert.equal(list[0], "gemini-3.6-flash");
  assert.ok(list.includes("gemini-2.5-flash"));
  assert.equal(new Set(list).size, list.length);
});

test("no key returns a mock with fallbackReason no_key", async () => {
  resetGeminiStatus();
  const v = await judgeEvidence(
    { title: "Gym", fileName: "gym.jpg", dataUrl: "data:image/jpeg;base64,abc" },
    {},
  );
  assert.equal(v.source, "mock");
  assert.equal(v.fallbackReason, "no_key");
  assert.equal(v.result, "pass");
  assert.ok(v.evidenceHash);
});

test("429 falls to mock with credits_depleted and does not try the next model", async () => {
  resetGeminiStatus();
  const hits = [];
  const fetchImpl = async (url) => {
    hits.push(url);
    return {
      ok: false,
      status: 429,
      text: async () => JSON.stringify({ error: { status: "RESOURCE_EXHAUSTED", message: "quota" } }),
    };
  };
  const v = await judgeEvidence(
    { title: "Gym", fileName: "gym.jpg", dataUrl: "data:image/jpeg;base64,abc" },
    { GEMINI_API_KEY: "x", GEMINI_MODEL: "gemini-3.6-flash" },
    fetchImpl,
  );
  assert.equal(v.source, "mock");
  assert.equal(v.fallbackReason, "credits_depleted");
  assert.equal(v.result, "pass");
  assert.equal(hits.length, 1);
  assert.equal(geminiStatus().lastError.code, "credits_depleted");
});

test("404 model tries the next flash model", async () => {
  resetGeminiStatus();
  const hits = [];
  const fetchImpl = async (url) => {
    hits.push(url);
    if (String(url).includes("gemini-3.6-flash")) {
      return { ok: false, status: 404, text: async () => "not found" };
    }
    return {
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: '{"pass":true,"confidence":0.91,"rationale":"gym visible"}' }],
            },
          },
        ],
      }),
    };
  };
  const v = await judgeEvidence(
    { title: "Gym", fileName: "cat.jpg", dataUrl: "data:image/jpeg;base64,abc" },
    { GEMINI_API_KEY: "x", GEMINI_MODEL: "gemini-3.6-flash" },
    fetchImpl,
  );
  assert.equal(v.source, "gemini");
  assert.equal(v.result, "pass");
  assert.equal(v.model, "gemini-2.5-flash");
  assert.equal(v.fallbackReason, null);
  assert.ok(hits.length >= 2);
  assert.equal(geminiStatus().lastError, null);
  assert.equal(geminiStatus().lastModel, "gemini-2.5-flash");
});
