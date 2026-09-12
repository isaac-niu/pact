import { STARTING_BANK, userById } from "./users.js";
import { NOTICE_TYPES, notice } from "../lib/notifications.js";

const DAY = 24 * 60 * 60 * 1000;

export const SEED_VERSION = 5;

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
    visibility: "public",
    createdAt: now - 2 * DAY,
    acceptedAt: now - 2 * DAY + 20 * 60 * 1000,
    provedAt: now - 2 * DAY + 80 * 60 * 1000,
    resolvedAt: now - 2 * DAY + 82 * 60 * 1000,
  };
}

export function demoPacts(now = Date.now()) {
  return [gymPact(now)];
}

export function demoEvents(pacts) {
  const gym = pacts.find((p) => p.id === "demo-settled-gym");
  return [
    { id: "ev-gym-post", pactId: gym.id, type: "posted", actorId: gym.creatorId, at: gym.createdAt, note: gym.title },
    { id: "ev-gym-acc", pactId: gym.id, type: "accepted", actorId: gym.opponentId, at: gym.acceptedAt, note: "Matched the stake" },
    { id: "ev-gym-pro", pactId: gym.id, type: "proved", actorId: gym.creatorId, at: gym.provedAt, note: gym.evidenceName },
    { id: "ev-gym-won", pactId: gym.id, type: "won", actorId: gym.winnerId, at: gym.resolvedAt, note: "Takes the pot" },
    { id: "ev-gym-lost", pactId: gym.id, type: "lost", actorId: gym.opponentId, at: gym.resolvedAt + 1, note: "Stake gone" },
  ].sort((a, b) => b.at - a.at);
}

export function demoLedger(pacts) {
  const gym = pacts.find((p) => p.id === "demo-settled-gym");
  const pot = gym.stake * 2;
  return [
    { id: "ld-gym-a", userId: gym.creatorId, amount: -gym.stake, kind: "stake", pactId: gym.id, at: gym.createdAt, note: gym.title },
    { id: "ld-gym-b", userId: gym.opponentId, amount: -gym.stake, kind: "stake", pactId: gym.id, at: gym.acceptedAt, note: gym.title },
    { id: "ld-gym-w", userId: gym.winnerId, amount: pot, kind: "payout", pactId: gym.id, at: gym.resolvedAt, note: "Pot paid" },
    { id: "ld-gym-rail-a", userId: "rail", amount: -1, kind: "side-stake", pactId: gym.id, at: gym.provedAt, note: "Rail ticket · challenger" },
    { id: "ld-gym-rail-w", userId: "rail", amount: 2, kind: "side-payout", pactId: gym.id, at: gym.resolvedAt, note: "Rail ticket paid" },
  ].sort((a, b) => b.at - a.at);
}

export function demoSideStakes(pacts) {
  const gym = pacts.find((p) => p.id === "demo-settled-gym");
  if (!gym) return [];
  return [
    {
      id: "ss-gym-rail",
      pactId: gym.id,
      userId: "rail",
      side: "challenger",
      amount: 1,
      at: gym.provedAt,
      settledAt: gym.resolvedAt,
      won: true,
    },
  ];
}

export function demoTalk(pacts) {
  const gym = pacts.find((p) => p.id === "demo-settled-gym");
  return {
    reactions: [
      {
        id: "rx-gym-won",
        eventId: "ev-gym-won",
        pactId: gym.id,
        userId: "friend",
        emoji: "🔥",
        at: gym.resolvedAt + 30_000,
      },
    ],
    comments: [
      {
        id: "cm-gym-won",
        eventId: "ev-gym-won",
        pactId: gym.id,
        userId: "friend",
        body: "Clean frame. Book stands.",
        at: gym.resolvedAt + 45_000,
      },
    ],
  };
}

export function demoNotices(pacts) {
  const gym = pacts.find((p) => p.id === "demo-settled-gym");
  const friendHandle = userById(gym.opponentId)?.handle || "FRIEND";
  return [
    notice({
      id: "ntf-gym-you",
      userId: gym.creatorId,
      type: NOTICE_TYPES.ACCEPTED,
      pactId: gym.id,
      title: "Friend matched the slip",
      body: `${friendHandle} accepted “${gym.title}” and locked the pot.`,
      at: gym.acceptedAt,
      readAt: gym.acceptedAt,
    }),
  ].sort((a, b) => b.at - a.at);
}

export function emptyDemoState(now = Date.now()) {
  const pacts = demoPacts(now);
  const talk = demoTalk(pacts);
  return {
    userId: "you",
    seedVersion: SEED_VERSION,
    startingBank: STARTING_BANK,
    pacts,
    events: demoEvents(pacts),
    ledger: demoLedger(pacts),
    notifications: demoNotices(pacts),
    reactions: talk.reactions,
    comments: talk.comments,
    sideStakes: demoSideStakes(pacts),
  };
}
