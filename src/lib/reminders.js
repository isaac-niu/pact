import { NOTICE_TYPES, mergeNotices, notice } from "./notifications.js";
import { userById } from "../data/users.js";

export const REMINDER_WINDOW_MS = 6 * 60 * 60 * 1000;
export const LIVE_FOR_PROOF = new Set(["accepted", "evidence"]);

export function hoursLeft(deadline, now = Date.now()) {
  return Math.max(0, Math.ceil((Number(deadline) - now) / (60 * 60 * 1000)));
}

export function approachingDeadline(pact, now = Date.now()) {
  if (!pact?.deadline) return false;
  if (!LIVE_FOR_PROOF.has(pact.status)) return false;
  const left = pact.deadline - now;
  return left > 0 && left <= REMINDER_WINDOW_MS;
}

export function reminderCopy(pact, now = Date.now()) {
  const hours = hoursLeft(pact.deadline, now);
  const unit = hours === 1 ? "hour" : "hours";
  return `${hours} ${unit} left, upload your proof`;
}

export function deadlineNotice(pact, now = Date.now()) {
  if (!pact?.creatorId) return null;
  return notice({
    userId: pact.creatorId,
    type: NOTICE_TYPES.DEADLINE,
    pactId: pact.id,
    title: "Deadline on the board",
    body: `${reminderCopy(pact, now)} — “${pact.title}”.`,
    at: now,
  });
}

export function alreadyReminded(notifications, pactId) {
  return (notifications || []).some((n) => n.type === NOTICE_TYPES.DEADLINE && n.pactId === pactId);
}

export function applyDeadlineReminders(state, now = Date.now()) {
  const incoming = [];
  for (const pact of state.pacts || []) {
    if (!approachingDeadline(pact, now)) continue;
    if (alreadyReminded(state.notifications, pact.id)) continue;
    incoming.push(deadlineNotice(pact, now));
  }
  if (!incoming.length) return { state, created: [] };
  return {
    state: { ...state, notifications: mergeNotices(state.notifications, incoming) },
    created: incoming,
  };
}

export function approachingForUser(pacts, userId, now = Date.now()) {
  return (pacts || []).filter((p) => approachingDeadline(p, now) && (p.creatorId === userId || p.opponentId === userId));
}

export function bannerCopy(pact, userId, now = Date.now()) {
  const hours = hoursLeft(pact.deadline, now);
  const unit = hours === 1 ? "hour" : "hours";
  if (pact.creatorId === userId && LIVE_FOR_PROOF.has(pact.status)) {
    return `${hours} ${unit} left, upload your proof`;
  }
  const who = userById(pact.creatorId)?.handle || "Challenger";
  return `${hours} ${unit} left — ${who} still owes proof`;
}
