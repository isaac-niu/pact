import test from "node:test";
import assert from "node:assert/strict";
import { handleRefereeApi } from "./refereePlugin.js";

function mockReq(url, method = "GET") {
  return {
    url,
    method,
    resume() {},
  };
}

function mockRes() {
  return {
    statusCode: 0,
    headers: {},
    body: null,
    headersSent: false,
    setHeader(k, v) {
      this.headers[k] = v;
    },
    writeHead(status) {
      this.statusCode = status;
      this.headersSent = true;
    },
    end(data) {
      this.body = data ?? null;
      this.headersSent = true;
      if (!this.statusCode) this.statusCode = 200;
    },
  };
}

test("announce is a 204 no-op when ElevenLabs key is unset", async () => {
  const prev = process.env.ELEVENLABS_API_KEY;
  delete process.env.ELEVENLABS_API_KEY;
  const res = mockRes();
  try {
    const handled = await handleRefereeApi(mockReq("/api/announce", "POST"), res);
    assert.equal(handled, true);
    assert.equal(res.statusCode, 204);
  } finally {
    if (prev === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = prev;
  }
});

test("announce falls through when ElevenLabs is configured", async () => {
  const prev = process.env.ELEVENLABS_API_KEY;
  process.env.ELEVENLABS_API_KEY = "test-key";
  const res = mockRes();
  try {
    const handled = await handleRefereeApi(mockReq("/api/announce", "POST"), res);
    assert.equal(handled, false);
    assert.equal(res.statusCode, 0);
  } finally {
    if (prev === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = prev;
  }
});

test("config reports announcer disabled without ElevenLabs key", async () => {
  const prev = process.env.ELEVENLABS_API_KEY;
  delete process.env.ELEVENLABS_API_KEY;
  const res = mockRes();
  try {
    const handled = await handleRefereeApi(mockReq("/api/config"), res);
    assert.equal(handled, true);
    const body = JSON.parse(res.body);
    assert.equal(body.announcer, false);
    assert.equal(body.features.elevenlabs, false);
    assert.equal("lastGeminiError" in body.features, true);
    assert.equal(JSON.stringify(body).includes("test-key"), false);
  } finally {
    if (prev === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = prev;
  }
});

const PNG = "data:image/png;base64,aGVsbG8=";

test("POST /api/referee without a key still mock-passes for the demo", async () => {
  const prev = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  const res = mockRes();
  try {
    const handled = await handleRefereeApi(mockReq("/api/referee", "POST"), res, {
      readJson: async () => ({
        title: "Gym",
        criteria: "At the gym.",
        fileName: "gym.jpg",
        dataUrl: PNG,
      }),
    });
    assert.equal(handled, true);
    const body = JSON.parse(res.body);
    assert.equal(body.source, "mock");
    assert.equal(body.result, "pass");
    assert.equal(body.confidence, 0.91);
  } finally {
    if (prev === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = prev;
  }
});

test("POST /api/referee with a key and a Flash-shaped response is source gemini", async () => {
  const prev = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = "test-key";
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        candidates: [{ content: { parts: [{ text: '{"pass":true,"confidence":0.9,"rationale":"clear proof"}' }] } }],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  const res = mockRes();
  try {
    const handled = await handleRefereeApi(mockReq("/api/referee", "POST"), res, {
      readJson: async () => ({
        title: "Gym",
        criteria: "At the gym.",
        fileName: "gym.jpg",
        dataUrl: PNG,
      }),
    });
    assert.equal(handled, true);
    const body = JSON.parse(res.body);
    assert.equal(body.source, "gemini");
    assert.equal(body.result, "pass");
  } finally {
    globalThis.fetch = originalFetch;
    if (prev === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = prev;
  }
});

test("POST /api/referee with a key and Flash HTTP error is not a dummy pass", async () => {
  const prev = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = "test-key";
  globalThis.fetch = async () => new Response("nope", { status: 429 });
  const res = mockRes();
  try {
    const handled = await handleRefereeApi(mockReq("/api/referee", "POST"), res, {
      readJson: async () => ({
        title: "Gym",
        criteria: "At the gym.",
        fileName: "gym.jpg",
        dataUrl: PNG,
      }),
    });
    assert.equal(handled, true);
    const body = JSON.parse(res.body);
    assert.equal(body.source, "gemini-error");
    assert.notEqual(body.result, "pass");
    assert.notEqual(body.confidence, 0.91);
    assert.match(body.rationale, /credits|HTTP 429/);
    assert.doesNotMatch(body.rationale, /Evidence matches the written goal/);

    const cfg = mockRes();
    await handleRefereeApi(mockReq("/api/config"), cfg);
    const features = JSON.parse(cfg.body).features;
    assert.equal(features.lastGeminiError.kind, "credits");
    assert.equal(features.lastGeminiError.status, 429);
    assert.equal(JSON.stringify(features.lastGeminiError).includes("test-key"), false);
  } finally {
    globalThis.fetch = originalFetch;
    if (prev === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = prev;
  }
});
