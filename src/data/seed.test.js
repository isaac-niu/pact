import { describe, expect, it } from "vitest";
import { demoPacts, emptyDemoState, SEED_VERSION } from "./seed.js";

describe("slim gym seed", () => {
  it("ships only the settled gym selfie loop", () => {
    const pacts = demoPacts(1_700_000_000_000);
    expect(pacts).toHaveLength(1);
    expect(pacts[0].id).toBe("demo-settled-gym");
    expect(pacts[0].title).toBe("I'll upload a gym selfie");
    expect(pacts[0].status).toBe("resolved");
    expect(SEED_VERSION).toBeGreaterThanOrEqual(5);

    const state = emptyDemoState(1_700_000_000_000);
    expect(state.pacts.map((p) => p.id)).toEqual(["demo-settled-gym"]);
    expect(state.events.every((row) => row.pactId === "demo-settled-gym")).toBe(true);
    expect(state.ledger.every((row) => row.pactId === "demo-settled-gym")).toBe(true);
    expect(state.notifications.every((row) => row.pactId === "demo-settled-gym")).toBe(true);
    expect(JSON.stringify(state)).not.toMatch(/Maya|MAYA|leetcode|standup|5K/i);
  });
});
