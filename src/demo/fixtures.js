/**
 * Isolated demo fixtures for the current localStorage POC schema.
 * Person B's Mongo documents may differ — do not import this into API code.
 * Seed only runs when localStorage is empty (first visit). It never overwrites.
 */

const DAY = 24 * 60 * 60 * 1000;

export const DEMO_SEED_VERSION = 1;

export function demoPacts(now = Date.now()) {
  return [
    {
      id: "demo-settled-gym",
      title: "I'll upload a gym selfie",
      stake: 2,
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
    },
    {
      id: "demo-live-leetcode",
      title: "Solve one LeetCode today",
      stake: 1.5,
      creatorId: "friend",
      opponentId: "you",
      status: "accepted",
      evidenceUrl: null,
      evidenceName: null,
      verdict: null,
      createdAt: now - 6 * 60 * 60 * 1000,
    },
    {
      id: "demo-open-run",
      title: "Run 5K before work",
      stake: 3,
      creatorId: "you",
      opponentId: "friend",
      status: "open",
      evidenceUrl: null,
      evidenceName: null,
      verdict: null,
      createdAt: now - 30 * 60 * 1000,
    },
  ];
}

export function emptyDemoState(now = Date.now()) {
  return {
    userId: "you",
    seedVersion: DEMO_SEED_VERSION,
    pacts: demoPacts(now),
  };
}
