import { describe, expect, it } from "vitest";
import { isTestGroupName, isTestPactTitle, stripDeskTestPacts } from "./softReset.js";

describe("soft reset matchers", () => {
  it("matches test group names including jammed and numbered variants", () => {
    expect(isTestGroupName("test group")).toBe(true);
    expect(isTestGroupName("testgroup")).toBe(true);
    expect(isTestGroupName("Test Group 2")).toBe(true);
    expect(isTestGroupName("TEST GROUP")).toBe(true);
    expect(isTestGroupName("Training crew")).toBe(false);
    expect(isTestGroupName("Open runners")).toBe(false);
  });

  it("matches obviously-test pacts without eating the gym sample", () => {
    expect(isTestPactTitle("test pact")).toBe(true);
    expect(isTestPactTitle("Latest test")).toBe(true);
    expect(isTestPactTitle("I'll upload a gym selfie")).toBe(false);
    expect(isTestPactTitle("Solve one LeetCode today")).toBe(false);
    expect(isTestPactTitle(undefined, "contest")).toBe(false);
  });

  it("strips only test-named slips from a desk snapshot", () => {
    const state = {
      pacts: [
        { id: "gym", title: "I'll upload a gym selfie" },
        { id: "junk", title: "test group wager" },
      ],
      events: [
        { id: "a", pactId: "gym" },
        { id: "b", pactId: "junk" },
      ],
      ledger: [{ id: "l1", pactId: "gym" }],
      notifications: [{ id: "n1", pactId: "junk" }],
    };
    const out = stripDeskTestPacts(state);
    expect(out.removed).toBe(1);
    expect(out.state.pacts.map((p) => p.id)).toEqual(["gym"]);
    expect(out.state.events.map((row) => row.id)).toEqual(["a"]);
    expect(out.state.notifications).toEqual([]);
  });
});
