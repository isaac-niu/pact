import { STARTING_BANK } from "./users.js";

const DAY = 24 * 60 * 60 * 1000;

export const SEED_VERSION = 2;

function gymPact(now) {
  return {
    id: "demo-settled-gym",
    title: "I'll upload a gym selfie",
    criteria: "Face or body in frame with gym floor or equipment visible.",
    stake: 2,
    deadline: now - DAY,
    creatorId: "you",
    opponentId: "friend",
    status: "resolved",
    evidenceUrl: null,
    evidenceName: "gym-floor.jpg",
    verdict: {
      result: "pass",
      confidence: 0.94,
      rationale: "Clear gym-floor selfie. Subject in frame, workout context visible.",
    },
    winnerId: "you",
    createdAt: now - 2 * DAY,
    acceptedAt: now - 2 * DAY + 20 * 60 * 1000,
    provedAt: now - 2 * DAY + 80 * 60 * 1000,
    resolvedAt: now - 2 * DAY + 82 * 60 * 1000,
  };
}

function leetPact(now) {
  return {
    id: "demo-live-leetcode",
    title: "Solve one LeetCode today",
    criteria: "Screenshot of a green accepted submission from today.",
    stake: 1.5,
    deadline: now + 10 * 60 * 60 * 1000,
    creatorId: "friend",
    opponentId: "you",
    status: "accepted",
    evidenceUrl: null,
    evidenceName: null,
    verdict: null,
    winnerId: null,
    createdAt: now - 6 * 60 * 60 * 1000,
    acceptedAt: now - 5 * 60 * 60 * 1000,
    provedAt: null,
    resolvedAt: null,
  };
}

function runPact(now) {
  return {
    id: "demo-open-run",
    title: "Run 5K before work",
    criteria: "Watch or phone screenshot showing ≥5.00 km completed.",
    stake: 3,
    deadline: now + 18 * 60 * 60 * 1000,
    creatorId: "you",
    opponentId: "friend",
    status: "open",
    evidenceUrl: null,
    evidenceName: null,
    verdict: null,
    winnerId: null,
    createdAt: now - 30 * 60 * 1000,
    acceptedAt: null,
    provedAt: null,
    resolvedAt: null,
  };
}

export function demoPacts(now = Date.now()) {
  return [gymPact(now), leetPact(now), runPact(now)];
}

export function demoEvents(pacts) {
  const gym = pacts.find((p) => p.id === "demo-settled-gym");
  const leet = pacts.find((p) => p.id === "demo-live-leetcode");
  const run = pacts.find((p) => p.id === "demo-open-run");
  return [
    { id: "ev-gym-post", pactId: gym.id, type: "posted", actorId: gym.creatorId, at: gym.createdAt, note: gym.title },
    { id: "ev-gym-acc", pactId: gym.id, type: "accepted", actorId: gym.opponentId, at: gym.acceptedAt, note: "Matched the stake" },
    { id: "ev-gym-pro", pactId: gym.id, type: "proved", actorId: gym.creatorId, at: gym.provedAt, note: gym.evidenceName },
    { id: "ev-gym-won", pactId: gym.id, type: "won", actorId: gym.winnerId, at: gym.resolvedAt, note: "Takes the pot" },
    { id: "ev-gym-lost", pactId: gym.id, type: "lost", actorId: gym.opponentId, at: gym.resolvedAt + 1, note: "Stake gone" },
    { id: "ev-leet-post", pactId: leet.id, type: "posted", actorId: leet.creatorId, at: leet.createdAt, note: leet.title },
    { id: "ev-leet-acc", pactId: leet.id, type: "accepted", actorId: leet.opponentId, at: leet.acceptedAt, note: "Matched the stake" },
    { id: "ev-run-post", pactId: run.id, type: "posted", actorId: run.creatorId, at: run.createdAt, note: run.title },
  ].sort((a, b) => b.at - a.at);
}

export function demoLedger(pacts) {
  const gym = pacts.find((p) => p.id === "demo-settled-gym");
  const leet = pacts.find((p) => p.id === "demo-live-leetcode");
  const run = pacts.find((p) => p.id === "demo-open-run");
  const pot = gym.stake * 2;
  return [
    { id: "ld-gym-a", userId: gym.creatorId, amount: -gym.stake, kind: "stake", pactId: gym.id, at: gym.createdAt, note: gym.title },
    { id: "ld-gym-b", userId: gym.opponentId, amount: -gym.stake, kind: "stake", pactId: gym.id, at: gym.acceptedAt, note: gym.title },
    { id: "ld-gym-w", userId: gym.winnerId, amount: pot, kind: "payout", pactId: gym.id, at: gym.resolvedAt, note: "Pot paid" },
    { id: "ld-leet-a", userId: leet.creatorId, amount: -leet.stake, kind: "stake", pactId: leet.id, at: leet.createdAt, note: leet.title },
    { id: "ld-leet-b", userId: leet.opponentId, amount: -leet.stake, kind: "stake", pactId: leet.id, at: leet.acceptedAt, note: leet.title },
    { id: "ld-run-a", userId: run.creatorId, amount: -run.stake, kind: "stake", pactId: run.id, at: run.createdAt, note: run.title },
  ].sort((a, b) => b.at - a.at);
}

export function emptyDemoState(now = Date.now()) {
  const pacts = demoPacts(now);
  return {
    userId: "you",
    seedVersion: SEED_VERSION,
    startingBank: STARTING_BANK,
    pacts,
    events: demoEvents(pacts),
    ledger: demoLedger(pacts),
  };
}
