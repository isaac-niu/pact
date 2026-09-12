import { describe, expect, it } from "vitest";
import { emptyDemoState } from "../data/seed.js";
import {
  COMMENT_MAX,
  applyComment,
  applyReaction,
  commentsForEvent,
  normalizeComment,
  normalizeEmoji,
  reactionCounts,
  userReactionOnEvent,
} from "./tapeTalk.js";

function uid(prefix) {
  return `${prefix}_test`;
}

describe("tape talk", () => {
  it("accepts only the desk emoji set", () => {
    expect(normalizeEmoji("🔥")).toBe("🔥");
    expect(normalizeEmoji("😬")).toBe("😬");
    expect(() => normalizeEmoji("👍")).toThrow(/heat or sweat/);
  });

  it("keeps takes short and non-empty", () => {
    expect(normalizeComment("  Clean  frame. ")).toBe("Clean frame.");
    expect(() => normalizeComment("   ")).toThrow(/short take/);
    expect(() => normalizeComment("x".repeat(COMMENT_MAX + 1))).toThrow(/140/);
  });

  it("toggles heat on a public mark and counts it", () => {
    const seeded = emptyDemoState();
    const first = applyReaction(seeded, {
      eventId: "ev-gym-won",
      emoji: "🔥",
      actorId: "you",
      uid,
    });
    expect(userReactionOnEvent(first.state.reactions, "ev-gym-won", "you").emoji).toBe("🔥");
    expect(reactionCounts(first.state.reactions, "ev-gym-won")["🔥"]).toBeGreaterThanOrEqual(1);

    const off = applyReaction(first.state, {
      eventId: "ev-gym-won",
      emoji: "🔥",
      actorId: "you",
      uid,
    });
    expect(userReactionOnEvent(off.state.reactions, "ev-gym-won", "you")).toBeNull();
  });

  it("switches sweat for heat on the same mark", () => {
    let state = emptyDemoState();
    state = applyReaction(state, { eventId: "ev-gym-won", emoji: "🔥", actorId: "friend", uid }).state;
    state = applyReaction(state, { eventId: "ev-gym-won", emoji: "😬", actorId: "friend", uid }).state;
    expect(userReactionOnEvent(state.reactions, "ev-gym-won", "friend").emoji).toBe("😬");
  });

  it("posts a short take on a mark you can see", () => {
    const out = applyComment(emptyDemoState(), {
      eventId: "ev-gym-pro",
      body: "Frame stands. Iron in shot.",
      actorId: "friend",
      uid,
    });
    expect(commentsForEvent(out.state.comments, "ev-gym-pro").some((row) => row.body.includes("Iron"))).toBe(
      true,
    );
  });

  it("keeps private marks off a stranger's chatter", () => {
    const seeded = emptyDemoState();
    const privatePact = {
      id: "test-private-run",
      title: "Private run",
      creatorId: "you",
      opponentId: "friend",
      status: "open",
      visibility: "private",
    };
    const state = {
      ...seeded,
      pacts: [privatePact, ...seeded.pacts],
      events: [
        { id: "ev-run-post", pactId: privatePact.id, type: "posted", actorId: "you", at: Date.now() },
        ...seeded.events,
      ],
    };
    expect(() =>
      applyReaction(state, { eventId: "ev-run-post", emoji: "🔥", actorId: "stranger", uid }),
    ).toThrow(/off your tape/);
    expect(() =>
      applyComment(state, { eventId: "ev-run-post", body: "nice", actorId: "stranger", uid }),
    ).toThrow(/off your tape/);
  });
});
