import { describe, expect, it } from "vitest";
import { emptyDemoState } from "../data/seed.js";
import {
  BOARD_METRICS,
  boardCopy,
  compareLines,
  currentStreak,
  potWonOf,
  rankDesks,
} from "./leaderboard.js";

describe("open-book ranks", () => {
  const snap = emptyDemoState(1_700_000_000_000);

  it("lists the three desk metrics", () => {
    expect(BOARD_METRICS.map((row) => row.id)).toEqual(["winRate", "streak", "potWon"]);
    expect(boardCopy("streak")).toMatch(/Check back tomorrow/);
  });

  it("ranks the seeded book by win rate, then pot", () => {
    const board = rankDesks({ pacts: snap.pacts, ledger: snap.ledger, metric: "winRate" });
    expect(board.map((row) => row.handle)).toEqual(["ISAAC", "FRIEND", "GALE"]);
    expect(board[0]).toMatchObject({ rank: 1, wins: 1, losses: 0, rate: 1, streak: 1, potWon: 4 });
    expect(board[1]).toMatchObject({ handle: "FRIEND", wins: 0, losses: 1, potWon: 0 });
    expect(board[2]).toMatchObject({ handle: "GALE", played: 0, potWon: 2 });
  });

  it("ranks pot taken with the rail's side payout", () => {
    const board = rankDesks({ pacts: snap.pacts, ledger: snap.ledger, metric: "potWon" });
    expect(board.map((row) => row.handle)).toEqual(["ISAAC", "GALE", "FRIEND"]);
    expect(board[1].potWon).toBe(2);
  });

  it("counts a hot streak from the latest public settles", () => {
    expect(currentStreak(snap.pacts, "you")).toBe(1);
    expect(currentStreak(snap.pacts, "friend")).toBe(0);
    const extra = [
      ...snap.pacts,
      {
        id: "extra-loss",
        creatorId: "you",
        opponentId: "friend",
        status: "resolved",
        winnerId: "friend",
        visibility: "public",
        resolvedAt: 1_800_000_000_000,
      },
    ];
    expect(currentStreak(extra, "you")).toBe(0);
    expect(currentStreak(extra, "friend")).toBe(1);
  });

  it("does not score a private settle on the public board", () => {
    const pacts = [
      ...snap.pacts,
      {
        id: "priv",
        creatorId: "friend",
        opponentId: "you",
        status: "resolved",
        winnerId: "friend",
        visibility: "private",
        resolvedAt: 1_800_000_000_000,
      },
    ];
    const ledger = [
      ...snap.ledger,
      { id: "ld-priv", userId: "friend", amount: 6, kind: "payout", pactId: "priv" },
    ];
    expect(currentStreak(pacts, "friend")).toBe(0);
    expect(potWonOf(ledger, "friend", pacts)).toBe(0);
  });

  it("scopes a crew board to the listed desks", () => {
    const dawn = rankDesks({
      pacts: snap.pacts,
      ledger: snap.ledger,
      metric: "winRate",
      memberIds: ["you", "friend"],
    });
    expect(dawn.map((row) => row.handle)).toEqual(["ISAAC", "FRIEND"]);
    const night = rankDesks({
      pacts: snap.pacts,
      ledger: snap.ledger,
      metric: "potWon",
      memberIds: ["you", "rail"],
    });
    expect(night.map((row) => row.handle)).toEqual(["ISAAC", "GALE"]);
  });

  it("breaks ties by pot, then wins, then handle", () => {
    const a = { handle: "FRIEND", rate: 1, streak: 0, potWon: 2, wins: 1 };
    const b = { handle: "ISAAC", rate: 1, streak: 0, potWon: 2, wins: 1 };
    expect(compareLines(a, b, "winRate")).toBeGreaterThan(0);
  });
});
