import { describe, expect, it } from "vitest";
import { emptyDemoState } from "../data/seed.js";
import { bankOf } from "../api/local.js";
import {
  applySideStake,
  canPlaceSideStake,
  railBook,
  settleSideStakes,
} from "./sideStakes.js";

function uid(prefix) {
  return `${prefix}_test`;
}

describe("spectator side-stakes", () => {
  it("keeps the 1v1 desks off the rail book", () => {
    const leet = emptyDemoState().pacts.find((p) => p.id === "demo-live-leetcode");
    expect(canPlaceSideStake(leet, "you")).toBe(false);
    expect(canPlaceSideStake(leet, "friend")).toBe(false);
    expect(canPlaceSideStake(leet, "rail")).toBe(true);
  });

  it("locks virtual SOL on a public live slip", () => {
    const seeded = emptyDemoState();
    const before = bankOf("rail", seeded);
    const out = applySideStake(seeded, {
      pactId: "demo-review-standup",
      actorId: "rail",
      side: "friend",
      amount: 2,
      uid,
      bankOf,
    });
    expect(out.result.side).toBe("friend");
    expect(bankOf("rail", out.state)).toBe(before - 2);
    expect(railBook(out.state.sideStakes, "demo-review-standup").friend).toBe(2);
  });

  it("pays even money when the faded side stands", () => {
    let state = emptyDemoState();
    state = applySideStake(state, {
      pactId: "demo-review-standup",
      actorId: "rail",
      side: "friend",
      amount: 2,
      uid,
      bankOf,
    }).state;
    const before = bankOf("rail", state);
    const pact = {
      ...state.pacts.find((p) => p.id === "demo-review-standup"),
      winnerId: "you",
      status: "resolved",
    };
    const settled = settleSideStakes(state, pact, { uid });
    expect(bankOf("rail", settled)).toBe(before + 4);
    expect(settled.sideStakes.find((row) => row.pactId === "demo-review-standup" && row.userId === "rail").won).toBe(
      true,
    );
  });

  it("burns a faded ticket when the other desk takes the pot", () => {
    let state = emptyDemoState();
    state = applySideStake(state, {
      pactId: "demo-review-standup",
      actorId: "rail",
      side: "challenger",
      amount: 1.5,
      uid,
      bankOf,
    }).state;
    const before = bankOf("rail", state);
    const pact = {
      ...state.pacts.find((p) => p.id === "demo-review-standup"),
      winnerId: "you",
      status: "resolved",
    };
    const settled = settleSideStakes(state, pact, { uid });
    expect(bankOf("rail", settled)).toBe(before);
    expect(settled.ledger.some((row) => row.kind === "side-payout" && row.pactId === "demo-review-standup")).toBe(
      false,
    );
  });

  it("rejects a second rail ticket on the same slip", () => {
    const first = applySideStake(emptyDemoState(), {
      pactId: "demo-review-standup",
      actorId: "rail",
      side: "challenger",
      amount: 1,
      uid,
      bankOf,
    });
    expect(() =>
      applySideStake(first.state, {
        pactId: "demo-review-standup",
        actorId: "rail",
        side: "friend",
        amount: 1,
        uid,
        bankOf,
      }),
    ).toThrow(/already have a rail ticket/);
  });
});
