import { describe, expect, it } from "vitest";
import { STARTING_BANK } from "../data/users.js";
import { applyRecurringSpawns, nextStreak, nextOccurrenceDeadline, withNextSpawn } from "./recurring.js";

const DAY = 24 * 60 * 60 * 1000;

function bankOf(userId, snap) {
  return snap.ledger
    .filter((row) => row.userId === userId)
    .reduce((sum, row) => sum + row.amount, snap.startingBank ?? STARTING_BANK);
}

function uid(prefix) {
  uid.n = (uid.n || 0) + 1;
  return `${prefix}_${uid.n}`;
}

describe("recurring slips", () => {
  it("steps daily / 3x-week / weekly and stops after seriesUntil", () => {
    const now = 1_000;
    expect(nextOccurrenceDeadline({ cadence: "daily" }, now)).toBe(now + DAY);
    expect(nextOccurrenceDeadline({ cadence: "3x-week" }, now)).toBe(now + 2 * DAY);
    expect(nextOccurrenceDeadline({ cadence: "weekly" }, now)).toBe(now + 7 * DAY);
    expect(nextOccurrenceDeadline({ cadence: "none" }, now)).toBeNull();
    expect(withNextSpawn({ cadence: "daily", resolvedAt: now, seriesUntil: now + DAY / 2 }).nextSpawnAt).toBeNull();
    expect(withNextSpawn({ cadence: "daily", resolvedAt: now, seriesUntil: now + 2 * DAY }).nextSpawnAt).toBe(now + DAY);
  });

  it("counts a challenger win as streak and resets on a fade", () => {
    expect(nextStreak({ creatorId: "you", winnerId: "you", streak: 2 })).toBe(3);
    expect(nextStreak({ creatorId: "you", winnerId: "friend", streak: 2 })).toBe(0);
  });

  it("spawns the next open slip, stakes virtual SOL, and will not double-post", () => {
    const now = Date.now();
    const parent = {
      id: "pkt_old",
      title: "Gym 3×",
      criteria: "Gym floor selfie",
      checklist: [{ id: "sc_gym", label: "Gym floor selfie" }],
      stake: 2,
      creatorId: "you",
      opponentId: "friend",
      status: "resolved",
      winnerId: "you",
      visibility: "public",
      cadence: "3x-week",
      seriesId: "ser_1",
      occurrence: 1,
      streak: 1,
      seriesUntil: now + 30 * DAY,
      parentPactId: null,
      nextSpawnAt: now - 1000,
    };
    const state = {
      startingBank: 50,
      pacts: [parent],
      events: [],
      ledger: [],
      notifications: [],
    };
    const first = applyRecurringSpawns(state, { now, uid, bankOf });
    expect(first.created).toHaveLength(1);
    expect(first.created[0].status).toBe("open");
    expect(first.created[0].parentPactId).toBe("pkt_old");
    expect(first.created[0].occurrence).toBe(2);
    expect(first.created[0].streak).toBe(2);
    expect(first.created[0].checklist).toEqual([{ id: "sc_gym", label: "Gym floor selfie" }]);
    expect(bankOf("you", first.state)).toBe(48);
    const second = applyRecurringSpawns(first.state, { now: now + 10, uid, bankOf });
    expect(second.created).toHaveLength(0);
  });

  it("pauses the series when the challenger cannot cover the next stake", () => {
    const now = Date.now();
    const parent = {
      id: "pkt_broke",
      title: "Gym",
      criteria: "Selfie",
      stake: 80,
      creatorId: "you",
      opponentId: "friend",
      status: "resolved",
      winnerId: "you",
      cadence: "daily",
      seriesId: "ser_2",
      occurrence: 1,
      streak: 1,
      seriesUntil: now + 10 * DAY,
      nextSpawnAt: now - 1,
    };
    const out = applyRecurringSpawns(
      { startingBank: 50, pacts: [parent], events: [], ledger: [], notifications: [] },
      { now, uid, bankOf },
    );
    expect(out.created).toHaveLength(0);
    expect(out.state.pacts[0].seriesPaused).toBe(true);
    expect(out.state.notifications[0].title).toMatch(/paused/i);
  });
});
