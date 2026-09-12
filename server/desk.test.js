import test from "node:test";
import assert from "node:assert/strict";
import { createDeskLogic, bankOf } from "./desk.js";
import { emptyDemoState } from "../src/data/seed.js";

test("create stores a referee checklist and proof grades each line", async () => {
  const desk = createDeskLogic(async (input) => ({
    result: "pass",
    confidence: 0.93,
    rationale: "both lines hold",
    source: "test",
    auto: true,
    items: [
      { id: "sc_face", pass: true, note: "Face is on camera." },
      { id: "sc_gym", pass: true, note: "Iron is in frame." },
    ],
    title: input.title,
  }));
  let state = emptyDemoState();
  const created = await desk.createPact(
    state,
    {
      title: "Gym",
      checklist: [
        { id: "sc_face", label: "Face visible" },
        { id: "sc_gym", label: "Gym floor or equipment visible" },
      ],
      stake: 2,
      opponentId: "friend",
    },
    "you",
  );
  state = created.state;
  assert.equal(created.result.checklist.length, 2);
  assert.match(created.result.criteria, /Face visible/);
  state = (await desk.acceptPact(state, created.result.id, "friend")).state;
  const proved = await desk.submitEvidence(
    state,
    created.result.id,
    { dataUrl: "data:image/jpeg;base64,aa", name: "gym.jpg" },
    "you",
  );
  assert.equal(proved.result.status, "resolved");
  assert.equal(proved.result.verdict.items.length, 2);
  assert.equal(proved.result.verdict.items.every((row) => row.pass === true), true);
});

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

test("either desk can flag REVIEW and a written grade settles the pot", async () => {
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
  state = (await desk.acceptPact(state, created.result.id, "friend")).state;
  state = (
    await desk.submitEvidence(
      state,
      created.result.id,
      { dataUrl: "data:image/jpeg;base64,aa", name: "blur.jpg" },
      "you",
    )
  ).state;
  const flagged = await desk.flagAppeal(state, created.result.id, "Date is unreadable.", "you");
  assert.equal(flagged.result.status, "appeal");
  assert.equal(flagged.result.appeal.flaggedBy, "you");
  await assert.rejects(() => desk.verifyPact(flagged.state, created.result.id, true, "friend", "  "));
  const graded = await desk.verifyPact(
    flagged.state,
    created.result.id,
    true,
    "friend",
    "Notes match the written goal.",
  );
  assert.equal(graded.result.status, "resolved");
  assert.equal(graded.result.winnerId, "you");
  assert.equal(graded.result.verdict.source, "appeal");
  assert.equal(graded.result.appeal.resolution.reason, "Notes match the written goal.");
});

test("tickReminders writes one deadline notice per live slip in the window", async () => {
  const desk = createDeskLogic(async () => ({ result: "pass", confidence: 0.9, auto: true }));
  const now = Date.now();
  let state = emptyDemoState(now);
  const created = await desk.createPact(
    state,
    {
      title: "Soon",
      criteria: "Selfie",
      stake: 1,
      opponentId: "friend",
      deadline: now + 4 * 60 * 60 * 1000,
    },
    "you",
  );
  state = created.state;
  state = (await desk.acceptPact(state, created.result.id, "friend")).state;
  const first = await desk.tickReminders(state, now);
  const rows = first.state.notifications.filter((n) => n.type === "deadline" && n.pactId === created.result.id);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].userId, "you");
  const second = await desk.tickReminders(first.state, now + 30_000);
  assert.equal(second.result.created, 0);
});

test("resolved series slips spawn the next stake on the reminder tick", async () => {
  const desk = createDeskLogic(async () => ({
    result: "pass",
    confidence: 0.95,
    rationale: "gym",
    source: "test",
    auto: true,
  }));
  const now = Date.now();
  let state = emptyDemoState(now);
  const created = await desk.createPact(
    state,
    {
      title: "Gym 3x",
      criteria: "Selfie",
      stake: 1,
      opponentId: "friend",
      cadence: "3x-week",
      seriesUntil: now + 40 * 24 * 60 * 60 * 1000,
    },
    "you",
  );
  state = created.state;
  assert.equal(created.result.cadence, "3x-week");
  state = (await desk.acceptPact(state, created.result.id, "friend")).state;
  const settled = await desk.submitEvidence(
    state,
    created.result.id,
    { dataUrl: "data:image/jpeg;base64,aa", name: "gym.jpg" },
    "you",
  );
  state = settled.state;
  assert.equal(settled.result.status, "resolved");
  assert.ok(settled.result.nextSpawnAt);
  const before = bankOf("you", state);
  const ticked = await desk.tickReminders(state, settled.result.nextSpawnAt);
  const child = ticked.state.pacts.find((p) => p.parentPactId === created.result.id);
  assert.ok(child);
  assert.equal(child.status, "open");
  assert.equal(child.occurrence, 2);
  assert.equal(child.streak, 1);
  assert.equal(bankOf("you", ticked.state), before - 1);
  assert.equal(ticked.result.spawned, 1);
});

test("rail tickets lock virtual SOL and pay even money on settle", async () => {
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
  const faded = await desk.placeSideStake(state, created.result.id, { side: "challenger", amount: 2 }, "rail");
  state = faded.state;
  const before = bankOf("rail", state);
  const out = await desk.submitEvidence(
    state,
    created.result.id,
    { dataUrl: "data:image/jpeg;base64,aa", name: "gym.jpg" },
    "you",
  );
  assert.equal(out.result.winnerId, "you");
  assert.equal(bankOf("rail", out.state), before + 4);
});

test("spectators can heat a public mark and post a short take", async () => {
  const desk = createDeskLogic(async () => ({ result: "pass", confidence: 0.9, auto: true }));
  const state = emptyDemoState();
  const heated = await desk.reactToMark(state, "ev-gym-won", "🔥", "you");
  assert.equal(heated.result.emoji, "🔥");
  const talked = await desk.commentOnMark(heated.state, "ev-gym-won", "Book stands.", "you");
  assert.equal(talked.result.body, "Book stands.");
  assert.equal(talked.state.comments[0].eventId, "ev-gym-won");
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
