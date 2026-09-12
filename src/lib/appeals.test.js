import { describe, expect, it } from "vitest";
import { appealNotice, canFlagAppeal, canResolveAppeal, requireGradeReason } from "./appeals.js";

const review = {
  id: "pkt_1",
  title: "Standup notes",
  creatorId: "friend",
  opponentId: "you",
  status: "review",
};

describe("appeal flow", () => {
  it("lets either desk flag a REVIEW call once", () => {
    expect(canFlagAppeal(review, "you")).toBe(true);
    expect(canFlagAppeal(review, "friend")).toBe(true);
    expect(canFlagAppeal({ ...review, appeal: { status: "open" } }, "you")).toBe(false);
    expect(canFlagAppeal({ ...review, status: "accepted" }, "you")).toBe(false);
  });

  it("keeps unflagged grades on the listed friend, then opens both desks after a flag", () => {
    expect(canResolveAppeal(review, "you")).toBe(true);
    expect(canResolveAppeal(review, "friend")).toBe(false);
    const flagged = { ...review, status: "appeal" };
    expect(canResolveAppeal(flagged, "you")).toBe(true);
    expect(canResolveAppeal(flagged, "friend")).toBe(true);
  });

  it("refuses a silent grade without a written reason", () => {
    expect(() => requireGradeReason("   ")).toThrow(/Write why/);
    expect(requireGradeReason(" Date is visible. ")).toBe("Date is visible.");
  });

  it("notifies the other desk when a call is flagged", () => {
    const n = appealNotice(review, "you", 1);
    expect(n.userId).toBe("friend");
    expect(n.body).toMatch(/ISAAC flagged/);
  });
});
