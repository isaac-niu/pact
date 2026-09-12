import { describe, expect, it } from "vitest";
import {
  NOTICE_TYPES,
  acceptedNotice,
  markAllNoticesRead,
  markNoticeRead,
  mergeNotices,
  noticesForUser,
  outboundDelivery,
  provedNotice,
  reviewNotice,
  unreadCount,
} from "./notifications.js";

const pact = {
  id: "pkt_1",
  title: "Gym selfie",
  creatorId: "you",
  opponentId: "friend",
};

describe("desk notices", () => {
  it("notifies the challenger when a friend accepts", () => {
    const n = acceptedNotice(pact, "friend", 100);
    expect(n.userId).toBe("you");
    expect(n.type).toBe(NOTICE_TYPES.ACCEPTED);
    expect(n.body).toMatch(/FRIEND accepted/);
    expect(acceptedNotice(pact, "you")).toBeNull();
  });

  it("notifies the friend when proof lands", () => {
    const n = provedNotice(pact, "you", 100);
    expect(n.userId).toBe("friend");
    expect(n.type).toBe(NOTICE_TYPES.PROVED);
    expect(n.body).toMatch(/ISAAC uploaded proof/);
  });

  it("notifies the listed friend when REVIEW needs a grade", () => {
    const n = reviewNotice(pact, 100);
    expect(n.userId).toBe("friend");
    expect(n.type).toBe(NOTICE_TYPES.REVIEW);
    expect(n.title).toMatch(/verify/i);
  });

  it("dedupes the same slip + type + desk", () => {
    const a = acceptedNotice(pact, "friend", 1);
    const merged = mergeNotices([a], [acceptedNotice(pact, "friend", 2)]);
    expect(merged).toHaveLength(1);
  });

  it("counts unread for one desk and marks them read", () => {
    const a = acceptedNotice(pact, "friend", 1);
    const b = reviewNotice({ ...pact, id: "pkt_2" }, 2);
    expect(unreadCount([a, b], "you")).toBe(1);
    expect(unreadCount([a, b], "friend")).toBe(1);
    const read = markNoticeRead([a, b], a.id, "you", 9);
    expect(unreadCount(read, "you")).toBe(0);
    expect(noticesForUser(markAllNoticesRead([a, b], "friend", 9), "friend")[0].readAt).toBe(9);
  });

  it("stubs email and push so in-app is the only live channel", () => {
    expect(outboundDelivery(acceptedNotice(pact, "friend"))).toEqual({ email: null, push: null });
  });
});
