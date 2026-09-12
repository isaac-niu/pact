import test from "node:test";
import assert from "node:assert/strict";
import { createDeskLogic, bankOf } from "./desk.js";
import { emptyDemoState } from "../src/data/seed.js";

test("create then accept locks both virtual SOL stakes", async () => {
  const desk = createDeskLogic(async () => ({
    result: "pass",
    confidence: 0.9,
    rationale: "ok",
    source: "mock",
    auto: true,
  }));
  let state = emptyDemoState();
  const startYou = bankOf("you", state);
  const created = await desk.createPact(
    state,
    { title: "Gym", criteria: "Selfie", stake: 2, opponentId: "friend" },
    "you",
  );
  state = created.state;
  assert.equal(bankOf("you", state), startYou - 2);
  const accepted = await desk.acceptPact(state, created.result.id, "friend");
  state = accepted.state;
  assert.equal(accepted.result.status, "accepted");
  assert.equal(bankOf("friend", state), bankOf("friend", emptyDemoState()) - 2);
});

test("high-confidence pass pays the challenger", async () => {
  const desk = createDeskLogic(async () => ({
    result: "pass",
    confidence: 0.92,
    rationale: "gym",
    source: "test",
    auto: true,
  }));
  let state = emptyDemoState();
  const created = await desk.createPact(
    state,
    { title: "Gym", criteria: "Selfie", stake: 2, opponentId: "friend" },
    "you",
  );
  state = created.state;
  state = (await desk.acceptPact(state, created.result.id, "friend")).state;
  const before = bankOf("you", state);
  const out = await desk.submitEvidence(
    state,
    created.result.id,
    { dataUrl: "data:image/jpeg;base64,aa", name: "gym.jpg" },
    "you",
  );
  assert.equal(out.result.status, "resolved");
  assert.equal(out.result.winnerId, "you");
  assert.equal(bankOf("you", out.state), before + 4);
});

test("createPact stores public vs private tape", async () => {
  const desk = createDeskLogic(async () => ({ result: "pass", confidence: 0.9, auto: true }));
  const pub = await desk.createPact(
    emptyDemoState(),
    { title: "Gym", criteria: "Selfie", stake: 1, opponentId: "friend" },
    "you",
  );
  assert.equal(pub.result.visibility, "public");
  const priv = await desk.createPact(
    emptyDemoState(),
    { title: "Secret", criteria: "Selfie", stake: 1, opponentId: "friend", visibility: "private" },
    "you",
  );
  assert.equal(priv.result.visibility, "private");
});

test("deposit credits virtual SOL on the desk", async () => {
  const desk = createDeskLogic(async () => ({ result: "pass", confidence: 0.9, auto: true }));
  const start = emptyDemoState();
  const before = bankOf("you", start);
  const out = await desk.deposit(start, { amount: 10, processor: "card" }, "you");
  assert.equal(out.result.amount, 10);
  assert.equal(bankOf("you", out.state), before + 10);
});
