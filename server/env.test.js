import test from "node:test";
import assert from "node:assert/strict";
import { featureFlags, publicConfig } from "./env.js";
import { buildAnnouncement, synthesize } from "./elevenlabs.js";

test("feature flags stay false when secrets are missing", () => {
  const flags = featureFlags({});
  assert.equal(flags.auth0, false);
  assert.equal(flags.mongo, false);
  assert.equal(flags.gemini, false);
  assert.equal(flags.elevenlabs, false);
  assert.equal(flags.ifm, false);
});

test("feature flags detect configured services without exposing values", () => {
  const flags = featureFlags({
    AUTH0_DOMAIN: "example.us.auth0.com",
    AUTH0_CLIENT_ID: "abc",
    MONGODB_URI: "mongodb+srv://example",
    GEMINI_API_KEY: "secret",
    ELEVENLABS_API_KEY: "secret",
    HF_TOKEN: "secret",
  });
  assert.deepEqual(flags, {
    auth0: true,
    mongo: true,
    gemini: true,
    elevenlabs: true,
    ifm: true,
  });
  const json = JSON.stringify(publicConfig({ ELEVENLABS_API_KEY: "secret" }));
  assert.equal(json.includes("secret"), false);
});

test("synthesize noops without a key and never throws", async () => {
  const r = await synthesize("ISAAC completed the challenge.", {});
  assert.equal(r.disabled, true);
});

test("announcement line stays short and readable", () => {
  const line = buildAnnouncement({
    winner: "ISAAC",
    result: "pass",
    rationale: "Gym floor visible.",
    title: "I'll upload a gym selfie",
  });
  assert.match(line, /ISAAC/);
  assert.match(line, /settled/);
  assert.ok(line.length <= 400);
});
