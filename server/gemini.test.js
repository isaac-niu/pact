import test from "node:test";
import assert from "node:assert/strict";
import { band, mockVerdict, parseDataUrl } from "./gemini.js";

test("Gemini band: high confidence auto-resolves", () => {
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

test("Gemini band: low confidence is an auto-fail for the challenger", () => {
  const v = band(true, 0.2, "unclear", "gemini");
  assert.equal(v.result, "fail");
  assert.equal(v.auto, true);
});

test("Gemini band: middle confidence waits on a friend", () => {
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
