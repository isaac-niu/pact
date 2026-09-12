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

const LIVE_ID = "test-live-public";

function livePublicPact(now = Date.now()) {
  return {
    id: LIVE_ID,
    title: "I'll post proof",
    criteria: "Photo of the work.",
    stake: 2,
    creatorId: "you",
    opponentId: "friend",
    status: "accepted",
    visibility: "public",
    createdAt: now,
    acceptedAt: now,
    winnerId: null,
  };
}

function stateWithLiveSlip() {
  const seeded = emptyDemoState();
  return { ...seeded, pacts: [livePublicPact(), ...seeded.pacts] };
}

describe("spectator side-stakes", () => {
  it("keeps the 1v1 desks off the rail book", () => {
    const live = livePublicPact();
    expect(canPlaceSideStake(live, "you")).toBe(false);
    expect(canPlaceSideStake(live, "friend")).toBe(false);
    expect(canPlaceSideStake(live, "rail")).toBe(true);
  });

  it("locks virtual SOL on a public live slip", () => {
    const seeded = stateWithLiveSlip();
    const before = bankOf("rail", seeded);
    const out = applySideStake(seeded, {
      pactId: LIVE_ID,
      actorId: "rail",
      side: "friend",
      amount: 2,
      uid,
      bankOf,
    });
    expect(out.result.side).toBe("friend");
    expect(bankOf("rail", out.state)).toBe(before - 2);
    expect(railBook(out.state.sideStakes, LIVE_ID).friend).toBe(2);
  });

  it("pays even money when the faded side stands", () => {
    let state = stateWithLiveSlip();
    state = applySideStake(state, {
      pactId: LIVE_ID,
      actorId: "rail",
      side: "friend",
      amount: 2,
      uid,
      bankOf,
    }).state;
    const before = bankOf("rail", state);
    const pact = {
      ...state.pacts.find((p) => p.id === LIVE_ID),
      winnerId: "friend",
      status: "resolved",
    };
    const settled = settleSideStakes(state, pact, { uid });
    expect(bankOf("rail", settled)).toBe(before + 4);
    expect(settled.sideStakes.find((row) => row.pactId === LIVE_ID && row.userId === "rail").won).toBe(true);
  });

  it("burns a faded ticket when the other desk takes the pot", () => {
    let state = stateWithLiveSlip();
    state = applySideStake(state, {
      pactId: LIVE_ID,
      actorId: "rail",
      side: "challenger",
      amount: 1.5,
      uid,
      bankOf,
    }).state;
    const before = bankOf("rail", state);
    const pact = {
      ...state.pacts.find((p) => p.id === LIVE_ID),
      winnerId: "friend",
      status: "resolved",
    };
    const settled = settleSideStakes(state, pact, { uid });
    expect(bankOf("rail", settled)).toBe(before);
    expect(settled.ledger.some((row) => row.kind === "side-payout" && row.pactId === LIVE_ID)).toBe(false);
  });

  it("rejects a second rail ticket on the same slip", () => {
    const first = applySideStake(stateWithLiveSlip(), {
      pactId: LIVE_ID,
      actorId: "rail",
      side: "challenger",
      amount: 1,
      uid,
      bankOf,
    });
    expect(() =>
      applySideStake(first.state, {
        pactId: LIVE_ID,
        actorId: "rail",
        side: "friend",
        amount: 1,
        uid,
        bankOf,
      }),
    ).toThrow(/already have a rail ticket/);
  });
});
