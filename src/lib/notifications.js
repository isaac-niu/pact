import { userById } from "../data/users.js";

export const NOTICE_TYPES = {
  ACCEPTED: "accepted",
  PROVED: "proved",
  REVIEW: "review",
  DEADLINE: "deadline",
};

export function noticeId(prefix = "ntf") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function handleOf(userId) {
  return userById(userId)?.handle || "Desk";
}

export function notice({ userId, type, pactId, title, body, at = Date.now(), readAt = null, id }) {
  return {
    id: id || noticeId(),
    userId,
    type,
    pactId,
    title,
    body,
    at,
    readAt,
  };
}

export function noticesForUser(notifications, userId) {
  return (notifications || [])
    .filter((n) => n.userId === userId)
    .slice()
    .sort((a, b) => b.at - a.at);
}

export function unreadCount(notifications, userId) {
  return noticesForUser(notifications, userId).filter((n) => !n.readAt).length;
}

export function sameNotice(a, b) {
  return a && b && a.userId === b.userId && a.type === b.type && a.pactId === b.pactId;
}

export function mergeNotices(existing, incoming) {
  const list = Array.isArray(existing) ? existing.slice() : [];
  const extra = [];
  for (const n of incoming || []) {
    if (!n?.userId || !n.type || !n.pactId) continue;
    if (list.some((row) => sameNotice(row, n)) || extra.some((row) => sameNotice(row, n))) continue;
    extra.push(n);
  }
  return extra.length ? [...extra, ...list] : list;
}

export function markNoticeRead(notifications, noticeId, userId, at = Date.now()) {
  return (notifications || []).map((n) =>
    n.id === noticeId && n.userId === userId ? { ...n, readAt: n.readAt || at } : n,
  );
}

export function markAllNoticesRead(notifications, userId, at = Date.now()) {
  return (notifications || []).map((n) =>
    n.userId === userId && !n.readAt ? { ...n, readAt: at } : n,
  );
}

export function acceptedNotice(pact, actorId, at = Date.now()) {
  if (!pact || pact.creatorId === actorId) return null;
  return notice({
    userId: pact.creatorId,
    type: NOTICE_TYPES.ACCEPTED,
    pactId: pact.id,
    title: "Friend matched the slip",
    body: `${handleOf(actorId)} accepted “${pact.title}” and locked the pot.`,
    at,
  });
}

export function provedNotice(pact, actorId, at = Date.now()) {
  if (!pact || pact.opponentId === actorId) return null;
  return notice({
    userId: pact.opponentId,
    type: NOTICE_TYPES.PROVED,
    pactId: pact.id,
    title: "Proof landed on the desk",
    body: `${handleOf(actorId)} uploaded proof on “${pact.title}”.`,
    at,
  });
}

export function reviewNotice(pact, at = Date.now()) {
  if (!pact?.opponentId) return null;
  return notice({
    userId: pact.opponentId,
    type: NOTICE_TYPES.REVIEW,
    pactId: pact.id,
    title: "Your turn to verify",
    body: `REVIEW on “${pact.title}” — grade the frame.`,
    at,
  });
}

/**
 * In-app is the required channel. Email / push stay reserved so Person D
 * can wire outbound later without changing the desk snapshot.
 */
export function outboundDelivery(_notice) {
  return { email: null, push: null };
}

export function noticesFromLifecycle(pacts, events) {
  const generated = [];
  for (const ev of events || []) {
    const pact = (pacts || []).find((p) => p.id === ev.pactId);
    if (!pact) continue;
    let row = null;
    if (ev.type === "accepted") row = acceptedNotice(pact, ev.actorId, ev.at);
    if (ev.type === "proved") row = provedNotice(pact, ev.actorId, ev.at);
    if (ev.type === "review") row = reviewNotice(pact, ev.at);
    if (row) generated.push({ ...row, id: `ntf-ev-${ev.id}`, readAt: ev.at });
  }
  return generated;
}
