import test from "node:test";
import assert from "node:assert/strict";
import { band } from "./gemini.js";

test("Gemini band: high confidence auto-resolves", () => {
  const v = band(true, 0.88, "clear gym", "gemini");
  assert.equal(v.result, "pass");
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
