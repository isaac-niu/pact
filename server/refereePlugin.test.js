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

test("proof-signals hook is stubbed and never asks for a secret", async () => {
  const res = mockRes();
  const handled = await handleRefereeApi(mockReq("/api/proof-signals"), res);
  assert.equal(handled, true);
  const body = JSON.parse(res.body);
  assert.equal(body.oauth, "stubbed");
  assert.equal(body.providers.some((row) => row.id === "strava" && row.ready === false), true);
  assert.equal(JSON.stringify(body).toLowerCase().includes("secret"), false);
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
    assert.equal(body.features.solanaEscrow, true);
    assert.equal(body.solanaEscrow.cluster, "devnet");
    assert.equal(body.solanaEscrow.virtualFallback, true);
  } finally {
    if (prev === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = prev;
  }
});
