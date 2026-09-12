import { describe, expect, it } from "vitest";
import { demoPacts } from "../data/seed.js";
import { userByHandle } from "../data/users.js";
import { formatRate, publicPactsForUser, publicProfileOf, publicRecordOf, sharePathFor } from "./publicProfile.js";

describe("public desk ticket", () => {
  const pacts = demoPacts(1_700_000_000_000);

  it("resolves handles case-insensitively", () => {
    expect(userByHandle("isaac")?.id).toBe("you");
    expect(userByHandle("@Maya")?.handle).toBe("MAYA");
    expect(userByHandle("gale")?.tag).toBe("SPECTATOR");
    expect(userByHandle("nobody")).toBeNull();
    expect(sharePathFor("isaac")).toBe("/u/ISAAC");
  });

  it("lists only public slips on a handle", () => {
    const isaac = publicPactsForUser(pacts, "you");
    expect(isaac.map((p) => p.id)).toEqual(
      expect.arrayContaining(["demo-settled-gym", "demo-live-leetcode", "demo-review-standup"]),
    );
    expect(isaac.some((p) => p.id === "demo-open-run")).toBe(false);
    expect(isaac.every((p) => p.visibility === "public")).toBe(true);
  });

  it("scores the public record from settled public slips only", () => {
    const isaac = publicRecordOf(pacts, "you");
    expect(isaac).toEqual({ wins: 1, losses: 0, played: 1, rate: 1 });
    const maya = publicRecordOf(pacts, "friend");
    expect(maya).toEqual({ wins: 0, losses: 1, played: 1, rate: 0 });
    expect(formatRate(isaac.rate)).toBe("100%");
    expect(formatRate(null)).toBe("—");
  });

  it("builds a shareable ticket or nothing", () => {
    const ticket = publicProfileOf("ISAAC", { pacts });
    expect(ticket.user.handle).toBe("ISAAC");
    expect(ticket.sharePath).toBe("/u/ISAAC");
    expect(ticket.history.some((p) => p.title === "Run 5K before work")).toBe(false);
    expect(publicProfileOf("ghost", { pacts })).toBeNull();
  });
});
