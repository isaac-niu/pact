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

test("accept and review write desk notices for the other side", async () => {
  const desk = createDeskLogic(async () => ({
    result: "review",
    confidence: 0.55,
    rationale: "unsure",
    source: "test",
    auto: false,
  }));
  let state = emptyDemoState();
  const created = await desk.createPact(
    state,
    { title: "Gym", criteria: "Selfie", stake: 2, opponentId: "friend" },
    "you",
  );
  state = created.state;
  const accepted = await desk.acceptPact(state, created.result.id, "friend");
  state = accepted.state;
  const acceptedNotice = state.notifications.find(
    (n) => n.type === "accepted" && n.pactId === created.result.id,
  );
  assert.equal(acceptedNotice.userId, "you");
  const proved = await desk.submitEvidence(
    state,
    created.result.id,
    { dataUrl: "data:image/jpeg;base64,aa", name: "blur.jpg" },
    "you",
  );
  const provedNotice = proved.state.notifications.find(
    (n) => n.type === "proved" && n.pactId === created.result.id,
  );
  const reviewNotice = proved.state.notifications.find(
    (n) => n.type === "review" && n.pactId === created.result.id,
  );
  assert.equal(proved.result.status, "review");
  assert.equal(provedNotice.userId, "friend");
  assert.equal(reviewNotice.userId, "friend");
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
