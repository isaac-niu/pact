import test from "node:test";
import assert from "node:assert/strict";
import { liveConfig } from "./deskStore.js";
import {
  band,
  DEFAULT_MODEL,
  getLastGeminiError,
  judgeEvidence,
  mockVerdict,
  parseDataUrl,
  resetLastGeminiError,
} from "./gemini.js";

const FLASH_OK = {
  candidates: [{ content: { parts: [{ text: '{"pass":true,"confidence":0.9,"rationale":"clear proof"}' }] } }],
};
const PROOF = {
  title: "Gym",
  criteria: "At the gym.",
  fileName: "gym.jpg",
  dataUrl: "data:image/png;base64,aGVsbG8=",
};

function withFetch(impl, fn) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = impl;
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      globalThis.fetch = originalFetch;
    });
}

test("uses an available Flash model by default", async () => {
  resetLastGeminiError();
  let requestedUrl = "";
  await withFetch(async (url) => {
    requestedUrl = String(url);
    return new Response(JSON.stringify(FLASH_OK), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }, async () => {
    const verdict = await judgeEvidence(PROOF, { GEMINI_API_KEY: "test-key" });
    assert.equal(DEFAULT_MODEL, "gemini-3.6-flash");
    assert.match(requestedUrl, /models\/gemini-3\.6-flash:generateContent$/);
    assert.equal(verdict.source, "gemini");
    assert.equal(verdict.result, "pass");
    assert.equal(getLastGeminiError(), null);
  });
});

test("missing key stays on the demo mock and does not call Flash", async () => {
  resetLastGeminiError();
  let called = false;
  await withFetch(async () => {
    called = true;
    return new Response("no", { status: 500 });
  }, async () => {
    const verdict = await judgeEvidence(PROOF, {});
    assert.equal(called, false);
    assert.equal(verdict.source, "mock");
    assert.equal(verdict.result, "pass");
    assert.equal(verdict.confidence, 0.91);
    assert.match(verdict.rationale, /Evidence matches the written goal/);
  });
});

test("HTTP error with a key is not the dummy 0.91 pass", async () => {
  resetLastGeminiError();
  await withFetch(async () => {
    return new Response(JSON.stringify({ error: { status: "RESOURCE_EXHAUSTED" } }), {
      status: 429,
      headers: { "content-type": "application/json" },
    });
  }, async () => {
    const verdict = await judgeEvidence(PROOF, { GEMINI_API_KEY: "test-key" });
    assert.equal(verdict.source, "gemini-error");
    assert.notEqual(verdict.result, "pass");
    assert.notEqual(verdict.confidence, 0.91);
    assert.equal(verdict.auto, false);
    assert.match(verdict.rationale, /credits/i);
    assert.match(verdict.rationale, /429/);
    assert.doesNotMatch(verdict.rationale, /Evidence matches the written goal/);
    assert.equal(verdict.error.kind, "credits");
    assert.equal(getLastGeminiError().kind, "credits");
    assert.equal(getLastGeminiError().status, 429);
    assert.equal(liveConfig({}).features.lastGeminiError.kind, "credits");
    assert.equal(JSON.stringify(verdict).includes("test-key"), false);
  });
});

test("other Flash HTTP failures name the status and stay non-pass", async () => {
  resetLastGeminiError();
  await withFetch(async () => new Response("nope", { status: 503 }), async () => {
    const verdict = await judgeEvidence(PROOF, { GEMINI_API_KEY: "test-key" });
    assert.equal(verdict.source, "gemini-error");
    assert.notEqual(verdict.result, "pass");
    assert.match(verdict.rationale, /HTTP 503/);
    assert.equal(getLastGeminiError().kind, "http");
    assert.equal(getLastGeminiError().status, 503);
  });
});

test("key without an image stays on the demo mock", async () => {
  resetLastGeminiError();
  let called = false;
  await withFetch(async () => {
    called = true;
    return new Response("no", { status: 500 });
  }, async () => {
    const verdict = await judgeEvidence(
      { title: "Gym", criteria: "At the gym.", fileName: "gym.jpg" },
      { GEMINI_API_KEY: "test-key" },
    );
    assert.equal(called, false);
    assert.equal(verdict.source, "mock");
  });
});

test("network failure with a key is not a mock pass", async () => {
  resetLastGeminiError();
  await withFetch(async () => {
    throw new Error("ECONNRESET");
  }, async () => {
    const verdict = await judgeEvidence(PROOF, { GEMINI_API_KEY: "test-key" });
    assert.equal(verdict.source, "gemini-error");
    assert.notEqual(verdict.result, "pass");
    assert.match(verdict.rationale, /network/);
    assert.equal(getLastGeminiError().kind, "network");
  });
});

test("unreadable Flash JSON is a parse error, not a mock pass", async () => {
  resetLastGeminiError();
  await withFetch(async () => {
    return new Response(
      JSON.stringify({ candidates: [{ content: { parts: [{ text: "not-json" }] } }] }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }, async () => {
    const verdict = await judgeEvidence(PROOF, { GEMINI_API_KEY: "test-key" });
    assert.equal(verdict.source, "gemini-error");
    assert.notEqual(verdict.result, "pass");
    assert.match(verdict.rationale, /parse/);
    assert.equal(getLastGeminiError().kind, "parse");
  });
});

test("high confidence auto-resolves a pass to the challenger", () => {
  const v = band(true, 0.88, "clear gym", "gemini");
  assert.equal(v.result, "pass");
  assert.equal(v.auto, true);
  assert.equal(v.source, "gemini");
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
});

test("present photo mock-passes so A can demo without a key", () => {
  const v = mockVerdict({
    title: "Gym selfie",
    fileName: "gym.jpg",
    criteria: "Face visible · gym iron visible",
    checklist: [
      { id: "sc_face", label: "Face visible" },
      { id: "sc_gym", label: "gym iron visible" },
    ],
  });
  assert.equal(v.result, "pass");
  assert.ok(v.confidence >= 0.8);
  assert.equal(v.auto, true);
  assert.equal(v.source, "mock");
  assert.equal(v.items.length, 2);
  assert.equal(v.items.every((row) => row.pass === true), true);
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
