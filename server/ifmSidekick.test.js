import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SIDEKICK_MODEL, getSidekickLine, ifmEnabled } from "./ifmSidekick.js";

function withFetch(impl, fn) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = impl;
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      globalThis.fetch = originalFetch;
    });
}

test("ifmEnabled reflects HF_TOKEN presence", () => {
  assert.equal(ifmEnabled({}), false);
  assert.equal(ifmEnabled({ HF_TOKEN: "hf_xxx" }), true);
});

test("missing token stays on a canned line and never calls the router", async () => {
  let called = false;
  await withFetch(
    async () => {
      called = true;
      return new Response("no", { status: 500 });
    },
    async () => {
      const line = await getSidekickLine({ result: "pass" }, {});
      assert.equal(called, false);
      assert.equal(line.source, "mock");
      assert.equal(typeof line.text, "string");
      assert.ok(line.text.length > 0);
    },
  );
});

test("picks a mock line matching the verdict result", async () => {
  const fail = await getSidekickLine({ result: "fail" }, {});
  const review = await getSidekickLine({ result: "review" }, {});
  assert.equal(fail.source, "mock");
  assert.equal(review.source, "mock");
  assert.notEqual(fail.text, review.text);
});

test("uses the router and default model when a token is configured", async () => {
  let requestBody = null;
  let requestedUrl = "";
  let authHeader = "";
  await withFetch(
    async (url, opts) => {
      requestedUrl = String(url);
      authHeader = opts.headers.authorization;
      requestBody = JSON.parse(opts.body);
      return new Response(
        JSON.stringify({ choices: [{ message: { content: "Clean pass, book it." } }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    },
    async () => {
      const line = await getSidekickLine(
        { title: "Gym selfie", result: "pass", confidence: 0.9, rationale: "clear proof" },
        { HF_TOKEN: "hf_test" },
      );
      assert.equal(requestedUrl, "https://router.huggingface.co/v1/chat/completions");
      assert.equal(authHeader, "Bearer hf_test");
      assert.equal(requestBody.model, DEFAULT_SIDEKICK_MODEL);
      assert.equal(requestBody.messages.length, 2);
      assert.equal(line.source, "ifm");
      assert.equal(line.text, "Clean pass, book it.");
      assert.equal(line.model, DEFAULT_SIDEKICK_MODEL);
    },
  );
});

test("respects a custom IFM_SIDEKICK_MODEL override", async () => {
  let requestBody = null;
  await withFetch(
    async (url, opts) => {
      requestBody = JSON.parse(opts.body);
      return new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
    async () => {
      await getSidekickLine(
        { result: "pass" },
        { HF_TOKEN: "hf_test", IFM_SIDEKICK_MODEL: "IFM/K2-Horizon-7B" },
      );
      assert.equal(requestBody.model, "IFM/K2-Horizon-7B");
    },
  );
});

test("router HTTP error falls back to a canned line, never throws", async () => {
  await withFetch(
    async () => new Response("rate limited", { status: 429 }),
    async () => {
      const line = await getSidekickLine({ result: "fail" }, { HF_TOKEN: "hf_test" });
      assert.equal(line.source, "mock");
    },
  );
});

test("router network failure falls back to a canned line, never throws", async () => {
  await withFetch(
    async () => {
      throw new Error("network down");
    },
    async () => {
      const line = await getSidekickLine({ result: "review" }, { HF_TOKEN: "hf_test" });
      assert.equal(line.source, "mock");
    },
  );
});

test("empty router response falls back to a canned line", async () => {
  await withFetch(
    async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: "" } }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    async () => {
      const line = await getSidekickLine({ result: "pass" }, { HF_TOKEN: "hf_test" });
      assert.equal(line.source, "mock");
    },
  );
});
