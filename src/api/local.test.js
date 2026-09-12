import { beforeEach, describe, expect, it } from "vitest";
import { demoPacts, SEED_VERSION } from "../data/seed.js";
import { getSnapshot, reloadDesk, resetDesk, STORAGE_KEY } from "./local.js";

describe("local desk seed bump", () => {
  beforeEach(() => {
    localStorage.clear();
    resetDesk();
  });

  it("reseeds when an older seedVersion is in localStorage", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        userId: "you",
        seedVersion: SEED_VERSION - 1,
        startingBank: 50,
        pacts: [
          {
            id: "demo-live-leetcode",
            title: "Solve one LeetCode today",
            creatorId: "friend",
            opponentId: "you",
            status: "accepted",
            stake: 1.5,
          },
          { id: "stale-test", title: "test leftover", creatorId: "you", opponentId: "friend", status: "open", stake: 1 },
        ],
        events: [],
        ledger: [],
        notifications: [],
      }),
    );

    reloadDesk();
    const snap = getSnapshot();
    expect(snap.seedVersion).toBe(SEED_VERSION);
    expect(snap.pacts.map((p) => p.id)).toEqual(demoPacts().map((p) => p.id));
    expect(snap.pacts.some((p) => /leetcode|test leftover/i.test(p.title))).toBe(false);
  });
});
