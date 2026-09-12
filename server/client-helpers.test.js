import test from "node:test";
import assert from "node:assert/strict";
import { deskLine } from "../src/lib/desk.js";
import { validateProofFile } from "../src/lib/proof.js";

test("deskLine is honest about live Gemini vs credits vs no key", () => {
  assert.match(
    deskLine({ features: { geminiLive: true, geminiModel: "gemini-3.6-flash", mongo: true } }),
    /GEMINI LIVE/,
  );
  assert.match(
    deskLine({ features: { gemini: true, geminiError: "credits_depleted", mongo: false } }),
    /credits depleted/i,
  );
  assert.match(deskLine({ features: { gemini: false, mongo: false } }), /no Gemini key/);
  assert.equal(deskLine(null), "DESK OFFLINE");
});

test("validateProofFile rejects non-images and oversized files", () => {
  assert.throws(
    () => validateProofFile({ type: "application/pdf", name: "x.pdf", size: 12 }),
    /photo/,
  );
  assert.throws(
    () => validateProofFile({ type: "image/jpeg", name: "huge.jpg", size: 9 * 1024 * 1024 }),
    /8 MB/,
  );
  assert.equal(
    validateProofFile({ type: "image/jpeg", name: "gym.jpg", size: 1200 }).name,
    "gym.jpg",
  );
});
