import { canSeePact } from "./visibility.js";

export const TAPE_EMOJIS = ["🔥", "😬"];
export const COMMENT_MAX = 140;

export function normalizeEmoji(value) {
  const emoji = String(value ?? "").trim();
  if (!TAPE_EMOJIS.includes(emoji)) throw new Error("Pick heat or sweat on this mark");
  return emoji;
}

export function normalizeComment(body) {
  const text = String(body ?? "").trim().replace(/\s+/g, " ");
  if (!text) throw new Error("Write a short take");
  if (text.length > COMMENT_MAX) throw new Error(`Keep the take under ${COMMENT_MAX} characters`);
  return text;
}

export function canTalkOnPact(pact, userId) {
  return canSeePact(pact, userId);
}

export function reactionsForEvent(reactions, eventId) {
  return (reactions || []).filter((row) => row.eventId === eventId);
}

export function commentsForEvent(comments, eventId) {
  return (comments || []).filter((row) => row.eventId === eventId).sort((a, b) => a.at - b.at);
}

export function reactionCounts(reactions, eventId) {
  const counts = Object.fromEntries(TAPE_EMOJIS.map((emoji) => [emoji, 0]));
  for (const row of reactionsForEvent(reactions, eventId)) {
    if (counts[row.emoji] != null) counts[row.emoji] += 1;
  }
  return counts;
}

export function userReactionOnEvent(reactions, eventId, userId) {
  return reactionsForEvent(reactions, eventId).find((row) => row.userId === userId) || null;
}

export function applyReaction(state, { eventId, emoji, actorId, now = Date.now(), uid }) {
  const event = (state.events || []).find((row) => row.id === eventId);
  if (!event) throw new Error("Mark is not on the tape");
  const pact = (state.pacts || []).find((row) => row.id === event.pactId);
  if (!canTalkOnPact(pact, actorId)) throw new Error("This mark is off your tape");
  const nextEmoji = normalizeEmoji(emoji);
  const reactions = Array.isArray(state.reactions) ? state.reactions : [];
  const existing = userReactionOnEvent(reactions, eventId, actorId);
  let next = reactions;
  if (existing && existing.emoji === nextEmoji) {
    next = reactions.filter((row) => row.id !== existing.id);
  } else if (existing) {
    next = reactions.map((row) =>
      row.id === existing.id ? { ...row, emoji: nextEmoji, at: now } : row,
    );
  } else {
    next = [
      {
        id: uid("rx"),
        eventId,
        pactId: event.pactId,
        userId: actorId,
        emoji: nextEmoji,
        at: now,
      },
      ...reactions,
    ];
  }
  const result = next.find((row) => row.eventId === eventId && row.userId === actorId) || null;
  return { state: { ...state, reactions: next }, result };
}

export function applyComment(state, { eventId, body, actorId, now = Date.now(), uid }) {
  const event = (state.events || []).find((row) => row.id === eventId);
  if (!event) throw new Error("Mark is not on the tape");
  const pact = (state.pacts || []).find((row) => row.id === event.pactId);
  if (!canTalkOnPact(pact, actorId)) throw new Error("This mark is off your tape");
  const text = normalizeComment(body);
  const comments = Array.isArray(state.comments) ? state.comments : [];
  const result = {
    id: uid("cm"),
    eventId,
    pactId: event.pactId,
    userId: actorId,
    body: text,
    at: now,
  };
  return { state: { ...state, comments: [result, ...comments] }, result };
}
