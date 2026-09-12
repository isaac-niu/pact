import { describe, expect, it } from "vitest";
import { NOTICE_TYPES } from "./notifications.js";
import {
  applyDeadlineReminders,
  approachingDeadline,
  approachingForUser,
  bannerCopy,
  hoursLeft,
  reminderCopy,
} from "./reminders.js";

const now = Date.parse("2026-09-12T12:00:00.000Z");

function livePact(overrides = {}) {
  return {
    id: "pkt_hot",
    title: "Gym selfie",
    creatorId: "you",
    opponentId: "friend",
    status: "accepted",
    deadline: now + 5 * 60 * 60 * 1000,
    ...overrides,
  };
}

describe("deadline reminders", () => {
  it("flags live slips inside the 6-hour window only", () => {
    expect(approachingDeadline(livePact(), now)).toBe(true);
    expect(approachingDeadline(livePact({ deadline: now + 7 * 60 * 60 * 1000 }), now)).toBe(false);
    expect(approachingDeadline(livePact({ deadline: now - 1000 }), now)).toBe(false);
    expect(approachingDeadline(livePact({ status: "open" }), now)).toBe(false);
    expect(approachingDeadline(livePact({ status: "review" }), now)).toBe(false);
  });

  it("writes one reminder notice per slip and will not spam", () => {
    const first = applyDeadlineReminders({ pacts: [livePact()], notifications: [] }, now);
    expect(first.created).toHaveLength(1);
    expect(first.created[0].userId).toBe("you");
    expect(first.created[0].type).toBe(NOTICE_TYPES.DEADLINE);
    expect(first.created[0].body).toMatch(/5 hours left, upload your proof/);
    const second = applyDeadlineReminders(first.state, now + 60_000);
    expect(second.created).toHaveLength(0);
    expect(second.state.notifications).toHaveLength(1);
  });

  it("surfaces copy for both desks on the banner", () => {
    const pact = livePact();
    expect(reminderCopy(pact, now)).toBe("5 hours left, upload your proof");
    expect(bannerCopy(pact, "you", now)).toBe("5 hours left, upload your proof");
    expect(bannerCopy(pact, "friend", now)).toMatch(/ISAAC still owes proof/);
    expect(hoursLeft(pact.deadline, now)).toBe(5);
    expect(approachingForUser([pact], "friend", now)).toHaveLength(1);
  });
});
