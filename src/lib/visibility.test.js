import { describe, expect, it } from "vitest";
import { canSeePact, eventsOnTape, pactsOnTape } from "./visibility.js";

const publicPact = { id: "a", visibility: "public", creatorId: "you", opponentId: "friend" };
const privatePact = { id: "b", visibility: "private", creatorId: "you", opponentId: "friend" };
const otherPrivate = { id: "c", visibility: "private", creatorId: "x", opponentId: "y" };

describe("tape visibility", () => {
  it("hides private slips from the public tape", () => {
    const pacts = [publicPact, privatePact];
    expect(pactsOnTape(pacts, "public", "you").map((p) => p.id)).toEqual(["a"]);
    expect(pactsOnTape(pacts, "private", "you").map((p) => p.id)).toEqual(["b"]);
  });

  it("keeps someone else's private slip off your private tape", () => {
    expect(canSeePact(otherPrivate, "you")).toBe(false);
    expect(pactsOnTape([otherPrivate], "private", "you")).toEqual([]);
  });

  it("filters tape marks with the slips", () => {
    const events = [
      { id: "1", pactId: "a" },
      { id: "2", pactId: "b" },
    ];
    expect(eventsOnTape(events, [publicPact, privatePact], "public", "you").map((e) => e.id)).toEqual([
      "1",
    ]);
  });
});
